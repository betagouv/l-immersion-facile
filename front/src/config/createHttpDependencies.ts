import {
  addressTargets,
  adminRoutes,
  agencyRoutes,
  conventionMagicLinkRoutes,
  createManagedAxiosInstance,
  establishmentTargets,
  inclusionConnectedAllowedTargets,
  openApiDocTargets,
  searchImmersionRoutes,
  siretTargets,
  technicalRoutes,
  unauthenticatedConventionRoutes,
  validateEmailsTargets,
} from "shared";
import { createAxiosSharedClient } from "shared-routes/axios";
import { configureHttpClient, createAxiosHandlerCreator } from "http-client";
import { createCommonDependencies } from "src/config/createCommonDependencies";
import type { Dependencies } from "src/config/dependencies";
import { HttpAddressGateway } from "src/core-logic/adapters/AddressGateway/HttpAddressGateway";
import { HttpAdminGateway } from "src/core-logic/adapters/AdminGateway/HttpAdminGateway";
import { HttpAgencyGateway } from "src/core-logic/adapters/AgencyGateway/HttpAgencyGateway";
import { HttpImmersionAssessmentGateway } from "src/core-logic/adapters/AssessmentGateway/HttpImmersionAssessmentGateway";
import { HttpConventionGateway } from "src/core-logic/adapters/Convention/HttpConventionGateway";
import { HttpEmailValidationGateway } from "src/core-logic/adapters/EmailValidation/HttpEmailValidationGateway";
import { HttpEstablishmentGateway } from "src/core-logic/adapters/EstablishmentGateway/HttpEstablishmentGateway";
import { HttpInclusionConnectedGateway } from "src/core-logic/adapters/InclusionConnected/HttpInclusionConnectedGateway";
import { HttpOpenApiDocGateway } from "src/core-logic/adapters/OpenApiDocGateway/HttpOpenApiDocGateway";
import { HttpRomeAutocompleteGateway } from "src/core-logic/adapters/RomeAutocompleteGateway/HttpRomeAutocompleteGateway";
import { HttpSearchGateway } from "src/core-logic/adapters/SearchGateway/HttpSearchGateway";
import { HttpSiretGatewayThroughBack } from "src/core-logic/adapters/SiretGatewayThroughBack/HttpSiretGatewayThroughBack";
import { HttpTechnicalGateway } from "src/core-logic/adapters/TechnicalGateway/HttpTechnicalGateway";

export const createHttpDependencies = (): Dependencies => {
  const axiosOnSlashApi = createManagedAxiosInstance({ baseURL: "/api" });
  const handlerCreator = createAxiosHandlerCreator(axiosOnSlashApi);
  const createHttpClient = configureHttpClient(handlerCreator);

  return {
    addressGateway: new HttpAddressGateway(createHttpClient(addressTargets)),
    adminGateway: new HttpAdminGateway(
      createAxiosSharedClient(adminRoutes, axiosOnSlashApi),
    ),
    agencyGateway: new HttpAgencyGateway(
      createAxiosSharedClient(agencyRoutes, axiosOnSlashApi),
    ),
    inclusionConnectedGateway: new HttpInclusionConnectedGateway(
      createHttpClient(inclusionConnectedAllowedTargets),
    ),
    establishmentGateway: new HttpEstablishmentGateway(
      createHttpClient(establishmentTargets),
    ),
    conventionGateway: new HttpConventionGateway(
      createAxiosSharedClient(conventionMagicLinkRoutes, axiosOnSlashApi),
      createAxiosSharedClient(unauthenticatedConventionRoutes, axiosOnSlashApi),
    ),
    immersionAssessmentGateway: new HttpImmersionAssessmentGateway(
      axiosOnSlashApi,
    ),
    searchGateway: new HttpSearchGateway(
      createAxiosSharedClient(searchImmersionRoutes, axiosOnSlashApi),
    ),
    romeAutocompleteGateway: new HttpRomeAutocompleteGateway(axiosOnSlashApi),
    siretGatewayThroughBack: new HttpSiretGatewayThroughBack(
      createHttpClient(siretTargets),
    ),
    technicalGateway: new HttpTechnicalGateway(
      createAxiosSharedClient(technicalRoutes, axiosOnSlashApi),
      axiosOnSlashApi,
    ),
    emailValidationGateway: new HttpEmailValidationGateway(
      createHttpClient(validateEmailsTargets),
    ),
    openApiDocGateway: new HttpOpenApiDocGateway(
      createHttpClient(openApiDocTargets),
    ),
    ...createCommonDependencies(),
  };
};
