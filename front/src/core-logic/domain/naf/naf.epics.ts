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
import { nafSlice } from "./naf.slice";

type NafAction = ActionOfSlice<typeof nafSlice>;

const queryMinLength = 3;
const debounceDuration = 500;

const queryHasChangedEpic: AppEpic<NafAction> = (
  action$,
  _state$,
  { scheduler },
) =>
  action$.pipe(
    filter(nafSlice.actions.queryHasChanged.match),
    map((action) => ({ ...action, payload: action.payload.trim() })),
    filter((action) => action.payload.length >= queryMinLength),
    debounceTime(debounceDuration, scheduler),
    distinctUntilChanged(),
    map((action) => nafSlice.actions.searchSectionsRequested(action.payload)),
  );

const searchSectionsEpic: AppEpic<NafAction> = (
  action$,
  _state$,
  { nafGateway },
) =>
  action$.pipe(
    filter(nafSlice.actions.searchSectionsRequested.match),
    switchMap((action) => nafGateway.getNafSuggestions$(action.payload)),
    map((suggestions) => nafSlice.actions.searchSectionsSucceeded(suggestions)),
    catchEpicError(nafSlice.actions.searchSectionsFailed),
  );

export const nafEpics = [queryHasChangedEpic, searchSectionsEpic];
