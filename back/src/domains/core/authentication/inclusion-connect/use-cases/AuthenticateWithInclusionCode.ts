import {
  AbsoluteUrl,
  AgencyRight,
  AuthenticateWithOAuthCodeParams,
  AuthenticatedUserQueryParams,
  IdentityProvider,
  OAuthCode,
  OAuthProvider,
  User,
  WithSourcePage,
  authenticateWithOAuthCodeSchema,
  currentJwtVersions,
  errors,
  frontRoutes,
  queryParamsAsString,
} from "shared";
import { notifyDiscord } from "../../../../../utils/notifyDiscord";
import { TransactionalUseCase } from "../../../UseCase";
import { CreateNewEvent } from "../../../events/ports/EventBus";
import { GenerateInclusionConnectJwt } from "../../../jwt";
import { TimeGateway } from "../../../time-gateway/ports/TimeGateway";
import { UnitOfWork } from "../../../unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../../unit-of-work/ports/UnitOfWorkPerformer";
import { UuidGenerator } from "../../../uuid-generator/ports/UuidGenerator";
import { OngoingOAuth } from "../entities/OngoingOAuth";
import {
  GetAccessTokenPayload,
  OAuthGateway,
  oAuthModeByFeatureFlags,
} from "../port/OAuthGateway";

type ConnectedRedirectUrl = AbsoluteUrl;

export class AuthenticateWithInclusionCode extends TransactionalUseCase<
  AuthenticateWithOAuthCodeParams,
  ConnectedRedirectUrl
