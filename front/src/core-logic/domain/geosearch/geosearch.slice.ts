import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { LookupLocationInput, LookupSearchResult } from "shared";

type GeoSearchState = {
  suggestions: LookupSearchResult[];
  value: LookupSearchResult | null;
  query: string;
  isLoading: boolean;
};

const initialState: GeoSearchState = {
  suggestions: [],
  query: "",
  value: null,
  isLoading: false,
};

export const geosearchSlice = createSlice({
  name: "geosearch",
  initialState,
  reducers: {
    queryWasEmptied: (state) => {
      state.suggestions = [];
      state.value = null;
    },
    queryHasChanged: (state, _action: PayloadAction<LookupLocationInput>) => {
      state.suggestions = [];
    },
    suggestionsHaveBeenRequested: (
      state,
      action: PayloadAction<LookupLocationInput>,
    ) => {
      state.query = action.payload;
      state.isLoading = true;
    },
    suggestionsSuccessfullyFetched: (
      state,
      action: PayloadAction<LookupSearchResult[]>,
    ) => {
      state.suggestions = action.payload;
      state.isLoading = false;
    },
    suggestionsFailed: (state, _action) => {
      state.isLoading = false;
    },
    suggestionHasBeenSelected: (state, action) => {
      state.value = action.payload;
    },
  },
});
