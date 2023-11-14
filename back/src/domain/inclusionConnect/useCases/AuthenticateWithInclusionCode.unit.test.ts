import {
  AbsoluteUrl,
  allowedStartInclusionConnectLoginPages,
  AuthenticatedUser,
  expectObjectsToMatch,
  expectPromiseToFailWithError,
  expectToEqual,
  frontRoutes,
} from "shared";
import {
  createInMemoryUow,
  InMemoryUnitOfWork,
} from "../../../adapters/primary/config/uowConfig";
import { ForbiddenError } from "../../../adapters/primary/helpers/httpErrors";
import { CustomTimeGateway } from "../../../adapters/secondary/core/TimeGateway/CustomTimeGateway";
import { TestUuidGenerator } from "../../../adapters/secondary/core/UuidGeneratorImplementations";
import {
  defaultInclusionAccessTokenResponse,
  fakeInclusionPayload,
  InMemoryInclusionConnectGateway,
} from "../../../adapters/secondary/InclusionConnectGateway/InMemoryInclusionConnectGateway";
import { InMemoryUowPerformer } from "../../../adapters/secondary/InMemoryUowPerformer";
import { makeCreateNewEvent } from "../../core/eventBus/EventBus";
import { OngoingOAuth } from "../../generic/OAuth/entities/OngoingOAuth";
import { AuthenticateWithInclusionCode } from "./AuthenticateWithInclusionCode";

const immersionBaseUrl: AbsoluteUrl = "http://my-immersion-domain.com";
const correctToken = "my-correct-token";
const clientId = "my-client-id";
const clientSecret = "my-client-secret";
const scope = "openid profile email";

const inclusionConnectBaseUri: AbsoluteUrl =
  "http://fake-inclusion-connect-uri.com";

