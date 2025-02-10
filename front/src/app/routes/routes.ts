import {
  AdminTabRouteName,
  AuthenticatedUserQueryParams,
  ValueOf,
  adminTabRouteNames,
  adminTabs,
  frontRoutes,
} from "shared";
import { icUserEstablishmentDashboardTabSerializer } from "src/app/routes/routeParams/establishmentDashboardTabs";
import { ValueSerializer, createRouter, defineRoute, param } from "type-route";
import {
  appellationAndRomeDtoArraySerializer,
  appellationStringSerializer,
  conventionValuesFromUrl,
} from "./routeParams/convention";
import { formEstablishmentParamsInUrl } from "./routeParams/formEstablishment";
import { standardPagesSerializer } from "./routeParams/standardPage";

const createInclusionConnectedParams = <
  T extends Record<keyof AuthenticatedUserQueryParams, unknown>,
>(
  t: T,
) => t;

export type AcquisitionParams = Partial<{
  [K in AcquisitionParamsKeys]: (typeof acquisitionParams)[K]["~internal"]["valueSerializer"] extends ValueSerializer<
    infer T
  >
    ? T
    : never;
}>;

type AcquisitionParamsKeys = keyof typeof acquisitionParams;

const inclusionConnectedParams = createInclusionConnectedParams({
  siret: param.query.optional.string,
  page: param.query.optional.string,
  token: param.query.optional.string,
  firstName: param.query.optional.string,
  lastName: param.query.optional.string,
  email: param.query.optional.string,
  idToken: param.query.optional.string,
});

export const acquisitionParams = {
  mtm_campaign: param.query.optional.string,
  mtm_kwd: param.query.optional.string,
};

export const conventionParams = {
  ...conventionValuesFromUrl,
  discussionId: param.query.optional.string,
  ...acquisitionParams,
};

export const conventionForExternalParams = {
  ...conventionParams,
  consumer: param.path.string,
  jwt: param.query.optional.string,
};

export const establishmentParams = {
  ...formEstablishmentParamsInUrl,
  ...acquisitionParams,
};

export const searchParams = {
  distanceKm: param.query.optional.number,
  latitude: param.query.optional.number,
  longitude: param.query.optional.number,
  appellations: param.query.optional.ofType(
    appellationAndRomeDtoArraySerializer,
  ),
  sortedBy: param.query.optional.string,
  place: param.query.optional.string,
  fitForDisabledWorkers: param.query.optional.boolean,
  currentPage: param.query.optional.number,
  ...acquisitionParams,
};

export type FrontRouteUnion = ValueOf<typeof routes>;
export type FrontRouteKeys = keyof typeof routes;

const admin = defineRoute(
  inclusionConnectedParams,
  () => `/${frontRoutes.admin}`,
);

const agencyDashboard = defineRoute(inclusionConnectedParams, () => [
  `/${frontRoutes.agencyDashboard}`,
  "/agence-dashboard", //legacy route redirect to frontRoutes.agencyDashboard
]);

const myProfile = defineRoute(
  inclusionConnectedParams,
  () => `/${frontRoutes.profile}`,
);

const agencyDashboardAgencies = agencyDashboard.extend("/agences");

const { adminConventions, adminAgencies, adminUsers, ...restOfAdminRoutes } =
  adminTabRouteNames.reduce(
    (acc, adminTabName) => ({
      ...acc,
      [adminTabName]: admin.extend(`/${adminTabs[adminTabName].slug}`),
    }),
    {} as Record<AdminTabRouteName, typeof admin>,
  );

