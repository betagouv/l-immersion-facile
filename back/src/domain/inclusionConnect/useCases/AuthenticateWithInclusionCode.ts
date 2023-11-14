import {
  AbsoluteUrl,
  AuthenticatedUser,
  AuthenticatedUserQueryParams,
  AuthenticateWithInclusionCodeConnectParams,
  authenticateWithInclusionCodeSchema,
  currentJwtVersions,
  decodeJwtWithoutSignatureCheck,
  frontRoutes,
  queryParamsAsString,
} from "shared";
import { ForbiddenError } from "../../../adapters/primary/helpers/httpErrors";
import { GenerateInclusionConnectJwt } from "../../auth/jwt";
import { CreateNewEvent } from "../../core/eventBus/EventBus";
import { UnitOfWork, UnitOfWorkPerformer } from "../../core/ports/UnitOfWork";
import { UuidGenerator } from "../../core/ports/UuidGenerator";
import { TransactionalUseCase } from "../../core/UseCase";
import { OngoingOAuth } from "../../generic/OAuth/entities/OngoingOAuth";
import { InclusionConnectIdTokenPayload } from "../entities/InclusionConnectIdTokenPayload";
import { makeInclusionConnectRedirectUri } from "../entities/inclusionConnectRedirectUrl";
import { InclusionConnectGateway } from "../port/InclusionConnectGateway";
import { InclusionConnectConfig } from "./InitiateInclusionConnect";

type ConnectedRedirectUrl = AbsoluteUrl;

export class AuthenticateWithInclusionCode extends TransactionalUseCase<
  AuthenticateWithInclusionCodeConnectParams,
  ConnectedRedirectUrl
> {
  protected inputSchema = authenticateWithInclusionCodeSchema;

  readonly #createNewEvent: CreateNewEvent;

  readonly #inclusionConnectGateway: InclusionConnectGateway;

  readonly #uuidGenerator: UuidGenerator;

  readonly #generateAuthenticatedUserJwt: GenerateInclusionConnectJwt;

  readonly #immersionFacileBaseUrl: AbsoluteUrl;

  readonly #inclusionConnectConfig: InclusionConnectConfig;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    createNewEvent: CreateNewEvent,
    inclusionConnectGateway: InclusionConnectGateway,
    uuidGenerator: UuidGenerator,
    generateAuthenticatedUserJwt: GenerateInclusionConnectJwt,
    immersionFacileBaseUrl: AbsoluteUrl,
    inclusionConnectConfig: InclusionConnectConfig,
  ) {
    super(uowPerformer);

    this.#createNewEvent = createNewEvent;
    this.#inclusionConnectGateway = inclusionConnectGateway;
    this.#uuidGenerator = uuidGenerator;
    this.#generateAuthenticatedUserJwt = generateAuthenticatedUserJwt;
    this.#immersionFacileBaseUrl = immersionFacileBaseUrl;
    this.#inclusionConnectConfig = inclusionConnectConfig;
  }

  protected async _execute(
    params: AuthenticateWithInclusionCodeConnectParams,
    uow: UnitOfWork,
  ): Promise<ConnectedRedirectUrl> {
    const existingOngoingOAuth = await uow.ongoingOAuthRepository.findByState(
      params.state,
      "inclusionConnect",
    );
    if (existingOngoingOAuth)
      return this.#onOngoingOAuth(params, uow, existingOngoingOAuth);
    throw new ForbiddenError(
      `No ongoing OAuth with provided state : ${params.state}`,
    );
  }

  async #onOngoingOAuth(
    params: AuthenticateWithInclusionCodeConnectParams,
    uow: UnitOfWork,
    existingOngoingOAuth: OngoingOAuth,
  ): Promise<ConnectedRedirectUrl> {
    const response = await this.#inclusionConnectGateway.getAccessToken({
      code: params.code,
      redirectUri: makeInclusionConnectRedirectUri(
        this.#inclusionConnectConfig,
        { page: params.page },
      ),
    });
    const jwtPayload =
      decodeJwtWithoutSignatureCheck<InclusionConnectIdTokenPayload>(
        response.id_token,
      );

    if (jwtPayload.nonce !== existingOngoingOAuth.nonce)
      throw new ForbiddenError("Nonce mismatch");

    const existingAuthenticatedUser =
      await uow.authenticatedUserRepository.findByEmail(jwtPayload.email);

    const newOrUpdatedAuthenticatedUser: AuthenticatedUser = {
      ...existingAuthenticatedUser,
      ...this.#makeAuthenticatedUser(this.#uuidGenerator.new(), jwtPayload),
      ...(existingAuthenticatedUser && {
        email: existingAuthenticatedUser.email,
        id: existingAuthenticatedUser.id,
      }),
    };

    const ongoingOAuth: OngoingOAuth = {
      ...existingOngoingOAuth,
      userId: newOrUpdatedAuthenticatedUser.id,
      externalId: jwtPayload.sub,
      accessToken: response.access_token,
    };

    await Promise.all([
      uow.ongoingOAuthRepository.save(ongoingOAuth),
      uow.authenticatedUserRepository.save(newOrUpdatedAuthenticatedUser),
      uow.outboxRepository.save(
        this.#createNewEvent({
          topic: "UserAuthenticatedSuccessfully",
          payload: {
            userId: newOrUpdatedAuthenticatedUser.id,
            provider: ongoingOAuth.provider,
          },
        }),
      ),
    ]);

    const token = this.#generateAuthenticatedUserJwt(
      {
        userId: newOrUpdatedAuthenticatedUser.id,
        version: currentJwtVersions.inclusion,
      },
      response.expires_in * 60,
    );

    return `${this.#immersionFacileBaseUrl}/${
      frontRoutes[params.page]
    }?${queryParamsAsString<AuthenticatedUserQueryParams>({
      token,
      firstName: newOrUpdatedAuthenticatedUser.firstName,
      lastName: newOrUpdatedAuthenticatedUser.lastName,
      email: newOrUpdatedAuthenticatedUser.email,
    })}`;
  }

  #makeAuthenticatedUser(
    userId: string,
    jwtPayload: InclusionConnectIdTokenPayload,
  ): AuthenticatedUser {
    return {
      id: userId,
      firstName: jwtPayload.given_name,
      lastName: jwtPayload.family_name,
      email: jwtPayload.email,
    };
  }
}
