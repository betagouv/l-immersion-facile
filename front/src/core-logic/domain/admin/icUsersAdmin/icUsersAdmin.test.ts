import { values } from "ramda";
import {
  AgencyDtoBuilder,
  AgencyId,
  AgencyRight,
  IcUserRoleForAgencyParams,
  RejectIcUserRoleForAgencyParams,
  User,
  expectToEqual,
} from "shared";
import { adminPreloadedState } from "src/core-logic/domain/admin/adminPreloadedState";
import { icUsersAdminSelectors } from "src/core-logic/domain/admin/icUsersAdmin/icUsersAdmin.selectors";
import {
  IcUsersAdminFeedback,
  IcUsersAdminState,
  NormalizedIcUserById,
  icUsersAdminInitialState,
  icUsersAdminSlice,
} from "src/core-logic/domain/admin/icUsersAdmin/icUsersAdmin.slice";
import {
  TestDependencies,
  createTestStore,
} from "src/core-logic/storeConfig/createTestStore";
import { ReduxStore } from "src/core-logic/storeConfig/store";

const agency1 = new AgencyDtoBuilder().withId("agency-1").build();
const agency2 = new AgencyDtoBuilder().withId("agency-2").build();
const agency3 = new AgencyDtoBuilder().withId("agency-3").build();
const agency4 = new AgencyDtoBuilder().withId("agency-4").build();

const agency1Right: AgencyRight = {
  agency: agency1,
  roles: ["toReview"],
  isNotifiedByEmail: true,
};
const agency2Right: AgencyRight = {
  agency: agency2,
  roles: ["validator"],
  isNotifiedByEmail: true,
};
const user1AgencyRights: Record<AgencyId, AgencyRight> = {
  [agency1.id]: agency1Right,
  [agency2.id]: agency2Right,
};

const agency3Right: AgencyRight = {
  agency: agency3,
  roles: ["toReview"],
  isNotifiedByEmail: true,
};
const agency4Right: AgencyRight = {
  agency: agency4,
  roles: ["toReview"],
  isNotifiedByEmail: true,
};
const user2AgencyRights: Record<AgencyId, AgencyRight> = {
  [agency3.id]: agency3Right,
  [agency4.id]: agency4Right,
};

const user1Id = "user-id-1";
const authUser1: User = {
  id: user1Id,
  email: "user-email",
  firstName: "user-first-name",
  lastName: "user-last-name",
  externalId: "fake-user-external-id-1",
  createdAt: new Date().toISOString(),
};

const user2Id = "user-id-2";
const authUser2: User = {
  id: user2Id,
  email: "user-email-2",
  firstName: "user-first-name-2",
  lastName: "user-last-name-2",
  externalId: "fake-user-external-id-2",
  createdAt: new Date().toISOString(),
};

const testUserSet: NormalizedIcUserById = {
  [user1Id]: {
    ...authUser1,
    agencyRights: user1AgencyRights,
    dashboards: { agencies: {}, establishments: {} },
  },
  [user2Id]: {
    ...authUser2,
    agencyRights: user2AgencyRights,
    dashboards: { agencies: {}, establishments: {} },
  },
};

