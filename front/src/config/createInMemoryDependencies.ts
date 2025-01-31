import { FormEstablishmentDtoBuilder } from "shared";
import { createCommonDependencies } from "src/config/createCommonDependencies";
import type { Dependencies } from "src/config/dependencies";
import { InMemoryAddressGateway } from "src/core-logic/adapters/AddressGateway/InMemoryAddressGateway";
import { SimulatedAdminGateway } from "src/core-logic/adapters/AdminGateway/SimulatedAdminGateway";
import { SimulatedAgencyGateway } from "src/core-logic/adapters/AgencyGateway/SimulatedAgencyGateway";
import { SimulatedAssessmentGateway } from "src/core-logic/adapters/AssessmentGateway/SimulatedAssessmentGateway";
import { InMemoryConventionGateway } from "src/core-logic/adapters/Convention/InMemoryConventionGateway";
import { SimulatedEstablishmentGateway } from "src/core-logic/adapters/EstablishmentGateway/SimulatedEstablishmentGateway";
import { SimulatedEstablishmentLeadGateway } from "src/core-logic/adapters/EstablishmentLeadGateway/SimulatedEstablishmentLeadGateway";
import { SimulatedFormCompletionGateway } from "src/core-logic/adapters/FormCompletionGateway/SimulatedFormCompletionGateway";
import { seedRomeDtos } from "src/core-logic/adapters/FormCompletionGateway/TestFormCompletionGateway";
import { SimulatedInclusionConnectedGateway } from "src/core-logic/adapters/InclusionConnected/SimulatedInclusionConnectedGateway";
import { SimulatedNafGateway } from "src/core-logic/adapters/NafGateway/SimulatedNafGateway";
import { SimulatedSearchGateway } from "src/core-logic/adapters/SearchGateway/SimulatedSearchGateway";
import { seedSearchResults } from "src/core-logic/adapters/SearchGateway/simulatedSearchData";
import { SimulatedTechnicalGateway } from "src/core-logic/adapters/TechnicalGateway/SimulatedTechnicalGateway";

const SIMULATED_LATENCY_MS = 400;

export const createInMemoryDependencies = (): Dependencies => ({
  addressGateway: new InMemoryAddressGateway(SIMULATED_LATENCY_MS),
  adminGateway: new SimulatedAdminGateway(),
  agencyGateway: new SimulatedAgencyGateway(),
  conventionGateway: new InMemoryConventionGateway(SIMULATED_LATENCY_MS),
  establishmentGateway: new SimulatedEstablishmentGateway([
    FormEstablishmentDtoBuilder.valid()
      .withSiret("12345678901236")
      .withFitForDisabledWorkers(false)
      .build(),
  ]),
  establishmentLeadGateway: new SimulatedEstablishmentLeadGateway(),
  assessmentGateway: new SimulatedAssessmentGateway(),
  searchGateway: new SimulatedSearchGateway(
    seedSearchResults,
    SIMULATED_LATENCY_MS,
  ),
  formCompletionGateway: new SimulatedFormCompletionGateway(
    SIMULATED_LATENCY_MS,
    {
      12345678901238: {
        siret: "12345678901238",
        businessName: "Entreprise 38",
        businessAddress: "",
        isOpen: true,
      },
      12345678901239: {
        siret: "12345678901239",
        businessName: "Entreprise 39",
        businessAddress: "",
        isOpen: false,
      },
      12345678901236: {
        siret: "12345678901236",
        businessName:
          "Open Business on SIRENE but not registered on Immersion Facile",
        businessAddress: "5 Rue du Chevalier de Saint-George, 75008 Paris",
        isOpen: true,
      },
    },
    seedRomeDtos,
  ),
  technicalGateway: new SimulatedTechnicalGateway(),
  inclusionConnectedGateway: new SimulatedInclusionConnectedGateway(),
  nafGateway: new SimulatedNafGateway(SIMULATED_LATENCY_MS),
  ...createCommonDependencies(),
});
