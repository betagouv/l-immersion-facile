import { ConventionDto } from "shared/src/convention/convention.dto";
import { ConventionDtoBuilder } from "shared/src/convention/ConventionDtoBuilder";
import { expectObjectsToMatch } from "shared/src/expectToEqual";
import { conventionSelectors } from "src/core-logic/domain/convention/convention.selectors";
import {
  createTestStore,
  TestDependencies,
} from "src/core-logic/storeConfig/createTestStore";
import { ReduxStore } from "src/core-logic/storeConfig/store";
import { conventionSlice, ConventionState } from "./convention.slice";

describe("Convention slice", () => {
  let store: ReduxStore;
  let dependencies: TestDependencies;

  beforeEach(() => {
    ({ store, dependencies } = createTestStore());
  });

  describe("Fetching a convention", () => {
    it("stores null as Convention without an immersion application matching in backend", () => {
      expectConventionState({
        isLoading: false,
        convention: null,
      });
      store.dispatch(conventionSlice.actions.conventionRequested("my-jwt"));
      expectConventionState({ isLoading: true });
      feedGatewayWithConvention(undefined);
      expectConventionState({
        convention: null,
        isLoading: false,
      });
    });

    it("stores the Convention if one matches in backend", () => {
      const convention = new ConventionDtoBuilder().build();
      expectConventionState({
        isLoading: false,
        convention: null,
      });
      store.dispatch(conventionSlice.actions.conventionRequested("my-jwt"));
      expectConventionState({ isLoading: true });
      feedGatewayWithConvention(convention);
      expectConventionState({
        convention,
        isLoading: false,
      });
    });

    it("stores error if failure during fetch", () => {
      expectConventionState({
        isLoading: false,
        convention: null,
        error: null,
      });
      store.dispatch(conventionSlice.actions.conventionRequested("my-jwt"));
      expectConventionState({ isLoading: true });
      feedGatewayWithError(new Error("I failed !"));
      expectConventionState({
        convention: null,
        isLoading: false,
        error: "I failed !",
      });
    });
  });

  const expectConventionState = (conventionState: Partial<ConventionState>) => {
    expectObjectsToMatch(
      conventionSelectors.conventionState(store.getState()),
      conventionState,
    );
  };

  const feedGatewayWithError = (error: Error) => {
    dependencies.conventionGateway.convention$.error(error);
  };

  const feedGatewayWithConvention = (convention: ConventionDto | undefined) => {
    dependencies.conventionGateway.convention$.next(convention);
  };
});
