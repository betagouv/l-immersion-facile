import axios from "axios";
import {
  addressRoutes,
  adminRoutes,
  agencyRoutes,
  authenticatedConventionRoutes,
  conventionMagicLinkRoutes,
  establishmentLeadRoutes,
  establishmentRoutes,
  formCompletionRoutes,
  inclusionConnectedAllowedRoutes,
  nafRoutes,
  searchImmersionRoutes,
  technicalRoutes,
  unauthenticatedConventionRoutes,
} from "shared";
import { createAxiosSharedClient } from "shared-routes/axios";
import type { UnknownSharedRoute } from "shared-routes/src";
import { createCommonDependencies } from "src/config/createCommonDependencies";
import type { Dependencies } from "src/config/dependencies";
import { HttpAddressGateway } from "src/core-logic/adapters/AddressGateway/HttpAddressGateway";
import { HttpAdminGateway } from "src/core-logic/adapters/AdminGateway/HttpAdminGateway";
import { HttpAgencyGateway } from "src/core-logic/adapters/AgencyGateway/HttpAgencyGateway";
import { HttpAssessmentGateway } from "src/core-logic/adapters/AssessmentGateway/HttpAssessmentGateway";
import { HttpConventionGateway } from "src/core-logic/adapters/Convention/HttpConventionGateway";
import { HttpEstablishmentGateway } from "src/core-logic/adapters/EstablishmentGateway/HttpEstablishmentGateway";
import { HttpEstablishmentLeadGateway } from "src/core-logic/adapters/EstablishmentLeadGateway/HttpEstablishmentLeadGateway";
import { HttpFormCompletionGateway } from "src/core-logic/adapters/FormCompletionGateway/HttpFormCompletionGateway";
import { HttpInclusionConnectedGateway } from "src/core-logic/adapters/InclusionConnected/HttpInclusionConnectedGateway";
import { HttpNafGateway } from "src/core-logic/adapters/NafGateway/HttpNafGateway";
import { HttpSearchGateway } from "src/core-logic/adapters/SearchGateway/HttpSearchGateway";
import { HttpTechnicalGateway } from "src/core-logic/adapters/TechnicalGateway/HttpTechnicalGateway";

const withBaseUrlConfig = { baseURL: "/api" };
const axiosOnSlashApi = axios.create({
  ...withBaseUrlConfig,
  validateStatus: () => true,
});

const createAxiosHttpClientOnSlashApi = <
  SharedRoutes extends Record<string, UnknownSharedRoute>,
>(
  routes: SharedRoutes,
) =>
  createAxiosSharedClient(routes, axiosOnSlashApi, {
    skipResponseValidationForStatuses: [500],
  });

export const createHttpDependencies = (): Dependencies => {
  return {
    ...createCommonDependencies(),
    addressGateway: new HttpAddressGateway(
      createAxiosHttpClientOnSlashApi(addressRoutes),
    ),
    adminGateway: new HttpAdminGateway(
      createAxiosHttpClientOnSlashApi(adminRoutes),
    ),
    agencyGateway: new HttpAgencyGateway(
      createAxiosHttpClientOnSlashApi(agencyRoutes),
    ),
    assessmentGateway: new HttpAssessmentGateway(
      createAxiosHttpClientOnSlashApi(conventionMagicLinkRoutes),
    ),
    conventionGateway: new HttpConventionGateway(
      createAxiosHttpClientOnSlashApi(conventionMagicLinkRoutes),
      createAxiosHttpClientOnSlashApi(unauthenticatedConventionRoutes),
      createAxiosHttpClientOnSlashApi(authenticatedConventionRoutes),
      createAxiosHttpClientOnSlashApi(inclusionConnectedAllowedRoutes),
    ),
    establishmentGateway: new HttpEstablishmentGateway(
      createAxiosHttpClientOnSlashApi(establishmentRoutes),
    ),
    establishmentLeadGateway: new HttpEstablishmentLeadGateway(
      createAxiosHttpClientOnSlashApi(establishmentLeadRoutes),
    ),
    formCompletionGateway: new HttpFormCompletionGateway(
      createAxiosHttpClientOnSlashApi(formCompletionRoutes),
    ),
    inclusionConnectedGateway: new HttpInclusionConnectedGateway(
      createAxiosHttpClientOnSlashApi(inclusionConnectedAllowedRoutes),
    ),
    searchGateway: new HttpSearchGateway(
      createAxiosHttpClientOnSlashApi(searchImmersionRoutes),
    ),
    technicalGateway: new HttpTechnicalGateway(
      createAxiosHttpClientOnSlashApi(technicalRoutes),
      axiosOnSlashApi,
    ),
    nafGateway: new HttpNafGateway(createAxiosHttpClientOnSlashApi(nafRoutes)),
  };
};