describe("Agency registration for authenticated users", () => {
  let store: ReduxStore;
  let dependencies: TestDependencies;

  beforeEach(() => {
    ({ store, dependencies } = createTestStore());
  });

  describe("user selection", () => {
    it("selects the user to review", () => {
      ({ store, dependencies } = createTestStore({
        admin: adminPreloadedState({
          inclusionConnectedUsersAdmin: {
            ...icUsersAdminInitialState,
            icUsersNeedingReview: testUserSet,
            selectedUserId: null,
            feedback: { kind: "usersToReviewFetchSuccess" },
          },
        }),
      }));

      store.dispatch(
        icUsersAdminSlice.actions.inclusionConnectedUserSelected(user2Id),
      );

      expectAgencyAdminStateToMatch({
        icUsersNeedingReview: testUserSet,
        selectedUserId: user2Id,
        feedback: { kind: "usersToReviewFetchSuccess" },
      });
    });

    it("drops the error state when selecting", () => {
      ({ store, dependencies } = createTestStore({
        admin: adminPreloadedState({
          inclusionConnectedUsersAdmin: {
            ...icUsersAdminInitialState,
            icUsersNeedingReview: testUserSet,
            selectedUserId: null,
            feedback: { kind: "errored", errorMessage: "Opps" },
          },
        }),
      }));

      store.dispatch(
        icUsersAdminSlice.actions.inclusionConnectedUserSelected(user2Id),
      );

      expectAgencyAdminStateToMatch({
        icUsersNeedingReview: testUserSet,
        selectedUserId: user2Id,
        feedback: { kind: "usersToReviewFetchSuccess" },
      });
    });
  });

  describe("fetches inclusion connected users that have agencies to review", () => {
    it("gets the users by agencyId successfully", () => {
      store.dispatch(
        icUsersAdminSlice.actions.fetchInclusionConnectedUsersToReviewRequested(
          {
            agencyId: agency2.id,
          },
        ),
      );
      expectIsFetchingIcUsersNeedingReviewToBe(true);

      dependencies.adminGateway.getAgencyUsersToReviewResponse$.next([
        {
          ...authUser1,
          agencyRights: [agency1Right, agency2Right],
          dashboards: { agencies: {}, establishments: {} },
        },
      ]);
      expectIsFetchingIcUsersNeedingReviewToBe(false);
      expectToEqual(
        icUsersAdminSelectors.icUsersNeedingReview(store.getState()),
        [authUser1],
      );
      expectFeedbackToEqual({ kind: "usersToReviewFetchSuccess" });
    });

    it("gets the users by agencyRole successfully", () => {
      store.dispatch(
        icUsersAdminSlice.actions.fetchInclusionConnectedUsersToReviewRequested(
          {
            agencyRole: "toReview",
          },
        ),
      );
      expectIsFetchingIcUsersNeedingReviewToBe(true);

      dependencies.adminGateway.getAgencyUsersToReviewResponse$.next([
        {
          ...authUser1,
          agencyRights: [agency1Right, agency2Right],
          dashboards: { agencies: {}, establishments: {} },
        },
        {
          ...authUser2,
          agencyRights: [agency3Right, agency4Right],
          dashboards: { agencies: {}, establishments: {} },
        },
      ]);
      expectIsFetchingIcUsersNeedingReviewToBe(false);
      expectToEqual(
        icUsersAdminSelectors.icUsersNeedingReview(store.getState()),
        [authUser1, authUser2],
      );
      expectFeedbackToEqual({ kind: "usersToReviewFetchSuccess" });
    });

    it("stores error message when something goes wrong in fetching", () => {
      store.dispatch(
        icUsersAdminSlice.actions.fetchInclusionConnectedUsersToReviewRequested(
          {
            agencyRole: "toReview",
          },
        ),
      );
      const errorMessage = "Error fetching users to review";
      expectIsFetchingIcUsersNeedingReviewToBe(true);
      dependencies.adminGateway.getAgencyUsersToReviewResponse$.error(
        new Error(errorMessage),
      );
      expectIsFetchingIcUsersNeedingReviewToBe(false);
      expectFeedbackToEqual({ kind: "errored", errorMessage });
    });
  });

  describe("sets a role to a user for a given agency", () => {
    it("sets successfully the given role the agency for a given user", () => {
      ({ store, dependencies } = createTestStore({
        admin: adminPreloadedState({
          inclusionConnectedUsersAdmin: {
            ...icUsersAdminInitialState,
            icUsersNeedingReview: testUserSet,
            selectedUserId: user2Id,
          },
        }),
      }));

      const payload: IcUserRoleForAgencyParams = {
        agencyId: "agency-3",
        userId: user2Id,
        roles: ["validator"],
      };

      expectToEqual(
        icUsersAdminSelectors.agenciesNeedingReviewForSelectedUser(
          store.getState(),
        ),
        values(user2AgencyRights),
      );
      store.dispatch(
        icUsersAdminSlice.actions.registerAgencyWithRoleToUserRequested(
          payload,
        ),
      );
      expectIsUpdatingUserAgencyToBe(true);
      dependencies.adminGateway.updateAgencyRoleForUserResponse$.next(
        undefined,
      );
      expectIsUpdatingUserAgencyToBe(false);

      expectToEqual(
        icUsersAdminSelectors.agenciesNeedingReviewForSelectedUser(
          store.getState(),
        ),
        [agency4Right],
      );
      expectFeedbackToEqual({ kind: "agencyRegisterToUserSuccess" });
    });

    it("stores error message when something goes wrong in the update", () => {
      const payload: IcUserRoleForAgencyParams = {
        agencyId: "agency-3",
        userId: "user-id",
        roles: ["validator"],
      };
      const errorMessage = `Error registering user ${payload.userId} to agency ${payload.agencyId} with roles ${payload.roles}`;

      store.dispatch(
        icUsersAdminSlice.actions.registerAgencyWithRoleToUserRequested(
          payload,
        ),
      );
      expectIsUpdatingUserAgencyToBe(true);
      dependencies.adminGateway.updateAgencyRoleForUserResponse$.error(
        new Error(errorMessage),
      );
      expectIsUpdatingUserAgencyToBe(false);
      expectFeedbackToEqual({ kind: "errored", errorMessage });
    });
  });

  describe("Reject user registration for agency", () => {
    it("rejects successfully the user for agency", () => {
      ({ store, dependencies } = createTestStore({
        admin: adminPreloadedState({
          inclusionConnectedUsersAdmin: {
            ...icUsersAdminInitialState,
            icUsersNeedingReview: testUserSet,
          },
        }),
      }));
      const payload: RejectIcUserRoleForAgencyParams = {
        agencyId: agency3.id,
        justification: "osef",
        userId: user2Id,
      };

      store.dispatch(
        icUsersAdminSlice.actions.rejectAgencyWithRoleToUserRequested(payload),
      );

      expectIsUpdatingUserAgencyToBe(true);

      dependencies.adminGateway.rejectUserToAgencyResponse$.next();

      expectIsUpdatingUserAgencyToBe(false);
      expectFeedbackToEqual({ kind: "agencyRejectionForUserSuccess" });
    });

    it("Fail to rejects the user for agency", () => {
      const errorMessage = "reject user for agency failed";
      expectToEqual(
        store.getState().admin.inclusionConnectedUsersAdmin,
        icUsersAdminInitialState,
      );
      store.dispatch(
        icUsersAdminSlice.actions.rejectAgencyWithRoleToUserRequested({
          agencyId: "rejected-user-for-this-agency",
          justification: "osef",
          userId: "user-to-reject-id",
        }),
      );

      expectIsUpdatingUserAgencyToBe(true);

      dependencies.adminGateway.rejectUserToAgencyResponse$.error(
        new Error(errorMessage),
      );

      expectIsUpdatingUserAgencyToBe(false);
      expectFeedbackToEqual({ kind: "errored", errorMessage });
    });
  });

  const expectIsUpdatingUserAgencyToBe = (expected: boolean) => {
    expect(
      store.getState().admin.inclusionConnectedUsersAdmin
        .isUpdatingIcUserAgency,
    ).toBe(expected);
  };

  const expectIsFetchingIcUsersNeedingReviewToBe = (expected: boolean) => {
    expect(
      store.getState().admin.inclusionConnectedUsersAdmin
        .isFetchingAgenciesNeedingReviewForIcUser,
    ).toBe(expected);
  };

  const expectFeedbackToEqual = (expected: IcUsersAdminFeedback) => {
    expectToEqual(icUsersAdminSelectors.feedback(store.getState()), expected);
  };

  const expectAgencyAdminStateToMatch = (
    params: Partial<IcUsersAdminState>,
  ) => {
    expectToEqual(store.getState().admin.inclusionConnectedUsersAdmin, {
      ...icUsersAdminInitialState,
      ...params,
    });
  };
});
