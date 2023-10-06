import { VirtualTimeScheduler } from "rxjs";
import { Dependencies } from "src/config/dependencies";
import { TestAdminGateway } from "src/core-logic/adapters/AdminGateway/TestAdminGateway";
import { InMemoryConventionGateway } from "src/core-logic/adapters/Convention/InMemoryConventionGateway";
import { createTestDeviceRepository } from "src/core-logic/adapters/DeviceRepository/createTestDeviceRepository";
import { TestInclusionConnectedGateway } from "src/core-logic/adapters/InclusionConnected/TestInclusionConnectedGateway";
import { InMemoryNavigationGateway } from "src/core-logic/adapters/NavigationGateway/InMemoryNavigationGateway";
import { InMemoryRomeAutocompleteGateway } from "src/core-logic/adapters/RomeAutocompleteGateway/InMemoryRomeAutocompleteGateway";
import { TestTechnicalGateway } from "src/core-logic/adapters/TechnicalGateway/TestTechnicalGateway";
import { createStore, RootState } from "src/core-logic/storeConfig/store";
import { TestAddressGateway } from "../adapters/AddressGateway/TestAddressGateway";
import { TestAgencyGateway } from "../adapters/AgencyGateway/TestAgencyGateway";
import { TestImmersionAssessmentGateway } from "../adapters/AssessmentGateway/TestImmersionAssessmentGateway";
import { TestEstablishmentGateway } from "../adapters/EstablishmentGateway/TestEstablishmentGateway";
import { TestSearchGateway } from "../adapters/SearchGateway/TestSearchGateway";
import { TestSiretGatewayThroughBack } from "../adapters/SiretGatewayThroughBack/TestSiretGatewayThroughBack";

export type TestDependencies = ReturnType<typeof createTestDependencies>;

const createTestDependencies = () =>
  ({
    adminGateway: new TestAdminGateway(),
    immersionAssessmentGateway: new TestImmersionAssessmentGateway(),
    siretGatewayThroughBack: new TestSiretGatewayThroughBack(),
    searchGateway: new TestSearchGateway(),
    establishmentGateway: new TestEstablishmentGateway(),
    conventionGateway: new InMemoryConventionGateway(),
    addressGateway: new TestAddressGateway(),
    technicalGateway: new TestTechnicalGateway(),
    agencyGateway: new TestAgencyGateway(),
    romeAutocompleteGateway: new InMemoryRomeAutocompleteGateway(),
    inclusionConnectedGateway: new TestInclusionConnectedGateway(),
    deviceRepository: createTestDeviceRepository(),
    navigationGateway: new InMemoryNavigationGateway(),
    scheduler: new VirtualTimeScheduler(),
    minSearchResultsToPreventRefetch: 2,
  } satisfies Dependencies);

export const createTestStore = (preloadedState?: Partial<RootState>) => {
  const dependencies = createTestDependencies();
  return { store: createStore({ dependencies, preloadedState }), dependencies };
};

export type StoreAndDeps = ReturnType<typeof createTestStore>;
