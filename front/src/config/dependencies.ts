import { SchedulerLike } from "rxjs";
import { createHttpDependencies } from "src/config/createHttpDependencies";
import { createInMemoryDependencies } from "src/config/createInMemoryDependencies";
import { ENV } from "src/config/environmentVariables";
import { AddressGateway } from "src/core-logic/ports/AddressGateway";
import { AdminGateway } from "src/core-logic/ports/AdminGateway";
import { AgencyGateway } from "src/core-logic/ports/AgencyGateway";
import { AssessmentGateway } from "src/core-logic/ports/AssessmentGateway";
import { ConventionGateway } from "src/core-logic/ports/ConventionGateway";
import {
  DeviceRepository,
  LocalStoragePair,
  SessionStoragePair,
} from "src/core-logic/ports/DeviceRepository";
import { EstablishmentGateway } from "src/core-logic/ports/EstablishmentGateway";
import { EstablishmentLeadGateway } from "src/core-logic/ports/EstablishmentLeadGateway";
import { FormCompletionGateway } from "src/core-logic/ports/FormCompletionGateway";
import { InclusionConnectedGateway } from "src/core-logic/ports/InclusionConnectedGateway";
import { NafGateway } from "src/core-logic/ports/NafGateway";
import { NavigationGateway } from "src/core-logic/ports/NavigationGateway";
import { SearchGateway } from "src/core-logic/ports/SearchGateway";
import { TechnicalGateway } from "src/core-logic/ports/TechnicalGateway";
import { createStore } from "src/core-logic/storeConfig/store";

export type Dependencies = {
  adminGateway: AdminGateway;
  assessmentGateway: AssessmentGateway;
  formCompletionGateway: FormCompletionGateway;
  agencyGateway: AgencyGateway;
  addressGateway: AddressGateway;
  technicalGateway: TechnicalGateway;
  establishmentGateway: EstablishmentGateway;
  establishmentLeadGateway: EstablishmentLeadGateway;
  conventionGateway: ConventionGateway;
  searchGateway: SearchGateway;
  inclusionConnectedGateway: InclusionConnectedGateway;
  navigationGateway: NavigationGateway;
  localDeviceRepository: DeviceRepository<LocalStoragePair>;
  sessionDeviceRepository: DeviceRepository<SessionStoragePair>;
  minSearchResultsToPreventRefetch: number;
  scheduler: SchedulerLike;
  nafGateway: NafGateway;
};

const dependencies =
  ENV.gateway === "IN_MEMORY"
    ? createInMemoryDependencies()
    : createHttpDependencies();

// these are exported for usages in component, we should try to have less and less (logic should go in redux)
const {
  addressGateway,
  conventionGateway,
  searchGateway,
  localDeviceRepository,
  sessionDeviceRepository,
  technicalGateway,
  formCompletionGateway,
} = dependencies;

export const outOfReduxDependencies = {
  addressGateway,
  conventionGateway,
  searchGateway,
  localDeviceRepository,
  sessionDeviceRepository,
  technicalGateway,
  formCompletionGateway,
};

export const store = createStore({
  dependencies,
});
