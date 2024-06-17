import {
  AgencyDtoBuilder,
  ConventionDtoBuilder,
  ConventionReadDto,
  InclusionConnectedUser,
  WithAgencyIds,
  expectArraysToEqualIgnoringOrder,
  expectToEqual,
} from "shared";
import { conventionSlice } from "src/core-logic/domain/convention/convention.slice";
import { inclusionConnectedSelectors } from "src/core-logic/domain/inclusionConnected/inclusionConnected.selectors";
import {
  InclusionConnectedFeedback,
  inclusionConnectedSlice,
} from "src/core-logic/domain/inclusionConnected/inclusionConnected.slice";
import {
  TestDependencies,
  createTestStore,
} from "src/core-logic/storeConfig/createTestStore";
import { ReduxStore } from "src/core-logic/storeConfig/store";
import { FederatedIdentityWithUser, authSlice } from "../auth/auth.slice";

const agency1 = new AgencyDtoBuilder().withId("agency-1").build();

describe("InclusionConnected", () => {
  let store: ReduxStore;
  let dependencies: TestDependencies;

  const inclusionConnectedUser: InclusionConnectedUser = {
    email: "fake-user@inclusion-connect.fr",
    firstName: "Fake",
    lastName: "User",
    id: "fake-user-id",
    dashboards: {
      agencies: { agencyDashboardUrl: "https://placeholder.com/" },
      establishments: {},
    },
    agencyRights: [
      {
        roles: ["agencyOwner"],
        agency: new AgencyDtoBuilder().build(),
        isNotifiedByEmail: true,
      },
    ],
    externalId: "fake-user-external-id",
    createdAt: new Date().toISOString(),
  };

  const inclusionConnectedFederatedIdentity: FederatedIdentityWithUser = {
    email: inclusionConnectedUser.email,
    firstName: inclusionConnectedUser.firstName,
    lastName: inclusionConnectedUser.lastName,
    provider: "inclusionConnect",
    token: "fake-token",
  };

  const peConnectFederatedIdentity: FederatedIdentityWithUser = {
    email: "",
    firstName: "",
    lastName: "",
    provider: "peConnect",
    token: "fake-token",
  };

  beforeEach(() => {
    ({ store, dependencies } = createTestStore());
  });

  describe("authSlice.actions.federatedIdentityFoundInDevice", () => {
    it("fetches the current IC user when inclusion connect federated identity is found in device", () => {
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);
      expectFeedbackToEqual({ kind: "idle" });

      store.dispatch(
        authSlice.actions.federatedIdentityFoundInDevice(
          inclusionConnectedFederatedIdentity,
        ),
      );

      expectIsLoadingToBe(true);

      dependencies.inclusionConnectedGateway.currentUser$.next(
        inclusionConnectedUser,
      );

      expectIsLoadingToBe(false);
      expectCurrentUserToBe(inclusionConnectedUser);
      expectFeedbackToEqual({ kind: "success" });
    });

    it("do nothing when other federated identity is found in device", () => {
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);
      expectFeedbackToEqual({ kind: "idle" });

      store.dispatch(
        authSlice.actions.federatedIdentityFoundInDevice(
          peConnectFederatedIdentity,
        ),
      );

      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);
      expectFeedbackToEqual({ kind: "idle" });
    });
  });

  describe("authSlice.actions.federatedIdentityFromStoreToDeviceStorageSucceeded", () => {
    it("fetches the current IC user when inclusion connect federated identity is successfully stored in device", () => {
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);
      expectFeedbackToEqual({ kind: "idle" });

      store.dispatch(
        authSlice.actions.federatedIdentityFromStoreToDeviceStorageSucceeded(
          inclusionConnectedFederatedIdentity,
        ),
      );

      expectIsLoadingToBe(true);

      dependencies.inclusionConnectedGateway.currentUser$.next(
        inclusionConnectedUser,
      );

      expectIsLoadingToBe(false);
      expectCurrentUserToBe(inclusionConnectedUser);
      expectFeedbackToEqual({ kind: "success" });
    });

    it("do nothing when other federated identity is successfully stored in device", () => {
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);
      expectFeedbackToEqual({ kind: "idle" });

      store.dispatch(
        authSlice.actions.federatedIdentityFromStoreToDeviceStorageSucceeded(
          peConnectFederatedIdentity,
        ),
      );

      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);
      expectFeedbackToEqual({ kind: "idle" });
    });
  });

  describe("inclusionConnectedSlice.actions.currentUserFetchRequested", () => {
    it("fetches the current IC user", () => {
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);
      expectFeedbackToEqual({ kind: "idle" });

      store.dispatch(
        inclusionConnectedSlice.actions.currentUserFetchRequested(),
      );

      expectIsLoadingToBe(true);

      dependencies.inclusionConnectedGateway.currentUser$.next(
        inclusionConnectedUser,
      );

      expectIsLoadingToBe(false);
      expectCurrentUserToBe(inclusionConnectedUser);
      expectFeedbackToEqual({ kind: "success" });
    });

    it("disconnects the users if the response includes : 'jwt expired'", () => {
      ({ store, dependencies } = createTestStore({
        auth: {
          federatedIdentityWithUser: {
            token: "some-existing-token",
            provider: "inclusionConnect",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@mail.com",
          },
        },
      }));
      store.dispatch(
        inclusionConnectedSlice.actions.currentUserFetchRequested(),
      );
      expectIsLoadingToBe(true);

      const errorMessage = "Something went wrong : jwt expired";
      dependencies.inclusionConnectedGateway.currentUser$.error(
        new Error(errorMessage),
      );
      expectCurrentUserToBe(null);
      expectFeedbackToEqual({ kind: "idle" });
    });

    it("stores error on failure when trying to fetch current IC user", () => {
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);
      store.dispatch(
        inclusionConnectedSlice.actions.currentUserFetchRequested(),
      );
      expectIsLoadingToBe(true);

      const errorMessage = "Something went wrong";
      dependencies.inclusionConnectedGateway.currentUser$.error(
        new Error(errorMessage),
      );
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);
      expectFeedbackToEqual({ kind: "errored", errorMessage });
    });
  });

  describe("inclusionConnectedSlice.actions.registerAgenciesRequested", () => {
    it("request agencies registration on the current user", () => {
      const agency1 = new AgencyDtoBuilder().withId("agency-1").build();
      const payload: WithAgencyIds = {
        agencies: [agency1.id],
      };

      store.dispatch(
        inclusionConnectedSlice.actions.registerAgenciesRequested(payload),
      );
      expectIsLoadingToBe(true);
      dependencies.inclusionConnectedGateway.registerAgenciesToCurrentUserResponse$.next(
        undefined,
      );
      expectIsLoadingToBe(false);
      expectFeedbackToEqual({ kind: "agencyRegistrationSuccess" });
    });

    it("request agencies registration on the current user to throw on error", () => {
      const payload: WithAgencyIds = {
        agencies: [agency1.id],
      };
      const errorMessage = "Error registering user to agencies to review";
      store.dispatch(
        inclusionConnectedSlice.actions.registerAgenciesRequested(payload),
      );
      expectIsLoadingToBe(true);
      dependencies.inclusionConnectedGateway.registerAgenciesToCurrentUserResponse$.error(
        new Error(errorMessage),
      );
      expectFeedbackToEqual({ kind: "errored", errorMessage });
      expectIsLoadingToBe(false);
    });
  });

  describe("when a convention is in store", () => {
    const convention: ConventionReadDto = {
      ...new ConventionDtoBuilder().build(),
      agencyName: "Agence de test",
      agencyDepartment: "75",
      agencyKind: "mission-locale",
      agencySiret: "11112222000033",
      agencyCounsellorEmails: [],
      agencyValidatorEmails: [],
    };

    const adminUser: InclusionConnectedUser = {
      ...inclusionConnectedUser,
      agencyRights: [
        {
          roles: ["agencyOwner", "validator"],
          agency: new AgencyDtoBuilder().build(),
          isNotifiedByEmail: true,
        },
      ],
      isBackofficeAdmin: true,
    };

    beforeEach(() => {
      store.dispatch(
        conventionSlice.actions.fetchConventionSucceeded(convention),
      );
      store.dispatch(
        inclusionConnectedSlice.actions.currentUserFetchSucceeded(adminUser),
      );
    });

    it("user can have multiple roles", () => {
      expectArraysToEqualIgnoringOrder(
        inclusionConnectedSelectors.userRolesForFetchedConvention(
          store.getState(),
        ),
        ["backOffice", "agencyOwner", "validator"],
      );
    });
  });

  const expectIsLoadingToBe = (expected: boolean) => {
    expect(inclusionConnectedSelectors.isLoading(store.getState())).toBe(
      expected,
    );
  };

  const expectFeedbackToEqual = (expected: InclusionConnectedFeedback) => {
    expectToEqual(
      inclusionConnectedSelectors.feedback(store.getState()),
      expected,
    );
  };

  const expectCurrentUserToBe = (expected: InclusionConnectedUser | null) => {
    expect(inclusionConnectedSelectors.currentUser(store.getState())).toBe(
      expected,
    );
  };
});