export const { RouteProvider, useRoute, routes } = createRouter({
  addAgency: defineRoute(`/${frontRoutes.addAgency}`),

  admin,
  ...restOfAdminRoutes,
  adminConventions,
  adminConventionDetail: adminConventions.extend(
    { conventionId: param.path.string },
    ({ conventionId }) => `/${conventionId}`,
  ),
  adminUsers,
  adminUserDetail: adminUsers.extend(
    { userId: param.path.string },
    ({ userId }) => `/${userId}`,
  ),
  adminAgencies,
  adminAgencyDetail: adminAgencies.extend(
    { agencyId: param.path.string },
    ({ agencyId }) => `/${agencyId}`,
  ),
  agencyDashboard,
  agencyDashboardMain: agencyDashboard.extend("/dashboard"),
  agencyDashboardOnboarding: agencyDashboard.extend("/onboarding"),
  agencyDashboardSynchronisedConventions: agencyDashboard.extend(
    "/conventions-synchronisees",
  ),
  myProfile,
  myProfileAgencyRegistration: myProfile.extend("/agency-registration"),
  agencyDashboardAgencies: agencyDashboardAgencies,
  agencyDashboardAgencyDetails: agencyDashboardAgencies.extend(
    { agencyId: param.path.string },
    ({ agencyId }) => `/${agencyId}`,
  ),
  beneficiaryDashboard: defineRoute(`/${frontRoutes.beneficiaryDashboard}`),
  conventionConfirmation: defineRoute(
    {
      conventionId: param.path.string,
    },
    ({ conventionId }) =>
      `/${frontRoutes.conventionImmersionRoute}/confirmation/${conventionId}`,
  ),
  conventionDocument: defineRoute(
    {
      jwt: param.query.optional.string,
      conventionId: param.query.optional.string,
    },
    () => `/${frontRoutes.conventionDocument}`,
  ),
  initiateConvention: defineRoute(
    {
      ...acquisitionParams,
      skipFirstStep: param.query.optional.boolean,
    },
    () => `/${frontRoutes.initiateConvention}`,
  ),
  conventionImmersion: defineRoute(
    {
      jwt: param.query.optional.string,
      ...conventionParams,
    },
    () => `/${frontRoutes.conventionImmersionRoute}`,
  ),
  conventionImmersionForExternals: defineRoute(
    conventionForExternalParams,
    (params) => `/${frontRoutes.conventionImmersionRoute}/${params.consumer}`,
  ),
  conventionMiniStage: defineRoute(
    { jwt: param.query.optional.string, ...conventionValuesFromUrl },
    () => `/${frontRoutes.conventionMiniStageRoute}`,
  ),
  conventionStatusDashboard: defineRoute(
    { jwt: param.query.string },
    () => `/${frontRoutes.conventionStatusDashboard}`,
  ),
  conventionToSign: defineRoute(
    { jwt: param.query.string },
    () => `/${frontRoutes.conventionToSign}`,
  ),
  //TODO: Why this route still exist?
  debugPopulateDB: defineRoute(
    { count: param.path.number },
    (params) => `/debug/populate/${params.count}`,
  ),
  editFormEstablishment: defineRoute(
    { jwt: param.query.string },
    () => `/${frontRoutes.editFormEstablishmentRoute}`,
  ),
  establishmentDashboard: defineRoute(
    {
      ...inclusionConnectedParams,
      tab: param.path.optional
        .ofType(icUserEstablishmentDashboardTabSerializer)
        .default("conventions"),
      siret: param.query.optional.string,
      discussionId: param.query.optional.string,
      shouldUpdateAvailability: param.query.optional.string,
    },
    ({ tab }) => `/${frontRoutes.establishmentDashboard}/${tab}`,
  ),
  errorRedirect: defineRoute(
    {
      title: param.query.optional.string,
      message: param.query.optional.string,
      kind: param.query.optional.string,
    },
    () => `/${frontRoutes.error}`,
  ),
  formEstablishment: defineRoute(
    {
      ...inclusionConnectedParams,
      ...establishmentParams,
    },
    () => `/${frontRoutes.establishment}`,
  ),
  formEstablishmentForExternals: defineRoute(
    {
      ...establishmentParams,
      consumer: param.path.string,
    },
    (params) => `/etablissement/${params.consumer}`,
  ),
  unregisterEstablishmentLead: defineRoute(
    {
      jwt: param.query.string,
    },
    () => `/${frontRoutes.unsubscribeEstablishmentLead}`,
  ),
  group: defineRoute(
    { groupSlug: param.path.string },
    (params) => `/${frontRoutes.group}/${params.groupSlug}`,
  ),
  home: defineRoute("/"),
  homeAgencies: defineRoute(`/${frontRoutes.homeAgencies}`),
  homeCandidates: defineRoute(`/${frontRoutes.homeCandidates}`),
  homeEstablishments: defineRoute([
    `/${frontRoutes.homeEstablishments}`,
    `/${frontRoutes.landingEstablishment}`,
  ]),
  assessment: defineRoute(
    { jwt: param.query.string },
    () => `/${frontRoutes.assessment}`,
  ),
  searchResult: defineRoute(
    {
      appellationCode: param.query.ofType(appellationStringSerializer),
      siret: param.query.string,
      location: param.query.optional.string,
      contactFirstName: param.query.optional.string,
      contactLastName: param.query.optional.string,
      contactEmail: param.query.optional.string,
      contactPhone: param.query.optional.string,
      contactMessage: param.query.optional.string,
    },
    () => `/${frontRoutes.offer}`,
  ),
  searchResultExternal: defineRoute(
    {
      siret: param.query.string,
      appellationCode: param.query.ofType(appellationStringSerializer),
    },
    () => `/${frontRoutes.offerExternal}`,
  ),
  manageConvention: defineRoute(
    { jwt: param.query.string },
    () => `/${frontRoutes.manageConvention}`,
  ),
  manageConventionInclusionConnected: defineRoute(
    { conventionId: param.query.string },
    () => `/${frontRoutes.manageConventionInclusionConnected}`,
  ),
  manageDiscussion: defineRoute(
    { discussionId: param.query.string },
    () => `/${frontRoutes.manageDiscussion}`,
  ),
  manageEstablishmentAdmin: defineRoute(
    { siret: param.query.string },
    () => `/${frontRoutes.manageEstablishmentAdmin}`,
  ),
  openApiDoc: defineRoute("/doc-api"),
  renewConventionMagicLink: defineRoute(
    { expiredJwt: param.query.string, originalURL: param.query.string },
    () => `/${frontRoutes.magicLinkRenewal}`,
  ),
  search: defineRoute(searchParams, () => `/${frontRoutes.search}`),
  searchDiagoriente: defineRoute(
    searchParams,
    () => `/${frontRoutes.searchDiagoriente}`,
  ),
  standard: defineRoute(
    { pagePath: param.path.ofType(standardPagesSerializer) },
    (params) => `/${frontRoutes.standard}/${params.pagePath}`,
  ),
  stats: defineRoute("/stats"),
});