describe("AuthenticateWithInclusionCode use case", () => {
  let uow: InMemoryUnitOfWork;
  let inclusionConnectGateway: InMemoryInclusionConnectGateway;
  let uuidGenerator: TestUuidGenerator;
  let useCase: AuthenticateWithInclusionCode;

  beforeEach(() => {
    uow = createInMemoryUow();
    uuidGenerator = new TestUuidGenerator();
    inclusionConnectGateway = new InMemoryInclusionConnectGateway();
    const immersionBaseUri: AbsoluteUrl = "http://immersion-uri.com";
    const immersionRedirectUri: AbsoluteUrl = `${immersionBaseUri}/my-redirection`;
    useCase = new AuthenticateWithInclusionCode(
      new InMemoryUowPerformer(uow),
      makeCreateNewEvent({
        timeGateway: new CustomTimeGateway(),
        uuidGenerator,
      }),
      inclusionConnectGateway,
      uuidGenerator,
      () => correctToken,
      immersionBaseUrl,
      {
        immersionRedirectUri,
        inclusionConnectBaseUri,
        scope,
        clientId,
        clientSecret,
      },
    );
  });

  it("rejects the connection if no state match the provided one in DB", async () => {
    await expectPromiseToFailWithError(
      useCase.execute({
        code: "my-inclusion-code",
        state: "my-state",
        page: "agencyDashboard",
      }),
      new ForbiddenError("No ongoing OAuth with provided state : my-state"),
    );
  });

  it("should raise a Forbidden error if the nonce does not match", async () => {
    const existingNonce = "existing-nonce";
    const initialOngoingOAuth: OngoingOAuth = {
      provider: "inclusionConnect",
      state: "my-state",
      nonce: existingNonce,
    };
    uow.ongoingOAuthRepository.ongoingOAuths = [initialOngoingOAuth];

    const accessToken = "inclusion-access-token";
    inclusionConnectGateway.setAccessTokenResponse({
      ...defaultInclusionAccessTokenResponse,
      access_token: accessToken,
    });

    await expectPromiseToFailWithError(
      useCase.execute({
        code: "my-inclusion-code",
        state: "my-state",
        page: "agencyDashboard",
      }),
      new ForbiddenError("Nonce mismatch"),
    );
  });

  describe("when auth process goes successfully", () => {
    describe("when user had never connected before", () => {
      it("saves the user as Authenticated user", async () => {
        const { initialOngoingOAuth, userId } =
          makeSuccessfulAuthenticationConditions();

        await useCase.execute({
          code: "my-inclusion-code",
          state: initialOngoingOAuth.state,
          page: "agencyDashboard",
        });

        expect(uow.authenticatedUserRepository.users).toHaveLength(1);
        expectToEqual(uow.authenticatedUserRepository.users[0], {
          id: userId,
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@inclusion.com",
        });
      });

      it("updates ongoingOAuth with userId, accessToken and externalId", async () => {
        const { accessToken, initialOngoingOAuth, userId } =
          makeSuccessfulAuthenticationConditions();

        await useCase.execute({
          code: "my-inclusion-code",
          state: initialOngoingOAuth.state,
          page: "agencyDashboard",
        });

        expect(uow.ongoingOAuthRepository.ongoingOAuths).toHaveLength(1);
        expectToEqual(uow.ongoingOAuthRepository.ongoingOAuths[0], {
          ...initialOngoingOAuth,
          accessToken,
          userId,
          externalId: fakeInclusionPayload.sub,
        });
      });

      it("saves UserConnectedSuccessfully event with relevant data", async () => {
        const { initialOngoingOAuth, userId } =
          makeSuccessfulAuthenticationConditions();

        await useCase.execute({
          code: "my-inclusion-code",
          state: initialOngoingOAuth.state,
          page: "agencyDashboard",
        });

        expect(uow.outboxRepository.events).toHaveLength(1);
        expectObjectsToMatch(uow.outboxRepository.events[0], {
          topic: "UserAuthenticatedSuccessfully",
          payload: {
            provider: "inclusionConnect",
            userId,
          },
        });
      });
    });

    describe("when user has already exists as an Authenticated User", () => {
      it("updates the user as Authenticated user", async () => {
        const { initialOngoingOAuth } =
          makeSuccessfulAuthenticationConditions();
        const { alreadyExistingUser } =
          addAlreadyExistingAuthenticatedUserInRepo();

        await useCase.execute({
          code: "my-inclusion-code",
          state: initialOngoingOAuth.state,
          page: "agencyDashboard",
        });

        expect(uow.authenticatedUserRepository.users).toHaveLength(1);
        expectToEqual(uow.authenticatedUserRepository.users[0], {
          id: alreadyExistingUser.id,
          email: alreadyExistingUser.email,
          firstName: "John",
          lastName: "Doe",
        });
      });
    });

    it.each(allowedStartInclusionConnectLoginPages)(
      "generates an app token and returns a redirection url which includes token and user data for %s",
      async (page) => {
        const { initialOngoingOAuth } =
          makeSuccessfulAuthenticationConditions();

        const redirectedUrl = await useCase.execute({
          code: "my-inclusion-code",
          state: initialOngoingOAuth.state,
          page,
        });

        expect(redirectedUrl).toBe(
          `${immersionBaseUrl}/${frontRoutes[page]}?token=${correctToken}&firstName=John&lastName=Doe&email=john.doe@inclusion.com`,
        );
      },
    );
  });

  const makeSuccessfulAuthenticationConditions = () => {
    const initialOngoingOAuth: OngoingOAuth = {
      provider: "inclusionConnect",
      state: "my-state",
      nonce: "nounce", // matches the one in the payload of the token
    };
    uow.ongoingOAuthRepository.ongoingOAuths = [initialOngoingOAuth];

    const userId = "new-user-id";
    uuidGenerator.setNextUuid(userId);

    const accessToken = "inclusion-access-token";
    inclusionConnectGateway.setAccessTokenResponse({
      ...defaultInclusionAccessTokenResponse,
      access_token: accessToken,
    });

    return {
      accessToken,
      initialOngoingOAuth,
      userId,
    };
  };

  const addAlreadyExistingAuthenticatedUserInRepo = () => {
    const alreadyExistingUser: AuthenticatedUser = {
      id: "already-existing-id",
      email: "john.doe@inclusion.com",
      firstName: "Johnny",
      lastName: "Doe Existing",
    };
    uow.authenticatedUserRepository.users = [alreadyExistingUser];
    return { alreadyExistingUser };
  };
});
