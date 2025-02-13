import { AbsoluteUrl } from "../AbsoluteUrl";
import {
  AgencyDtoForAgencyUsersAndAdmins,
  AgencyId,
} from "../agency/agency.dto";
import { DiscussionId } from "../discussion/discussion.dto";
import { Email } from "../email/email.dto";
import { WithSourcePage } from "../inclusionConnect/inclusionConnect.dto";
import {
  ConventionEstablishmentRole,
  EstablishmentRole,
} from "../role/role.dto";
import { SiretDto } from "../siret/siret";
import { Flavor } from "../typeFlavors";
import { DateTimeIsoString } from "../utils/date";

export type AgencyRole = (typeof allAgencyRoles)[number];
export const allAgencyRoles = [
  "counsellor",
  "validator",
  "agency-admin",
  "to-review",
  "agency-viewer",
] as const;

export type AgencyRight = {
  agency: AgencyDtoForAgencyUsersAndAdmins;
  roles: AgencyRole[];
  isNotifiedByEmail: boolean;
};

export type UserId = Flavor<string, "UserId">;
export type ExternalId = Flavor<string, "ExternalId">;

export type User = {
  id: UserId;
  email: Email;
  firstName: string;
  lastName: string;
  externalId: ExternalId | null;
  createdAt: DateTimeIsoString;
};

export type UserWithAdminRights = User & WithIsBackOfficeAdmin;

export type UserInList = User & {
  numberOfAgencies: number;
};

type WithAgencyRights = {
  agencyRights: AgencyRight[];
};

export type WithEstablishmentData = {
  siret: SiretDto;
  businessName: string;
  role: EstablishmentRole;
  admins: { firstName: string; lastName: string; email: Email }[];
};

export type WithEstablishments = {
  establishments?: WithEstablishmentData[];
};

export type ConventionsEstablishmentDashboard = {
  url: AbsoluteUrl;
  role: ConventionEstablishmentRole;
};
export type WithDiscussionId = {
  discussionId: DiscussionId;
};

export type EstablishmentDashboards = {
  conventions?: ConventionsEstablishmentDashboard;
  discussions?: AbsoluteUrl;
};

export type WithEstablishmentDashboards = {
  establishments: EstablishmentDashboards;
};

export type AgencyDashboards = {
  agencyDashboardUrl?: AbsoluteUrl;
  erroredConventionsDashboardUrl?: AbsoluteUrl;
};

export type WithAgencyDashboards = {
  agencies: AgencyDashboards;
};

export type WithDashboards = {
  dashboards: WithAgencyDashboards & WithEstablishmentDashboards;
};

export type UserWithAgencyRights = User & WithAgencyRights;

export type WithIsBackOfficeAdmin = {
  isBackofficeAdmin?: boolean;
};

export type UserWithRights = UserWithAgencyRights &
  WithEstablishments &
  WithIsBackOfficeAdmin;

export type InclusionConnectedUser = UserWithRights & WithDashboards;

export type WithOptionalUserId = {
  userId?: UserId;
};

export type WithAgencyIds = {
  agencies: AgencyId[];
};

export type GetInclusionConnectLogoutUrlQueryParams = WithSourcePage;
