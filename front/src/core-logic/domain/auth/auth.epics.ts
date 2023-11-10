import { filter, map, tap } from "rxjs";
import { switchMap } from "rxjs/operators";
import { catchEpicError } from "src/core-logic/storeConfig/catchEpicError";
import {
  ActionOfSlice,
  AppEpic,
} from "src/core-logic/storeConfig/redux.helpers";
import { appIsReadyAction } from "../actions";
import { authSlice } from "./auth.slice";

export type AuthAction = ActionOfSlice<typeof authSlice>;
type AuthEpic = AppEpic<AuthAction>;

const storeFederatedIdentityInDevice: AuthEpic = (
  action$,
  state$,
  { deviceRepository },
) =>
  action$.pipe(
    filter(authSlice.actions.federatedIdentityProvided.match),
    tap(() => {
      if (state$.value.auth.federatedIdentityWithUser)
        deviceRepository.set(
          "federatedIdentityWithUser",
          state$.value.auth.federatedIdentityWithUser,
        );
      return state$.value.auth.federatedIdentityWithUser;
    }),
    map(({ payload }) =>
      authSlice.actions.federatedIdentityFromStoreToDeviceStorageSucceeded(
        payload,
      ),
    ),
  );

const deleteFederatedIdentityFromDevice: AuthEpic = (
  action$,
  _,
  { deviceRepository },
) =>
  action$.pipe(
    filter(authSlice.actions.federatedIdentityDeletionTriggered.match),
    tap(() => deviceRepository.delete("federatedIdentityWithUser")),
    tap(() => deviceRepository.delete("partialConventionInUrl")),
    map(() => authSlice.actions.federatedIdentityInDeviceDeletionSucceeded()),
  );

const logoutFromInclusionConnect: AuthEpic = (
  action$,
  state$,
  { inclusionConnectedGateway, navigationGateway },
) =>
  action$.pipe(
    filter(authSlice.actions.federatedIdentityDeletionTriggered.match),
    filter(
      () =>
        state$.value.auth.federatedIdentityWithUser?.provider ===
        "inclusionConnect",
    ),
    switchMap(({ payload }) => {
      if (payload === "other")
        throw new Error("WithSourcePage required in payload");
      return inclusionConnectedGateway.getLogoutUrl$({ page: payload });
    }),
    map((logoutUrl) => {
      navigationGateway.goToUrl(logoutUrl);
      return authSlice.actions.loggedOutSuccessfullyFromInclusionConnect();
    }),
    catchEpicError((_error) =>
      authSlice.actions.loggedOutFailedFromInclusionConnect(),
    ),
  );

const checkConnectedWithFederatedIdentity: AuthEpic = (
  action$,
  _,
  { deviceRepository },
) =>
  action$.pipe(
    filter(appIsReadyAction.match),
    map(() => {
      const federatedIdentity = deviceRepository.get(
        "federatedIdentityWithUser",
      );
      return federatedIdentity
        ? authSlice.actions.federatedIdentityFoundInDevice(federatedIdentity)
        : authSlice.actions.federatedIdentityNotFoundInDevice();
    }),
  );

export const authEpics = [
  storeFederatedIdentityInDevice,
  checkConnectedWithFederatedIdentity,
  logoutFromInclusionConnect,
  deleteFederatedIdentityFromDevice,
];
