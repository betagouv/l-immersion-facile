import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  AgencyId,
  AgencyRight,
  IcUserRoleForAgencyParams,
  InclusionConnectedUser,
  OmitFromExistingKeys,
  RejectIcUserRoleForAgencyParams,
  UserId,
  WithUserFilters,
} from "shared";
import { SubmitFeedBack } from "src/core-logic/domain/SubmitFeedback";

type NormalizedInclusionConnectedUser = OmitFromExistingKeys<
  InclusionConnectedUser,
  "agencyRights"
> & {
  agencyRights: Record<AgencyId, AgencyRight>;
};

export type NormalizedIcUserById = Record<
  UserId,
  NormalizedInclusionConnectedUser
>;

type IcUsersAdminFeedbackKind =
  | "usersToReviewFetchSuccess"
  | "agencyRegisterToUserSuccess"
  | "agencyRejectionForUserSuccess"
  | "agencyUsersFetchSuccess";

export type IcUsersAdminFeedback = SubmitFeedBack<IcUsersAdminFeedbackKind>;

export type IcUsersAdminState = {
  icUsersNeedingReview: NormalizedIcUserById;
  icAgencyUsers: NormalizedIcUserById;
  selectedUserId: UserId | null;
  isUpdatingIcUserAgency: boolean;
  isFetchingAgenciesNeedingReviewForIcUser: boolean;
  isFetchingAgencyUsers: boolean;
  feedback: IcUsersAdminFeedback;
};

export const icUsersAdminInitialState: IcUsersAdminState = {
  icUsersNeedingReview: {},
  icAgencyUsers: {},
  selectedUserId: null,
  isUpdatingIcUserAgency: false,
  isFetchingAgenciesNeedingReviewForIcUser: false,
  isFetchingAgencyUsers: false,
  feedback: { kind: "idle" },
};

export const icUsersAdminSlice = createSlice({
  name: "inclusionConnectedUsersAdmin",
  initialState: icUsersAdminInitialState,
  reducers: {
    inclusionConnectedUserSelected: (
      state,
      action: PayloadAction<UserId | null>,
    ) => {
      state.selectedUserId = action.payload;
      if (state.feedback.kind === "errored")
        state.feedback = { kind: "usersToReviewFetchSuccess" };
    },
    fetchInclusionConnectedUsersToReviewRequested: (
      state,
      _action: PayloadAction<WithUserFilters>,
    ) => {
      state.isFetchingAgenciesNeedingReviewForIcUser = true;
    },
    fetchInclusionConnectedUsersToReviewFailed: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.isFetchingAgenciesNeedingReviewForIcUser = false;
      state.feedback = { kind: "errored", errorMessage: action.payload };
    },
    fetchInclusionConnectedUsersToReviewSucceeded: (
      state,
      action: PayloadAction<NormalizedIcUserById>,
    ) => {
      state.isFetchingAgenciesNeedingReviewForIcUser = false;
      state.icUsersNeedingReview = action.payload;
      state.feedback.kind = "usersToReviewFetchSuccess";
    },
    fetchAgencyUsersRequested: (
      state,
      _action: PayloadAction<WithUserFilters>,
    ) => {
      state.icAgencyUsers = icUsersAdminInitialState.icAgencyUsers;
      state.isFetchingAgencyUsers = true;
    },
    fetchAgencyUsersFailed: (state, action: PayloadAction<string>) => {
      state.isFetchingAgencyUsers = false;
      state.feedback = { kind: "errored", errorMessage: action.payload };
    },
    fetchAgencyUsersSucceeded: (
      state,
      action: PayloadAction<NormalizedIcUserById>,
    ) => {
      state.isFetchingAgencyUsers = false;
      state.icAgencyUsers = action.payload;
      state.feedback.kind = "agencyUsersFetchSuccess";
    },
    registerAgencyWithRoleToUserRequested: (
      state,
      _action: PayloadAction<IcUserRoleForAgencyParams>,
    ) => {
      state.isUpdatingIcUserAgency = true;
    },
    registerAgencyWithRoleToUserSucceeded: (
      state,
      action: PayloadAction<IcUserRoleForAgencyParams>,
    ) => {
      const { userId, agencyId, roles: newRoles } = action.payload;
      state.isUpdatingIcUserAgency = false;
      state.feedback.kind = "agencyRegisterToUserSuccess";
      if (
        !state.icUsersNeedingReview[userId].agencyRights[agencyId].roles.some(
          (role) => newRoles.includes(role),
        )
      ) {
        state.icUsersNeedingReview[userId].agencyRights[agencyId].roles =
          newRoles;
      }
    },
    registerAgencyWithRoleToUserFailed: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.isUpdatingIcUserAgency = false;
      state.feedback = { kind: "errored", errorMessage: action.payload };
    },
    rejectAgencyWithRoleToUserRequested: (
      state,
      _action: PayloadAction<RejectIcUserRoleForAgencyParams>,
    ) => {
      state.isUpdatingIcUserAgency = true;
    },

    rejectAgencyWithRoleToUserSucceeded: (
      state,
      action: PayloadAction<RejectIcUserRoleForAgencyParams>,
    ) => {
      const { userId, agencyId } = action.payload;

      const { [agencyId]: _agency, ...agenciesFiltered } =
        state.icUsersNeedingReview[userId].agencyRights;

      state.isUpdatingIcUserAgency = false;
      state.feedback.kind = "agencyRejectionForUserSuccess";
      state.icUsersNeedingReview[userId].agencyRights = agenciesFiltered;
    },

    rejectAgencyWithRoleToUserFailed: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.isUpdatingIcUserAgency = false;
      state.feedback = { kind: "errored", errorMessage: action.payload };
    },
  },
});
