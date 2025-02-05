import {
  AgencyDtoBuilder,
  AgencyRight,
  InclusionConnectedUser,
  InclusionConnectedUserBuilder,
  expectToEqual,
  toAgencyDtoForAgencyUsersAndAdmins,
} from "shared";
import { adminPreloadedState } from "src/core-logic/domain/admin/adminPreloadedState";
import { adminFetchUserSelectors } from "src/core-logic/domain/admin/fetchUser/fetchUser.selectors";
import { fetchUserSlice } from "src/core-logic/domain/admin/fetchUser/fetchUser.slice";
import { removeUserFromAgencySelectors } from "src/core-logic/domain/agencies/remove-user-from-agency/removeUserFromAgency.selectors";
import { removeUserFromAgencySlice } from "src/core-logic/domain/agencies/remove-user-from-agency/removeUserFromAgency.slice";
import { updateUserOnAgencySelectors } from "src/core-logic/domain/agencies/update-user-on-agency/updateUserOnAgency.selectors";
import { updateUserOnAgencySlice } from "src/core-logic/domain/agencies/update-user-on-agency/updateUserOnAgency.slice";
import {
  TestDependencies,
  createTestStore,
} from "src/core-logic/storeConfig/createTestStore";
import { ReduxStore } from "src/core-logic/storeConfig/store";

const icUser = new InclusionConnectedUserBuilder().build();

describe("Admin Users slice", () => {
  let store: ReduxStore;
  let dependencies: TestDependencies;

  beforeEach(() => {
    ({ store, dependencies } = createTestStore());
  });

  it("fetches the user successfully", () => {
    expectToEqual(adminFetchUserSelectors.isFetching(store.getState()), false);
    expectToEqual(adminFetchUserSelectors.fetchedUser(store.getState()), null);

    store.dispatch(
      fetchUserSlice.actions.fetchUserRequested({ userId: icUser.id }),
    );

    expectToEqual(adminFetchUserSelectors.isFetching(store.getState()), true);

    feedWithUsers(icUser);

    expectToEqual(adminFetchUserSelectors.isFetching(store.getState()), false);
    expectToEqual(
      adminFetchUserSelectors.fetchedUser(store.getState()),
      icUser,
    );
  });

  describe("when current user has successfully requested an update of another user", () => {
    it("if this other user is in the state, update this user rights successfully", () => {
      const agency = new AgencyDtoBuilder().build();
      const agencyRight: AgencyRight = {
        agency: toAgencyDtoForAgencyUsersAndAdmins(agency, []),
        roles: ["validator"],
        isNotifiedByEmail: false,
      };
      const user: InclusionConnectedUser = new InclusionConnectedUserBuilder()
        .withId("user-id")
        .withIsAdmin(false)
        .withAgencyRights([agencyRight])
        .build();

      ({ store, dependencies } = createTestStore({
        admin: adminPreloadedState({
          fetchUser: {
            user,
            isFetching: false,
          },
        }),
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
      expectToEqual(adminFetchUserSelectors.fetchedUser(store.getState()), {
        ...user,
        agencyRights: [
          {
            ...agencyRight,
            roles: [...agencyRight.roles, "counsellor"],
          },
        ],
      });
    });

    it("if it is not user in state, do nothing", () => {
      const agency = new AgencyDtoBuilder().build();
      const agencyRight: AgencyRight = {
        agency: toAgencyDtoForAgencyUsersAndAdmins(agency, []),
        roles: ["validator"],
        isNotifiedByEmail: false,
      };
      const user: InclusionConnectedUser = new InclusionConnectedUserBuilder()
        .withId("user-id")
        .withIsAdmin(false)
        .withAgencyRights([agencyRight])
        .build();

      ({ store, dependencies } = createTestStore({
        admin: adminPreloadedState({
          fetchUser: {
            user,
            isFetching: false,
          },
        }),
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
        adminFetchUserSelectors.fetchedUser(store.getState()),
        user,
      );
    });
  });

  describe("when user has successfully requested removal from agency of another user", () => {
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
        admin: adminPreloadedState({
          fetchUser: {
            user,
            isFetching: false,
          },
        }),
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
      expectToEqual(adminFetchUserSelectors.fetchedUser(store.getState()), {
        ...user,
        agencyRights: [],
      });
    });

    it("if it is not user in state, do nothing", () => {
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
        admin: adminPreloadedState({
          fetchUser: {
            user,
            isFetching: false,
          },
        }),
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
        adminFetchUserSelectors.fetchedUser(store.getState()),
        user,
      );
    });
  });

  const feedWithUsers = (icUser: InclusionConnectedUser) => {
    dependencies.adminGateway.getIcUserResponse$.next(icUser);
  };
});
