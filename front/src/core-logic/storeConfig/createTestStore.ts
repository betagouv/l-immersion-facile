import { VirtualTimeScheduler } from "rxjs";
import { Dependencies } from "src/config/dependencies";
import { TestAdminGateway } from "src/core-logic/adapters/AdminGateway/TestAdminGateway";
import { InMemoryConventionGateway } from "src/core-logic/adapters/Convention/InMemoryConventionGateway";
import { createTestDeviceRepository } from "src/core-logic/adapters/DeviceRepository/createTestDeviceRepository";
import { TestEstablishmentLeadGateway } from "src/core-logic/adapters/EstablishmentLeadGateway/TestEstablishmentLeadGateway";
import { TestInclusionConnectedGateway } from "src/core-logic/adapters/InclusionConnected/TestInclusionConnectedGateway";
import { TestNafGateway } from "src/core-logic/adapters/NafGateway/TestNafGateway";
import { InMemoryNavigationGateway } from "src/core-logic/adapters/NavigationGateway/InMemoryNavigationGateway";
import { TestTechnicalGateway } from "src/core-logic/adapters/TechnicalGateway/TestTechnicalGateway";
import { RootState, createStore } from "src/core-logic/storeConfig/store";
import { TestAddressGateway } from "../adapters/AddressGateway/TestAddressGateway";
import { TestAgencyGateway } from "../adapters/AgencyGateway/TestAgencyGateway";
import { TestAssessmentGateway } from "../adapters/AssessmentGateway/TestAssessmentGateway";
import { TestEstablishmentGateway } from "../adapters/EstablishmentGateway/TestEstablishmentGateway";
import { TestFormCompletionGateway } from "../adapters/FormCompletionGateway/TestFormCompletionGateway";
import { TestSearchGateway } from "../adapters/SearchGateway/TestSearchGateway";

export type TestDependencies = ReturnType<typeof createTestDependencies>;

const createTestDependencies = () =>
  ({
    addressGateway: new TestAddressGateway(),
    adminGateway: new TestAdminGateway(),
    agencyGateway: new TestAgencyGateway(),
    assessmentGateway: new TestAssessmentGateway(),
    conventionGateway: new InMemoryConventionGateway(),
    localDeviceRepository: createTestDeviceRepository(),
    sessionDeviceRepository: createTestDeviceRepository(),
    establishmentGateway: new TestEstablishmentGateway(),
    establishmentLeadGateway: new TestEstablishmentLeadGateway(),
    formCompletionGateway: new TestFormCompletionGateway(),
    inclusionConnectedGateway: new TestInclusionConnectedGateway(),
    minSearchResultsToPreventRefetch: 2,
    navigationGateway: new InMemoryNavigationGateway(),
    scheduler: new VirtualTimeScheduler(),
    searchGateway: new TestSearchGateway(),
    technicalGateway: new TestTechnicalGateway(),
    nafGateway: new TestNafGateway(),
  }) satisfies Dependencies;

export const createTestStore = (preloadedState?: Partial<RootState>) => {
  const dependencies = createTestDependencies();
  return { store: createStore({ dependencies, preloadedState }), dependencies };
};