> {
  protected inputSchema = authenticateWithOAuthCodeSchema;

  readonly #createNewEvent: CreateNewEvent;

  readonly #inclusionConnectGateway: OAuthGateway;

  readonly #uuidGenerator: UuidGenerator;

  readonly #generateAuthenticatedUserJwt: GenerateInclusionConnectJwt;

  readonly #immersionFacileBaseUrl: AbsoluteUrl;

  readonly #timeGateway: TimeGateway;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    createNewEvent: CreateNewEvent,
    inclusionConnectGateway: OAuthGateway,
    uuidGenerator: UuidGenerator,
    generateAuthenticatedUserJwt: GenerateInclusionConnectJwt,
    immersionFacileBaseUrl: AbsoluteUrl,
    timeGateway: TimeGateway,
  ) {
    super(uowPerformer);
    this.#createNewEvent = createNewEvent;
    this.#inclusionConnectGateway = inclusionConnectGateway;
    this.#uuidGenerator = uuidGenerator;
    this.#generateAuthenticatedUserJwt = generateAuthenticatedUserJwt;
    this.#immersionFacileBaseUrl = immersionFacileBaseUrl;
    this.#timeGateway = timeGateway;
  }

  protected async _execute(
    { code, page, state }: AuthenticateWithOAuthCodeParams,
    uow: UnitOfWork,
  ): Promise<ConnectedRedirectUrl> {
    const mode = oAuthModeByFeatureFlags(
      await uow.featureFlagRepository.getAll(),
    );
    const identityProvider: IdentityProvider =
      mode === "InclusionConnect" ? "inclusionConnect" : "proConnect";
    const existingOngoingOAuth =
      await uow.ongoingOAuthRepository.findByStateAndProvider(
        state,
        identityProvider,
      );
    if (existingOngoingOAuth)
      return this.#onOngoingOAuth(
        uow,
        mode,
        { code, page },
        existingOngoingOAuth,
      );
    throw errors.inclusionConnect.missingOAuth({ state, identityProvider });
  }

  async #onOngoingOAuth(
    uow: UnitOfWork,
    provider: OAuthProvider,
    { code, page }: WithSourcePage & { code: OAuthCode },
    existingOngoingOAuth: OngoingOAuth,
  ): Promise<ConnectedRedirectUrl> {
    const { accessToken, expire, payload, idToken } =
      await this.#inclusionConnectGateway.getAccessToken(
        {
          code,
          page,
        },
        provider,
      );

    if (payload.nonce !== existingOngoingOAuth.nonce)
      throw errors.inclusionConnect.nonceMismatch();

    const existingInclusionConnectedUser =
      await uow.userRepository.findByExternalId(payload.sub, provider);

    const userWithSameEmail = await uow.userRepository.findByEmail(
      payload.email,
      provider,
    );

    const existingUser = await this.#makeExistingUser(
      uow,
      provider,
      existingInclusionConnectedUser,
      userWithSameEmail,
    );

    const toto = this.#makeAuthenticatedUser(
      this.#uuidGenerator.new(),
      this.#timeGateway.now(),
      payload,
    );
    const newOrUpdatedAuthenticatedUser: User = {
      ...toto,
      ...(existingUser && {
        id: existingUser.id,
        createdAt: existingUser.createdAt,
      }),
    };

    const ongoingOAuth: OngoingOAuth = {
      ...existingOngoingOAuth,
      userId: newOrUpdatedAuthenticatedUser.id,
      externalId: payload.sub,
      accessToken,
    };

    if (!newOrUpdatedAuthenticatedUser.externalId) {
      notifyDiscord(
        `Usecase AuthenticateWithInclusionCode. No ongoing_oauths found for externalId:
          ${newOrUpdatedAuthenticatedUser.id}`,
      );
    }

    await uow.userRepository.save(newOrUpdatedAuthenticatedUser, provider);
    await uow.ongoingOAuthRepository.save(ongoingOAuth);

    await uow.outboxRepository.save(
      this.#createNewEvent({
        topic: "UserAuthenticatedSuccessfully",
        payload: {
          userId: newOrUpdatedAuthenticatedUser.id,
          provider: ongoingOAuth.provider,
          codeSafir: payload.structure_pe ?? null,
          triggeredBy: {
            kind: "inclusion-connected",
            userId: newOrUpdatedAuthenticatedUser.id,
          },
        },
      }),
    );

    const token = this.#generateAuthenticatedUserJwt(
      {
        userId: newOrUpdatedAuthenticatedUser.id,
        version: currentJwtVersions.inclusion,
      },
      expire * 60,
    );

    return `${this.#immersionFacileBaseUrl}/${
      frontRoutes[page]
    }?${queryParamsAsString<AuthenticatedUserQueryParams>({
      token,
      firstName: newOrUpdatedAuthenticatedUser.firstName,
      lastName: newOrUpdatedAuthenticatedUser.lastName,
      email: newOrUpdatedAuthenticatedUser.email,
      idToken,
    })}`;
  }

  async #makeExistingUser(
    uow: UnitOfWork,
    provider: OAuthProvider,
    existingInclusionConnectedUser: User | undefined,
    userWithSameEmail: User | undefined,
  ): Promise<User | undefined> {
    const existingUser = existingInclusionConnectedUser ?? userWithSameEmail;
    if (!existingUser) return undefined;
    const conflictingUserFound =
      userWithSameEmail &&
      existingInclusionConnectedUser &&
      userWithSameEmail.id !== existingInclusionConnectedUser.id;
    if (conflictingUserFound) {
      const conflictingUser = userWithSameEmail;
      await this.#updateUserAgencyRights(
        uow,
        provider,
        conflictingUser,
        existingInclusionConnectedUser,
      );
      await uow.userRepository.delete(conflictingUser.id);
      const user: User = {
        createdAt: existingInclusionConnectedUser.createdAt,
        externalId: existingInclusionConnectedUser.externalId,
        id: existingInclusionConnectedUser.id,
        email: conflictingUser.email,
        firstName: conflictingUser.firstName,
        lastName: conflictingUser.lastName,
      };
      return user;
    }
    return existingUser;
  }

  #makeAuthenticatedUser(
    userId: string,
    createdAt: Date,
    jwtPayload: GetAccessTokenPayload,
  ): User {
    return {
      id: userId,
      firstName: jwtPayload.firstName,
      lastName: jwtPayload.lastName,
      email: jwtPayload.email,
      externalId: jwtPayload.sub,
      createdAt: createdAt.toISOString(),
    };
  }

  async #updateUserAgencyRights(
    uow: UnitOfWork,
    provider: OAuthProvider,
    conflictingUser: User,
    userToKeep: User,
  ): Promise<void> {
    const conflictingIcUser = await uow.userRepository.getById(
      conflictingUser.id,
      provider,
    );
    const userToKeepIcUser = await uow.userRepository.getById(
      userToKeep.id,
      provider,
    );
    if (!conflictingIcUser || !userToKeepIcUser) return;

    const conflictingUserAgencyRights = conflictingIcUser.agencyRights;
    const userToKeepAgencyRights = userToKeepIcUser.agencyRights;

    await uow.userRepository.updateAgencyRights({
      agencyRights: this.#mergeAgencyRights(
        conflictingUserAgencyRights,
        userToKeepAgencyRights,
      ),
      userId: userToKeepIcUser.id,
    });
  }

  #mergeAgencyRights(
    oldAgencyRights: AgencyRight[],
    newAgencyRights: AgencyRight[],
  ): AgencyRight[] {
    return oldAgencyRights.reduce<AgencyRight[]>((acc, oldAgencyRight) => {
      const newAgencyRight = newAgencyRights.find(
        (newAgencyRight) =>
          newAgencyRight.agency.id === oldAgencyRight.agency.id,
      );
      if (newAgencyRight) {
        return [
          ...acc,
          {
            ...newAgencyRight,
            isNotifiedByEmail:
              newAgencyRight.isNotifiedByEmail ||
              oldAgencyRight.isNotifiedByEmail,
            roles: [...newAgencyRight.roles, ...oldAgencyRight.roles],
          },
        ];
      }
      return [...acc, oldAgencyRight];
    }, []);
  }
}
