import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
} from "rxjs";
import { catchEpicError } from "src/core-logic/storeConfig/catchEpicError";
import {
  ActionOfSlice,
  AppEpic,
} from "src/core-logic/storeConfig/redux.helpers";
import { geosearchSlice } from "./geosearch.slice";

type GeosearchAction = ActionOfSlice<typeof geosearchSlice>;

export const queryMinLength = 3;
export const debounceDuration = 500;

const geosearchQueryEpic: AppEpic<GeosearchAction> = (
  action$,
  _state$,
  { scheduler },
) =>
  action$.pipe(
    filter(geosearchSlice.actions.queryHasChanged.match),
    map((action) => ({ ...action, payload: action.payload.trim() })),
    filter((action) => action.payload.length >= queryMinLength),
    debounceTime(debounceDuration, scheduler),
    distinctUntilChanged(),
    map((action) =>
      geosearchSlice.actions.suggestionsHaveBeenRequested(action.payload),
    ),
  );

const geosearchRequestEpic: AppEpic<GeosearchAction> = (
  action$,
  _,
  { addressGateway },
) =>
  action$.pipe(
    filter(geosearchSlice.actions.suggestionsHaveBeenRequested.match),
    switchMap((action) => addressGateway.lookupLocation$(action.payload)),
    map(geosearchSlice.actions.suggestionsSuccessfullyFetched),
    catchEpicError((error) =>
      geosearchSlice.actions.suggestionsFailed(error.message),
    ),
  );

export const geosearchEpics = [geosearchQueryEpic, geosearchRequestEpic];
