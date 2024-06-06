import { filter, map, switchMap } from "rxjs";
import { apiConsumerSlice } from "src/core-logic/domain/apiConsumer/apiConsumer.slice";
import { catchEpicError } from "src/core-logic/storeConfig/catchEpicError";
import {
  ActionOfSlice,
  AppEpic,
} from "src/core-logic/storeConfig/redux.helpers";

type ApiConsumerAction = ActionOfSlice<typeof apiConsumerSlice>;
type ApiConsumerEpic = AppEpic<ApiConsumerAction>;

const retrieveApiConsumersEpic: ApiConsumerEpic = (
  action$,
  _state$,
  { adminGateway },
) =>
  action$.pipe(
    filter(apiConsumerSlice.actions.retrieveApiConsumersRequested.match),
    switchMap((action) => adminGateway.getAllApiConsumers$(action.payload)),
    map(apiConsumerSlice.actions.retrieveApiConsumersSucceeded),
    catchEpicError((error) =>
      apiConsumerSlice.actions.retrieveApiConsumersFailed(error.message),
    ),
  );

const createApiConsumerEpic: ApiConsumerEpic = (
  action$,
  _state$,
  { adminGateway },
) =>
  action$.pipe(
    filter(apiConsumerSlice.actions.saveApiConsumerRequested.match),
    switchMap((action) =>
      adminGateway
        .saveApiConsumer$(action.payload.apiConsumer, action.payload.adminToken)
        .pipe(
          map((token) =>
            token
              ? apiConsumerSlice.actions.saveApiConsumerSucceeded({
                  apiConsumerJwt: token,
                  feedbackTopic: action.payload.feedbackTopic,
                })
              : apiConsumerSlice.actions.updateApiConsumerSucceeded({
                  feedbackTopic: action.payload.feedbackTopic,
                }),
          ),
          catchEpicError((error) =>
            apiConsumerSlice.actions.saveApiConsumerFailed({
              errorMessage: error.message,
              feedbackTopic: action.payload.feedbackTopic,
            }),
          ),
        ),
    ),
  );

export const apiConsumerEpics = [
  retrieveApiConsumersEpic,
  createApiConsumerEpic,
];
