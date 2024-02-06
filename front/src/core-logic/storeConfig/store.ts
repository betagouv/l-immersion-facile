import { combineReducers, configureStore } from "@reduxjs/toolkit";
import * as Sentry from "@sentry/browser";
import { combineEpics, createEpicMiddleware, Epic } from "redux-observable";
import { catchError } from "rxjs";
import type { Dependencies } from "src/config/dependencies";
import { adminAuthEpics } from "src/core-logic/domain/admin/adminAuth/adminAuth.epics";
import { adminAuthSlice } from "src/core-logic/domain/admin/adminAuth/adminAuth.slice";
import { agenciesAdminEpics } from "src/core-logic/domain/admin/agenciesAdmin/agencyAdmin.epics";
import { agencyAdminSlice } from "src/core-logic/domain/admin/agenciesAdmin/agencyAdmin.slice";
import { dashboardUrlsEpics } from "src/core-logic/domain/admin/dashboardUrls/dashboardUrls.epics";
import { dashboardUrlsSlice } from "src/core-logic/domain/admin/dashboardUrls/dashboardUrls.slice";
import { icUsersAdminEpics } from "src/core-logic/domain/admin/icUsersAdmin/icUsersAdmin.epics";
import { icUsersAdminSlice } from "src/core-logic/domain/admin/icUsersAdmin/icUsersAdmin.slice";
import { notificationsEpics } from "src/core-logic/domain/admin/notifications/notifications.epics";
import { notificationsSlice } from "src/core-logic/domain/admin/notifications/notificationsSlice";
import { apiConsumerEpics } from "src/core-logic/domain/apiConsumer/apiConsumer.epics";
import { apiConsumerSlice } from "src/core-logic/domain/apiConsumer/apiConsumer.slice";
import { assessmentEpics } from "src/core-logic/domain/assessment/assessment.epics";
import { assessmentSlice } from "src/core-logic/domain/assessment/assessment.slice";
import { authSlice } from "src/core-logic/domain/auth/auth.slice";
import { establishmentEpics } from "src/core-logic/domain/establishmentPath/establishment.epics";
import { featureFlagEpics } from "src/core-logic/domain/featureFlags/featureFlags.epics";
import { featureFlagsSlice } from "src/core-logic/domain/featureFlags/featureFlags.slice";
import { inclusionConnectedEpics } from "src/core-logic/domain/inclusionConnected/inclusionConnected.epics";
import { inclusionConnectedSlice } from "src/core-logic/domain/inclusionConnected/inclusionConnected.slice";
import { rootAppEpics } from "src/core-logic/domain/rootApp/rootApp.epics";
import { rootAppSlice } from "src/core-logic/domain/rootApp/rootApp.slice";
import { searchEpics } from "src/core-logic/domain/search/search.epics";
import { searchSlice } from "src/core-logic/domain/search/search.slice";
import { siretEpics } from "src/core-logic/domain/siret/siret.epics";
import { siretSlice } from "src/core-logic/domain/siret/siret.slice";
import { agenciesEpics } from "../domain/agenciesConvention/agencies.epics";
import { agenciesSlice } from "../domain/agenciesConvention/agencies.slice";
import { agencyInfoEpics } from "../domain/agencyInfo/agencyInfo.epics";
import { agencyInfoSlice } from "../domain/agencyInfo/agencyInfo.slice";
import { authEpics } from "../domain/auth/auth.epics";
import { conventionEpics } from "../domain/convention/convention.epics";
import { conventionSlice } from "../domain/convention/convention.slice";
import { establishmentBatchEpics } from "../domain/establishmentBatch/establishmentBatch.epics";
import { establishmentBatchSlice } from "../domain/establishmentBatch/establishmentBatch.slice";
import { establishmentSlice } from "../domain/establishmentPath/establishment.slice";
import { geosearchEpics } from "../domain/geosearch/geosearch.epics";
import { geosearchSlice } from "../domain/geosearch/geosearch.slice";
import { partnersErroredConventionEpics } from "../domain/partnersErroredConvention/partnersErroredConvention.epics";
import { partnersErroredConventionSlice } from "../domain/partnersErroredConvention/partnersErroredConvention.slice";

const allEpics: any[] = [
  ...rootAppEpics,
  ...dashboardUrlsEpics,
  ...notificationsEpics,
  ...adminAuthEpics,
  ...establishmentBatchEpics,
  ...agenciesEpics,
  ...authEpics,
  ...establishmentEpics,
  ...geosearchEpics,
  ...searchEpics,
  ...siretEpics,
  ...featureFlagEpics,
  ...agenciesAdminEpics,
  ...conventionEpics,
  ...assessmentEpics,
  ...inclusionConnectedEpics,
  ...agencyInfoEpics,
  ...icUsersAdminEpics,
  ...apiConsumerEpics,
  ...partnersErroredConventionEpics,
];

const appReducer = combineReducers({
  [agencyInfoSlice.name]: agencyInfoSlice.reducer,
  [agenciesSlice.name]: agenciesSlice.reducer,
  [searchSlice.name]: searchSlice.reducer,
  [featureFlagsSlice.name]: featureFlagsSlice.reducer,
  [siretSlice.name]: siretSlice.reducer,
  [establishmentSlice.name]: establishmentSlice.reducer,
  [geosearchSlice.name]: geosearchSlice.reducer,
  [conventionSlice.name]: conventionSlice.reducer,
  [assessmentSlice.name]: assessmentSlice.reducer,
  [authSlice.name]: authSlice.reducer,
  [establishmentBatchSlice.name]: establishmentBatchSlice.reducer,
  [inclusionConnectedSlice.name]: inclusionConnectedSlice.reducer,
  [partnersErroredConventionSlice.name]: partnersErroredConventionSlice.reducer,
  admin: combineReducers({
    [agencyAdminSlice.name]: agencyAdminSlice.reducer,
    [icUsersAdminSlice.name]: icUsersAdminSlice.reducer,
    [adminAuthSlice.name]: adminAuthSlice.reducer,
    [dashboardUrlsSlice.name]: dashboardUrlsSlice.reducer,
    [notificationsSlice.name]: notificationsSlice.reducer,
    [apiConsumerSlice.name]: apiConsumerSlice.reducer,
  }),
});

const rootReducer: typeof appReducer = (state, action) =>
  appReducer(
    action.type === rootAppSlice.actions.appResetRequested.type
      ? undefined
      : state,
    action,
  );

const rootEpic: Epic = (action$, store$, dependencies) =>
  combineEpics(...allEpics)(action$, store$, dependencies).pipe(
    catchError((error, source) => {
      //eslint-disable-next-line no-console
      console.error("combineEpic", error);
      Sentry.captureException(error);
      return source;
    }),
  );

type StoreProps = {
  dependencies: Dependencies;
  preloadedState?: Partial<RootState>;
};

export const createStore = ({ dependencies, preloadedState }: StoreProps) => {
  const epicMiddleware = createEpicMiddleware({ dependencies });
  const store = configureStore({
    preloadedState,
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => [
      ...getDefaultMiddleware({ thunk: false }),
      epicMiddleware,
    ],
  });
  epicMiddleware.run(rootEpic);
  return store;
};

export type RootState = ReturnType<typeof rootReducer>;
export const createRootSelector = <T>(selector: (state: RootState) => T) =>
  selector;

export type ReduxStore = ReturnType<typeof createStore>;
