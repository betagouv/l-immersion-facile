import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  AbsoluteUrl,
  AdminDashboardName,
  GetAdminDashboardParams,
} from "shared";

export type DashboardUrls = Record<AdminDashboardName, AbsoluteUrl | null>;
export type DashboardsState = {
  urls: DashboardUrls;
  errorMessage: string | null;
};

export const dashboardInitialState: DashboardsState = {
  urls: {
    conventions: null,
    agency: null,
    events: null,
  },
  errorMessage: null,
};

export const dashboardUrlsSlice = createSlice({
  name: "dashboardUrls",
  initialState: dashboardInitialState,
  reducers: {
    dashboardUrlRequested: (
      state,
      _action: PayloadAction<GetAdminDashboardParams>,
    ) => {
      state.errorMessage = null;
    },
    dashboardUrlSucceeded: (
      state,
      action: PayloadAction<{
        dashboardName: AdminDashboardName;
        url: AbsoluteUrl;
      }>,
    ) => {
      state.urls[action.payload.dashboardName] = action.payload.url;
    },
    dashboardUrlFailed: (state, action: PayloadAction<string>) => {
      state.errorMessage = action.payload;
    },
  },
});
