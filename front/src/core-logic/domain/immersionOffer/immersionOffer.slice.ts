import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppellationCode, SearchImmersionResultDto, SiretDto } from "shared";
import { SubmitFeedBack } from "../SubmitFeedback";

export type ImmersionOfferFeedback = SubmitFeedBack<"success">;

type ImmersionOfferState = {
  feedback: ImmersionOfferFeedback;
  currentImmersionOffer: SearchImmersionResultDto | null;
  isLoading: boolean;
};

type ImmersionOfferPayload = {
  siret: SiretDto;
  appellation: AppellationCode;
};

export const initialState: ImmersionOfferState = {
  currentImmersionOffer: null,
  isLoading: false,
  feedback: {
    kind: "idle",
  },
};

export const immersionOfferSlice = createSlice({
  name: "immersionOffer",
  initialState,
  reducers: {
    fetchImmersionOfferRequested: (
      state,
      _action: PayloadAction<ImmersionOfferPayload>,
    ) => {
      state.isLoading = true;
    },
  },
});
