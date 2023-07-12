import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  defaultMaxContactsPerWeek,
  FormEstablishmentDto,
  SiretDto,
} from "shared";
import { emptyAppellationAndRome } from "shared";
import { SubmitFeedBack } from "../SubmitFeedback"; // type EstablishmentUiStatus =

type EstablishmentFeedback = SubmitFeedBack<
  | "success"
  | "readyForLinkRequestOrRedirection"
  | "submitErrored"
  | "sendModificationLinkErrored"
>;

export type EstablishmentRequestedPayload =
  | Partial<FormEstablishmentDto>
  | {
      siret: SiretDto;
      jwt: string;
    };

export const defaultFormEstablishmentValue = (
  siret?: SiretDto,
): FormEstablishmentDto => ({
  source: "immersion-facile",
  siret: siret || "",
  businessName: "",
  businessAddress: "",
  appellations: [emptyAppellationAndRome],
  businessContact: {
    firstName: "",
    lastName: "",
    job: "",
    phone: "",
    email: "",
    contactMethod: "EMAIL",
    copyEmails: [],
  },
  website: "",
  additionalInformation: "",
  maxContactsPerWeek: defaultMaxContactsPerWeek,
});

export type EstablishmentState = {
  isLoading: boolean;
  feedback: EstablishmentFeedback;
  formEstablishment: FormEstablishmentDto;
};

const initialState: EstablishmentState = {
  isLoading: false,
  feedback: {
    kind: "idle",
  },
  formEstablishment: defaultFormEstablishmentValue(),
};

export const establishmentSlice = createSlice({
  name: "establishment",
  initialState,
  reducers: {
    gotReady: (state) => {
      state.feedback = {
        kind: "readyForLinkRequestOrRedirection",
      };
    },
    backToIdle: (state) => {
      state.feedback = {
        kind: "idle",
      };
    },
    establishmentRequested: (
      state,
      _action: PayloadAction<EstablishmentRequestedPayload>,
    ) => {
      state.isLoading = true;
    },
    establishmentProvided: (
      state,
      action: PayloadAction<FormEstablishmentDto>,
    ) => {
      state.formEstablishment = action.payload;
      state.isLoading = false;
      state.feedback = { kind: "success" };
    },
    establishmentProvideFailed: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.feedback = {
        kind: "errored",
        errorMessage: action.payload,
      };
    },

    // submit actions

    establishmentCreationRequested: (
      state,
      _action: PayloadAction<FormEstablishmentDto>,
    ) => {
      state.isLoading = true;
    },
    establishmentCreationSucceeded: (state) => {
      state.isLoading = false;
      state.feedback = { kind: "success" };
    },
    establishmentCreationFailed: () => {
      //
    },

    establishmentEditionRequested: () => {
      //
    },
    establishmentEditionSucceeded: () => {
      //
    },
    establishmentEditionFailed: () => {
      //
    },

    // clear
    establishmentClearRequested: () => initialState,

    sendModificationLinkRequested: (
      state,
      _action: PayloadAction<SiretDto>,
    ) => {
      state.isLoading = true;
    },
    sendModificationLinkSucceeded: (state) => {
      state.isLoading = false;
      state.feedback = { kind: "success" };
    },
    sendModificationLinkFailed: (state) => {
      state.isLoading = false;
      state.feedback = {
        kind: "sendModificationLinkErrored",
      };
    },
  },
});
