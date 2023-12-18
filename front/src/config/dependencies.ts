import { SchedulerLike } from "rxjs";
import { createHttpDependencies } from "src/config/createHttpDependencies";
import { createInMemoryDependencies } from "src/config/createInMemoryDependencies";
import { ENV } from "src/config/environmentVariables";
import { AddressGateway } from "src/core-logic/ports/AddressGateway";
import { AdminGateway } from "src/core-logic/ports/AdminGateway";
import { AgencyGateway } from "src/core-logic/ports/AgencyGateway";
import { AssessmentGateway } from "src/core-logic/ports/AssessmentGateway";
import { ConventionGateway } from "src/core-logic/ports/ConventionGateway";
import { DeviceRepository } from "src/core-logic/ports/DeviceRepository";
import { EstablishmentGateway } from "src/core-logic/ports/EstablishmentGateway";
import { FormCompletionGateway } from "src/core-logic/ports/FormCompletionGateway";
import { InclusionConnectedGateway } from "src/core-logic/ports/InclusionConnectedGateway";
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
  conventionGateway: ConventionGateway;
  searchGateway: SearchGateway;
  inclusionConnectedGateway: InclusionConnectedGateway;
  navigationGateway: NavigationGateway;
  deviceRepository: DeviceRepository;
  minSearchResultsToPreventRefetch: number;
  scheduler: SchedulerLike;
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
  agencyGateway,
  deviceRepository,
  technicalGateway,
  formCompletionGateway,
} = dependencies;

export const outOfReduxDependencies = {
  addressGateway,
  conventionGateway,
  searchGateway,
  agencyGateway,
  deviceRepository,
  technicalGateway,
  formCompletionGateway,
};

export const store = createStore({
  dependencies,
});
