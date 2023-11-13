import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  AbsoluteUrl,
  AgencyId,
  ConventionId,
  ConventionJwt,
  ConventionReadDto,
  ConventionSupportedJwt,
  FindSimilarConventionsParams,
  RenewConventionParams,
  SignatoryRole,
  UpdateConventionStatusRequestDto,
} from "shared";
import { SubmitFeedBack } from "../SubmitFeedback";

type ConventionValidationFeedbackKind =
  | "rejected"
  | "modificationAskedFromCounsellorOrValidator"
  | "markedAsEligible"
  | "markedAsValidated"
  | "cancelled"
  | "deprecated"
  | "renewed";

type ConventionSignatoryFeedbackKind =
  | "justSubmitted"
  | "signedSuccessfully"
  | "modificationsAskedFromSignatory";

export type ConventionFeedbackKind =
  | ConventionSignatoryFeedbackKind
  | ConventionValidationFeedbackKind;

export type ConventionSubmitFeedback = SubmitFeedBack<ConventionFeedbackKind>;

export type NumberOfSteps = 1 | 2 | 3 | 4 | 5;

export type RenewConventionPayload = {
  jwt: ConventionSupportedJwt;
  params: RenewConventionParams;
};

export interface ConventionState {
  formUi: {
    preselectedAgencyId: AgencyId | null;
    isMinor: boolean;
    isTutorEstablishmentRepresentative: boolean;
    hasCurrentEmployer: boolean;
    currentStep: NumberOfSteps;
    showSummary: boolean;
    agencyDepartment: string | null;
  };
  jwt: string | null;
  isLoading: boolean;
  convention: ConventionReadDto | null;
  conventionStatusDashboardUrl: AbsoluteUrl | null;
  fetchError: string | null;
  feedback: ConventionSubmitFeedback;
  currentSignatoryRole: SignatoryRole | null;
  similarConventionIds: ConventionId[];
}

export const initialConventionState: ConventionState = {
  formUi: {
    preselectedAgencyId: null,
    isMinor: false,
    isTutorEstablishmentRepresentative: true,
    hasCurrentEmployer: false,
    currentStep: 1,
    showSummary: false,
    agencyDepartment: null,
  },
  jwt: null,
  convention: null,
  conventionStatusDashboardUrl: null,
  isLoading: false,
  fetchError: null,
  feedback: { kind: "idle" },
  currentSignatoryRole: null,
  similarConventionIds: [],
};

export type FetchConventionRequestedPayload = {
  jwt: ConventionSupportedJwt;
  conventionId: ConventionId;
};

type StatusChangePayload = {
  feedbackKind: ConventionFeedbackKind;
  jwt: ConventionSupportedJwt;
  updateStatusParams: UpdateConventionStatusRequestDto;
};

type DateIsoStr = string;

const setFeedbackAsErrored = (
  state: ConventionState,
  action: PayloadAction<string>,
) => {
  state.isLoading = false;
  state.feedback = { kind: "errored", errorMessage: action.payload };
};

