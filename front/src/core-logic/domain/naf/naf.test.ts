import { NafSectionSuggestion, expectArraysToEqual } from "shared";
import { nafSelectors } from "src/core-logic/domain/naf/naf.selectors";
import { NafState, nafSlice } from "src/core-logic/domain/naf/naf.slice";
import { initialState } from "src/core-logic/domain/naf/naf.slice";
import {
  TestDependencies,
  createTestStore,
} from "src/core-logic/storeConfig/createTestStore";
import { ReduxStore, RootState } from "src/core-logic/storeConfig/store";

describe("naf slice", () => {
  const expectedResults: NafSectionSuggestion[] = [
    {
      label: "Agriculture",
      nafCodes: ["1000A"],
    },
    {
      label: "Bâtiment",
      nafCodes: ["1000B"],
    },
  ];
  let store: ReduxStore;
  let dependencies: TestDependencies;

  beforeEach(() => {
    ({ store, dependencies } = createTestStore());
  });

  it("should fetch naf sections and update the state", () => {
    expectToMatchState(store.getState(), initialState);
    store.dispatch(nafSlice.actions.queryHasChanged("query"));
    dependencies.scheduler.flush();
    expectToMatchState(store.getState(), {
      currentNafSections: [],
      isLoading: true,
    });
    // feed gateway
    dependencies.nafGateway.nafSuggestions$.next(expectedResults);
    expectToMatchState(store.getState(), {
      currentNafSections: expectedResults,
      isLoading: false,
    });
  });

  it("should return to initial state when the request fails", () => {
    expectToMatchState(store.getState(), initialState);
    store.dispatch(nafSlice.actions.queryHasChanged("query"));
    dependencies.scheduler.flush();
    expectToMatchState(store.getState(), {
      currentNafSections: [],
      isLoading: true,
    });
    dependencies.nafGateway.nafSuggestions$.error(new Error("test"));
    expectToMatchState(store.getState(), initialState);
  });

  it("shouldn't trigger a new request to the gateway when query < threshold", () => {
    expectToMatchState(store.getState(), initialState);
    store.dispatch(nafSlice.actions.queryHasChanged("query"));
    dependencies.scheduler.flush();
    dependencies.nafGateway.nafSuggestions$.next(expectedResults);
    expectToMatchState(store.getState(), {
      currentNafSections: expectedResults,
      isLoading: false,
    });
    store.dispatch(nafSlice.actions.queryHasChanged("qu"));
    dependencies.scheduler.flush();
    expectToMatchState(store.getState(), initialState);
  });

  it("should clear the current state when the query is emptied", () => {
    expectToMatchState(store.getState(), initialState);
    store.dispatch(nafSlice.actions.queryHasChanged("query"));
    dependencies.scheduler.flush();
    dependencies.nafGateway.nafSuggestions$.next(expectedResults);
    expectToMatchState(store.getState(), {
      currentNafSections: expectedResults,
      isLoading: false,
    });
    store.dispatch(nafSlice.actions.queryWasEmptied());
    dependencies.scheduler.flush();
    expectToMatchState(store.getState(), initialState);
  });
});

const expectToMatchState = (
  state: RootState,
  { currentNafSections: expectedResults, isLoading: expectedLoading }: NafState,
) => {
  expect(nafSelectors.isLoading(state)).toBe(expectedLoading);
  expectArraysToEqual(nafSelectors.currentNafSections(state), expectedResults);
};
