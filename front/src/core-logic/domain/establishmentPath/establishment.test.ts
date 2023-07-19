import {
  expectObjectsToMatch,
  expectToEqual,
  FormEstablishmentDto,
  FormEstablishmentDtoBuilder,
  LegacyHttpClientError,
  SiretDto,
  SiretEstablishmentDto,
} from "shared";
import { establishmentSelectors } from "src/core-logic/domain/establishmentPath/establishment.selectors";
import { siretSlice } from "src/core-logic/domain/siret/siret.slice";
import { makeStubFeatureFlags } from "src/core-logic/domain/testHelpers/test.helpers";
import {
  createTestStore,
  TestDependencies,
} from "src/core-logic/storeConfig/createTestStore";
import { ReduxStore } from "src/core-logic/storeConfig/store";
import {
  defaultFormEstablishmentValue,
  EstablishmentRequestedPayload,
  establishmentSlice,
  EstablishmentState,
} from "./establishment.slice";

const establishmentFromSiretFetched: SiretEstablishmentDto = {
  siret: "11110000111100",
  businessName: "Existing open business on Sirene Corp.",
  businessAddress: "",
  isOpen: true,
  numberEmployeesRange: "",
};

const formEstablishment = FormEstablishmentDtoBuilder.valid().build();

describe("Establishment", () => {
  let store: ReduxStore;
  let dependencies: TestDependencies;

  beforeEach(() => {
    const storeAndDeps = createTestStore();
    ({ store, dependencies } = storeAndDeps);
  });

  it("reflects when user wants to input siret", () => {
    store.dispatch(establishmentSlice.actions.gotReady());

    expect(
      establishmentSelectors.isReadyForLinkRequestOrRedirection(
        store.getState(),
      ),
    ).toBe(true);
  });

  it("does not trigger navigation when siret is requested if status is not 'READY_FOR_LINK_REQUEST_OR_REDIRECTION'", () => {
    store.dispatch(
      siretSlice.actions.siretInfoSucceeded({
        siret: "123",
      } as SiretEstablishmentDto),
    );
    expectNavigationToEstablishmentFormPageToHaveBeenTriggered(null);
  });

  it("triggers navigation when siret is requested if status is 'READY_FOR_LINK_REQUEST_OR_REDIRECTION'", () => {
    ({ store, dependencies } = createTestStore({
      establishment: {
        isLoading: false,
        feedback: { kind: "readyForLinkRequestOrRedirection" },
        formEstablishment: defaultFormEstablishmentValue(),
      },
    }));
    store.dispatch(siretSlice.actions.siretModified("10002000300040"));
    dependencies.siretGatewayThroughBack.siretInfo$.next(
      establishmentFromSiretFetched,
    );
    expectNavigationToEstablishmentFormPageToHaveBeenTriggered(
      "10002000300040",
    );
  });

  it("triggers navigation when siret is requested if status is 'READY_FOR_LINK_REQUEST_OR_REDIRECTION', event if insee feature flag is OFF", () => {
    ({ store, dependencies } = createTestStore({
      establishment: {
        isLoading: false,
        feedback: { kind: "readyForLinkRequestOrRedirection" },
        formEstablishment: defaultFormEstablishmentValue(),
      },
      featureFlags: {
        ...makeStubFeatureFlags({ enableInseeApi: false }),
        isLoading: false,
      },
    }));
    store.dispatch(siretSlice.actions.siretModified("10002000300040"));
    dependencies.siretGatewayThroughBack.isSiretInDb$.next(false);
    expectNavigationToEstablishmentFormPageToHaveBeenTriggered(
      "10002000300040",
    );
  });

  it("send modification link", () => {
    expectEstablishmentStateToMatch({
      isLoading: false,
      feedback: { kind: "idle" },
    });
    store.dispatch(
      establishmentSlice.actions.sendModificationLinkRequested("siret-123"),
    );
    expectEstablishmentStateToMatch({ isLoading: true });
    dependencies.establishmentGateway.establishmentModificationResponse$.next(
      undefined,
    );
    expectEstablishmentStateToMatch({
      isLoading: false,
      feedback: { kind: "success" },
    });
    expect(
      establishmentSelectors.sendModifyLinkSucceeded(store.getState()),
    ).toBe(true);
  });

  it("handle send modification link error", () => {
    const errorMessage = "Error sending modification link";
    expectEstablishmentStateToMatch({
      isLoading: false,
      feedback: { kind: "idle" },
    });
    store.dispatch(
      establishmentSlice.actions.sendModificationLinkRequested("siret-123"),
    );
    expect(establishmentSelectors.isLoading(store.getState())).toBe(true);
    dependencies.establishmentGateway.establishmentModificationResponse$.error(
      new LegacyHttpClientError(errorMessage, new Error(), 400, {
        errors: errorMessage,
      }),
    );
    expect(establishmentSelectors.isLoading(store.getState())).toBe(false);
    expect(establishmentSelectors.feedback(store.getState())).toEqual({
      kind: "sendModificationLinkErrored",
      errorMessage,
    });
    expect(
      establishmentSelectors.sendModifyLinkSucceeded(store.getState()),
    ).toBe(false);
  });

  describe("establishment fetch", () => {
    it("fetches establishment on establishment creation (empty params)", () => {
      expectEstablishmentStateToMatch({
        isLoading: false,
        feedback: { kind: "idle" },
        formEstablishment: defaultFormEstablishmentValue(),
      });
      store.dispatch(establishmentSlice.actions.establishmentRequested({}));

      expectToEqual(establishmentSelectors.isLoading(store.getState()), false);
      expectToEqual(establishmentSelectors.feedback(store.getState()), {
        kind: "success",
      });
      expectToEqual(
        establishmentSelectors.formEstablishment(store.getState()),
        defaultFormEstablishmentValue(),
      );
    });
    it("fetches establishment on establishment creation (with params)", () => {
      expectEstablishmentStateToMatch({
        isLoading: false,
        feedback: { kind: "idle" },
        formEstablishment: defaultFormEstablishmentValue(),
      });
      const testedQueryParams: EstablishmentRequestedPayload = {
        siret: "12345678901234",
        fitForDisabledWorkers: true,
      };
      const expectedFormEstablishment: FormEstablishmentDto = {
        ...defaultFormEstablishmentValue(),
        siret: testedQueryParams.siret!,
        fitForDisabledWorkers: testedQueryParams.fitForDisabledWorkers,
      };
      store.dispatch(
        establishmentSlice.actions.establishmentRequested(testedQueryParams),
      );

      expectToEqual(establishmentSelectors.isLoading(store.getState()), false);
      expectToEqual(establishmentSelectors.feedback(store.getState()), {
        kind: "success",
      });
      expectToEqual(
        establishmentSelectors.formEstablishment(store.getState()),
        expectedFormEstablishment,
      );
    });
    it("fetches establishment on establishment edition (JWT query params)", () => {
      expectEstablishmentStateToMatch({
        isLoading: false,
        feedback: { kind: "idle" },
        formEstablishment: defaultFormEstablishmentValue(),
      });
      const testedQueryParams: EstablishmentRequestedPayload = {
        jwt: "some-correct-jwt",
        siret: "12345678901234",
      };
      store.dispatch(
        establishmentSlice.actions.establishmentRequested(testedQueryParams),
      );
      expectToEqual(establishmentSelectors.isLoading(store.getState()), true);
      dependencies.establishmentGateway.formEstablishment$.next(
        formEstablishment,
      );

      expectToEqual(establishmentSelectors.isLoading(store.getState()), false);
      expectToEqual(establishmentSelectors.feedback(store.getState()), {
        kind: "success",
      });
      expectToEqual(
        establishmentSelectors.formEstablishment(store.getState()),
        formEstablishment,
      );
    });
    it("should fail when fetching establishment on establishment edition (JWT query params) on gateway error", () => {
      expectEstablishmentStateToMatch({
        isLoading: false,
        feedback: { kind: "idle" },
        formEstablishment: defaultFormEstablishmentValue(),
      });
      const testedQueryParams: EstablishmentRequestedPayload = {
        jwt: "some-wrong-jwt",
        siret: "12345678901234",
      };
      store.dispatch(
        establishmentSlice.actions.establishmentRequested(testedQueryParams),
      );
      expectToEqual(establishmentSelectors.isLoading(store.getState()), true);
      dependencies.establishmentGateway.formEstablishment$.error(
        new Error("some-error"),
      );

      expectToEqual(establishmentSelectors.isLoading(store.getState()), false);
      expectToEqual(establishmentSelectors.feedback(store.getState()), {
        kind: "errored",
        errorMessage: "some-error",
      });
      expectToEqual(
        establishmentSelectors.formEstablishment(store.getState()),
        defaultFormEstablishmentValue(),
      );
    });
    it("should clear establishment", () => {
      const initialEstablishmentState: EstablishmentState = {
        isLoading: true,
        feedback: { kind: "success" },
        formEstablishment,
      };
      ({ store, dependencies } = createTestStore({
        establishment: initialEstablishmentState,
      }));
      expectEstablishmentStateToMatch(initialEstablishmentState);
      store.dispatch(establishmentSlice.actions.establishmentClearRequested());

      expectToEqual(establishmentSelectors.isLoading(store.getState()), false);
      expectToEqual(establishmentSelectors.feedback(store.getState()), {
        kind: "idle",
      });
      expectToEqual(
        establishmentSelectors.formEstablishment(store.getState()),
        defaultFormEstablishmentValue(),
      );
    });
  });

  describe("establishment creation", () => {
    it("should create establishment", () => {
      expectEstablishmentStateToMatch({
        isLoading: false,
        feedback: { kind: "idle" },
        formEstablishment: defaultFormEstablishmentValue(),
      });
      store.dispatch(
        establishmentSlice.actions.establishmentCreationRequested(
          formEstablishment,
        ),
      );
      expectToEqual(establishmentSelectors.isLoading(store.getState()), true);
      dependencies.establishmentGateway.addFormEstablishmentResult$.next(
        undefined,
      );
      expectToEqual(establishmentSelectors.isLoading(store.getState()), false);
      expectToEqual(establishmentSelectors.feedback(store.getState()), {
        kind: "success",
      });
    });
  });

  const expectEstablishmentStateToMatch = (
    expected: Partial<EstablishmentState>,
  ) => expectObjectsToMatch(store.getState().establishment, expected);

  const expectNavigationToEstablishmentFormPageToHaveBeenTriggered = (
    siretOfRoute: SiretDto | null,
  ) => {
    expect(dependencies.navigationGateway.navigatedToEstablishmentForm).toBe(
      siretOfRoute,
    );
  };
});
