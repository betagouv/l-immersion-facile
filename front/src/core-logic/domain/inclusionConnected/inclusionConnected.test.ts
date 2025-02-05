import {
  AgencyDtoBuilder,
  AgencyRight,
  ConventionDtoBuilder,
  ConventionReadDto,
  InclusionConnectedUser,
  InclusionConnectedUserBuilder,
  WithAgencyIds,
  expectArraysToEqualIgnoringOrder,
  expectToEqual,
  inclusionConnectTokenExpiredMessage,
  toAgencyDtoForAgencyUsersAndAdmins,
} from "shared";
import { removeUserFromAgencySelectors } from "src/core-logic/domain/agencies/remove-user-from-agency/removeUserFromAgency.selectors";
import { removeUserFromAgencySlice } from "src/core-logic/domain/agencies/remove-user-from-agency/removeUserFromAgency.slice";
import { updateUserOnAgencySelectors } from "src/core-logic/domain/agencies/update-user-on-agency/updateUserOnAgency.selectors";
import { updateUserOnAgencySlice } from "src/core-logic/domain/agencies/update-user-on-agency/updateUserOnAgency.slice";
import { conventionSlice } from "src/core-logic/domain/convention/convention.slice";
import { feedbacksSelectors } from "src/core-logic/domain/feedback/feedback.selectors";
import { inclusionConnectedSelectors } from "src/core-logic/domain/inclusionConnected/inclusionConnected.selectors";
import { inclusionConnectedSlice } from "src/core-logic/domain/inclusionConnected/inclusionConnected.slice";
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
        roles: ["agency-admin"],
        agency: toAgencyDtoForAgencyUsersAndAdmins(
          new AgencyDtoBuilder().build(),
          [],
        ),
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
    idToken: "inclusion-connect-id-token",
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
      store.dispatch(
        authSlice.actions.federatedIdentityFoundInDevice({
          federatedIdentityWithUser: inclusionConnectedFederatedIdentity,
          feedbackTopic: "auth-global",
        }),
      );

      expectIsLoadingToBe(true);

      dependencies.inclusionConnectedGateway.currentUser$.next(
        inclusionConnectedUser,
      );

      expectIsLoadingToBe(false);
      expectCurrentUserToBe(inclusionConnectedUser);
    });

    it("do nothing when other federated identity is found in device", () => {
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);

      store.dispatch(
        authSlice.actions.federatedIdentityFoundInDevice({
          federatedIdentityWithUser: peConnectFederatedIdentity,
          feedbackTopic: "auth-global",
        }),
      );

      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);
    });
  });

  describe("authSlice.actions.federatedIdentityFromStoreToDeviceStorageSucceeded", () => {
    it("fetches the current IC user when inclusion connect federated identity is successfully stored in device", () => {
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);

      store.dispatch(
        authSlice.actions.federatedIdentityFromStoreToDeviceStorageSucceeded({
          federatedIdentityWithUser: inclusionConnectedFederatedIdentity,
          feedbackTopic: "auth-global",
        }),
      );

      expectIsLoadingToBe(true);

      dependencies.inclusionConnectedGateway.currentUser$.next(
        inclusionConnectedUser,
      );

      expectIsLoadingToBe(false);
      expectCurrentUserToBe(inclusionConnectedUser);
    });

    it("do nothing when other federated identity is successfully stored in device", () => {
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);

      store.dispatch(
        authSlice.actions.federatedIdentityFromStoreToDeviceStorageSucceeded({
          federatedIdentityWithUser: peConnectFederatedIdentity,
          feedbackTopic: "auth-global",
        }),
      );

      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);
    });
  });

  describe("inclusionConnectedSlice.actions.currentUserFetchRequested", () => {
    it("fetches the current IC user", () => {
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);

      store.dispatch(
        inclusionConnectedSlice.actions.currentUserFetchRequested({
          feedbackTopic: "dashboard-agency-register-user",
        }),
      );

      expectIsLoadingToBe(true);

      dependencies.inclusionConnectedGateway.currentUser$.next(
        inclusionConnectedUser,
      );

      expectIsLoadingToBe(false);
      expectCurrentUserToBe(inclusionConnectedUser);
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
            idToken: "inclusion-connect-id-token",
          },
          isLoading: true,
          afterLoginRedirectionUrl: null,
        },
      }));
      store.dispatch(
        inclusionConnectedSlice.actions.currentUserFetchRequested({
          feedbackTopic: "auth-global",
        }),
      );
      expectIsLoadingToBe(true);

      const errorMessage = `Something went wrong : ${inclusionConnectTokenExpiredMessage}`;
      dependencies.inclusionConnectedGateway.currentUser$.error(
        new Error(errorMessage),
      );
      expectCurrentUserToBe(null);
    });

    it("stores error on failure when trying to fetch current IC user", () => {
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);
      store.dispatch(
        inclusionConnectedSlice.actions.currentUserFetchRequested({
          feedbackTopic: "dashboard-agency-register-user",
        }),
      );
      expectIsLoadingToBe(true);

      const errorMessage = "Something went wrong";
      dependencies.inclusionConnectedGateway.currentUser$.error(
        new Error(errorMessage),
      );
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);
      expectToEqual(feedbacksSelectors.feedbacks(store.getState()), {
        "dashboard-agency-register-user": {
          on: "fetch",
          level: "error",
          title: "Erreur",
          message: errorMessage,
        },
      });
    });
  });

  describe("inclusionConnectedSlice.actions.registerAgenciesRequested", () => {
    it("request agencies registration on the current user", () => {
      const agency1 = new AgencyDtoBuilder().withId("agency-1").build();
      const payload: WithAgencyIds = {
        agencies: [agency1.id],
      };

      store.dispatch(
        inclusionConnectedSlice.actions.registerAgenciesRequested({
          ...payload,
          feedbackTopic: "dashboard-agency-register-user",
        }),
      );
      expectIsLoadingToBe(true);
      dependencies.inclusionConnectedGateway.registerAgenciesToCurrentUserResponse$.next(
        undefined,
      );
      expectIsLoadingToBe(false);
      expectToEqual(feedbacksSelectors.feedbacks(store.getState()), {
        "dashboard-agency-register-user": {
          on: "create",
          level: "success",
          title: "Votre demande de rattachement a bien été prise en compte",
          message:
            "Elle sera étudiée prochainement par un administrateur et vous serez informé de sa décision.",
        },
      });
    });

    it("fetches the current IC user when registration succeed", () => {
      expectIsLoadingToBe(false);
      expectCurrentUserToBe(null);

      store.dispatch(
        inclusionConnectedSlice.actions.registerAgenciesSucceeded({
          agencies: [agency1.id],
          feedbackTopic: "dashboard-agency-register-user",
        }),
      );

      dependencies.inclusionConnectedGateway.currentUser$.next(
        inclusionConnectedUser,
      );

      expectIsLoadingToBe(false);
      expectCurrentUserToBe(inclusionConnectedUser);
    });

    it("request agencies registration on the current user to throw on error", () => {
      const payload: WithAgencyIds = {
        agencies: [agency1.id],
      };
      const errorMessage = "Error registering user to agencies to review";
      store.dispatch(
        inclusionConnectedSlice.actions.registerAgenciesRequested({
          ...payload,
          feedbackTopic: "dashboard-agency-register-user",
        }),
      );
      expectIsLoadingToBe(true);
      dependencies.inclusionConnectedGateway.registerAgenciesToCurrentUserResponse$.error(
        new Error(errorMessage),
      );
      expectToEqual(feedbacksSelectors.feedbacks(store.getState()), {
        "dashboard-agency-register-user": {
          on: "create",
          level: "error",
          title: "Erreur lors de la demande de rattachement à une agence",
          message: errorMessage,
        },
      });
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
          roles: ["agency-admin", "validator"],
          agency: toAgencyDtoForAgencyUsersAndAdmins(
            new AgencyDtoBuilder().build(),
            [],
          ),
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
        ["back-office", "agency-admin", "validator"],
      );
    });
  });

  describe("when current user has successfully requested an update of another user", () => {
    it("if it is himself, update the user rights successfully", () => {
      const agency = new AgencyDtoBuilder().build();
      const agencyRight: AgencyRight = {
        agency: toAgencyDtoForAgencyUsersAndAdmins(
          new AgencyDtoBuilder().build(),
          [],
        ),
        roles: ["validator"],
        isNotifiedByEmail: false,
      };
      const user: InclusionConnectedUser = new InclusionConnectedUserBuilder()
        .withId("user-id")
        .withIsAdmin(false)
        .withAgencyRights([agencyRight])
        .build();

      ({ store, dependencies } = createTestStore({
        inclusionConnected: {
          currentUser: user,
          agenciesToReview: [],
          isLoading: false,
        },
      }));

      store.dispatch(
        updateUserOnAgencySlice.actions.updateUserAgencyRightRequested({
          userId: user.id,
          agencyId: agency.id,
          email: user.email,
          roles: [...agencyRight.roles, "counsellor"],
          isNotifiedByEmail: agencyRight.isNotifiedByEmail,
          feedbackTopic: "user",
        }),
      );
      expectToEqual(
        updateUserOnAgencySelectors.isLoading(store.getState()),
        true,
      );
      dependencies.agencyGateway.updateUserAgencyRightResponse$.next(undefined);

      expectToEqual(
        updateUserOnAgencySelectors.isLoading(store.getState()),
        false,
      );
      expectToEqual(inclusionConnectedSelectors.currentUser(store.getState()), {
        ...user,
        agencyRights: [
          {
            ...agencyRight,
            roles: [...agencyRight.roles, "counsellor"],
          },
        ],
      });
    });

    it("if it is not himself, do nothing", () => {
      const agency = new AgencyDtoBuilder().build();
      const agencyRight: AgencyRight = {
        agency: toAgencyDtoForAgencyUsersAndAdmins(
          new AgencyDtoBuilder().build(),
          [],
        ),
        roles: ["validator"],
        isNotifiedByEmail: false,
      };
      const user: InclusionConnectedUser = new InclusionConnectedUserBuilder()
        .withId("user-id")
        .withIsAdmin(false)
        .withAgencyRights([agencyRight])
        .build();

      ({ store, dependencies } = createTestStore({
        inclusionConnected: {
          currentUser: user,
          agenciesToReview: [],
          isLoading: false,
        },
      }));

      store.dispatch(
        updateUserOnAgencySlice.actions.updateUserAgencyRightRequested({
          userId: "another-user-id",
          agencyId: agency.id,
          email: "another-user-id@email.com",
          roles: [...agencyRight.roles, "counsellor"],
          isNotifiedByEmail: agencyRight.isNotifiedByEmail,
          feedbackTopic: "user",
        }),
      );
      expectToEqual(
        updateUserOnAgencySelectors.isLoading(store.getState()),
        true,
      );
      dependencies.agencyGateway.updateUserAgencyRightResponse$.next(undefined);

      expectToEqual(
        updateUserOnAgencySelectors.isLoading(store.getState()),
        false,
      );
      expectToEqual(
        inclusionConnectedSelectors.currentUser(store.getState()),
        user,
      );
    });
  });

  describe("when current user has successfully requested removal from agency  of another user", () => {
    it("if it is himself, remove the user rights successfully", () => {
      const agency = new AgencyDtoBuilder().build();
      const agencyRight: AgencyRight = {
        agency: toAgencyDtoForAgencyUsersAndAdmins(
          new AgencyDtoBuilder().build(),
          [],
        ),
        roles: ["to-review"],
        isNotifiedByEmail: false,
      };
      const user: InclusionConnectedUser = new InclusionConnectedUserBuilder()
        .withId("user-id")
        .withIsAdmin(false)
        .withAgencyRights([agencyRight])
        .build();

      ({ store, dependencies } = createTestStore({
        inclusionConnected: {
          currentUser: user,
          agenciesToReview: [],
          isLoading: false,
        },
      }));

      store.dispatch(
        removeUserFromAgencySlice.actions.removeUserFromAgencyRequested({
          userId: user.id,
          agencyId: agency.id,
          feedbackTopic: "user",
        }),
      );
      expectToEqual(
        removeUserFromAgencySelectors.isLoading(store.getState()),
        true,
      );
      dependencies.agencyGateway.removeUserFromAgencyResponse$.next(undefined);

      expectToEqual(
        removeUserFromAgencySelectors.isLoading(store.getState()),
        false,
      );
      expectToEqual(inclusionConnectedSelectors.currentUser(store.getState()), {
        ...user,
        agencyRights: [],
      });
    });

    it("if it is not himself, do nothing", () => {
      const agency = new AgencyDtoBuilder().build();
      const agencyRight: AgencyRight = {
        agency: toAgencyDtoForAgencyUsersAndAdmins(
          new AgencyDtoBuilder().build(),
          [],
        ),
        roles: ["to-review"],
        isNotifiedByEmail: false,
      };
      const user: InclusionConnectedUser = new InclusionConnectedUserBuilder()
        .withId("user-id")
        .withIsAdmin(false)
        .withAgencyRights([agencyRight])
        .build();

      ({ store, dependencies } = createTestStore({
        inclusionConnected: {
          currentUser: user,
          agenciesToReview: [],
          isLoading: false,
        },
      }));

      store.dispatch(
        removeUserFromAgencySlice.actions.removeUserFromAgencyRequested({
          userId: "another-user-id",
          agencyId: agency.id,
          feedbackTopic: "user",
        }),
      );
      expectToEqual(
        removeUserFromAgencySelectors.isLoading(store.getState()),
        true,
      );
      dependencies.agencyGateway.removeUserFromAgencyResponse$.next(undefined);

      expectToEqual(
        removeUserFromAgencySelectors.isLoading(store.getState()),
        false,
      );
      expectToEqual(
        inclusionConnectedSelectors.currentUser(store.getState()),
        user,
      );
    });
  });

  const expectIsLoadingToBe = (expected: boolean) => {
    expect(inclusionConnectedSelectors.isLoading(store.getState())).toBe(
      expected,
    );
  };

  const expectCurrentUserToBe = (expected: InclusionConnectedUser | null) => {
    expect(inclusionConnectedSelectors.currentUser(store.getState())).toBe(
      expected,
    );
  };
});