export const conventionSlice = createSlice({
  name: "convention",
  initialState: initialConventionState,
  reducers: {
    showSummaryChangeRequested: (
      state,
      action: PayloadAction<{
        showSummary: boolean;
        convention?: ConventionReadDto;
      }>,
    ) => {
      state.formUi.showSummary = action.payload.showSummary;
      if (action.payload.convention) {
        state.convention = action.payload.convention;
      }
    },
    agencyDepartementChangeRequested: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.formUi.agencyDepartment = action.payload;
    },
    // Save convention
    saveConventionRequested: (
      state,
      action: PayloadAction<ConventionReadDto>,
    ) => {
      state.isLoading = true;
      state.convention = action.payload;
    },
    saveConventionSucceeded: (state) => {
      state.isLoading = false;
      state.feedback = { kind: "justSubmitted" };
    },
    saveConventionFailed: setFeedbackAsErrored,

    // Get convention from token
    fetchConventionRequested: (
      state,
      _action: PayloadAction<FetchConventionRequestedPayload>,
    ) => {
      state.isLoading = true;
      state.feedback = { kind: "idle" };
    },
    fetchConventionSucceeded: (
      state,
      action: PayloadAction<ConventionReadDto | undefined>,
    ) => {
      state.convention = action.payload ?? null;
      state.isLoading = false;
    },
    fetchConventionFailed: (state, action: PayloadAction<string>) => {
      state.fetchError = action.payload;
      state.isLoading = false;
    },

    // Sign convention
    signConventionRequested: (
      state,
      _action: PayloadAction<{
        jwt: ConventionJwt;
        role: SignatoryRole;
        signedAt: DateIsoStr;
      }>,
    ) => {
      state.isLoading = true;
    },
    signConventionSucceeded: (
      state,
      _action: PayloadAction<{ role: SignatoryRole; signedAt: DateIsoStr }>,
    ) => {
      state.isLoading = false;
      state.feedback = { kind: "signedSuccessfully" };
    },
    signConventionFailed: setFeedbackAsErrored,

    // Modification requested
    statusChangeRequested: (
      state,
      _action: PayloadAction<StatusChangePayload>,
    ) => {
      state.isLoading = true;
    },
    statusChangeSucceeded: (
      state,
      action: PayloadAction<ConventionFeedbackKind>,
    ) => {
      state.isLoading = false;
      state.feedback = { kind: action.payload };
    },
    statusChangeFailed: setFeedbackAsErrored,

    // get convention status dashboard
    conventionStatusDashboardRequested: (
      state,
      _action: PayloadAction<ConventionJwt>,
    ) => {
      state.feedback = { kind: "idle" };
      state.isLoading = true;
    },
    conventionStatusDashboardSucceeded: (
      state,
      action: PayloadAction<AbsoluteUrl>,
    ) => {
      state.isLoading = false;
      state.conventionStatusDashboardUrl = action.payload;
    },
    conventionStatusDashboardFailed: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.feedback = { kind: "errored", errorMessage: action.payload };
    },

    isMinorChanged: (state, action: PayloadAction<boolean>) => {
      state.formUi.isMinor = action.payload;
    },
    isCurrentEmployerChanged: (state, action: PayloadAction<boolean>) => {
      state.formUi.hasCurrentEmployer = action.payload;
    },

    isTutorEstablishmentRepresentativeChanged: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.formUi.isTutorEstablishmentRepresentative = action.payload;
    },

    clearFeedbackTriggered: (state) => {
      state.feedback = { kind: "idle" };
    },

    clearFetchedConvention: (state) => {
      state.convention = initialConventionState.convention;
      state.formUi = initialConventionState.formUi;
    },

    jwtProvided: (state, action: PayloadAction<string>) => {
      state.jwt = action.payload;
    },

    currentSignatoryRoleChanged: (
      state,
      action: PayloadAction<SignatoryRole | null>,
    ) => {
      state.currentSignatoryRole = action.payload;
    },

    preselectedAgencyIdRequested: (state) => {
      state.isLoading = true;
    },
    preselectedAgencyIdSucceeded: (
      state,
      { payload }: PayloadAction<AgencyId | null>,
    ) => {
      state.isLoading = false;
      state.formUi.preselectedAgencyId = payload;
    },
    preselectedAgencyIdFailed: setFeedbackAsErrored,
    setCurrentStep: (state, { payload }: PayloadAction<NumberOfSteps>) => {
      state.formUi.currentStep = payload;
    },
    renewConventionRequested: (
      state,
      _action: PayloadAction<RenewConventionPayload>,
    ) => {
      state.isLoading = true;
    },
    renewConventionSucceeded: (state) => {
      state.isLoading = false;
      state.feedback = { kind: "renewed" };
    },
    renewConventionFailed: setFeedbackAsErrored,

    // Get similar conventions
    getSimilarConventionsRequested: (
      state,
      _action: PayloadAction<FindSimilarConventionsParams>,
    ) => {
      state.isLoading = true;
    },
    getSimilarConventionsSucceeded: (
      state,
      { payload }: PayloadAction<ConventionId[]>,
    ) => {
      state.isLoading = false;
      state.similarConventionIds = payload;
    },
    getSimilarConventionsFailed: setFeedbackAsErrored,
  },
});
