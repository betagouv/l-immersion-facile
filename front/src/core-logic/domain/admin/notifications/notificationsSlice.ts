import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  EmailNotification,
  NotificationsByKind,
  SmsNotification,
} from "shared";

export type SentEmailsState = {
  isLoading: boolean;
  error: string | null;
  lastEmails: EmailNotification[];
  lastSms: SmsNotification[];
};

export const notificationsInitialState: SentEmailsState = {
  lastEmails: [],
  lastSms: [],
  isLoading: false,
  error: null,
};

export const notificationsSlice = createSlice({
  name: "notifications",
  initialState: notificationsInitialState,
  reducers: {
    lastSentEmailsRequested: (state) => {
      state.isLoading = true;
    },
    lastSentEmailsSucceeded: (
      state,
      action: PayloadAction<NotificationsByKind>,
    ) => {
      state.lastEmails = action.payload.emails;
      state.lastSms = action.payload.sms;
      state.error = null;
      state.isLoading = false;
    },
    lastSentEmailsFailed: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});
