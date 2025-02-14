import {
  ActiveOrRejectedStatus,
  AgencyId,
  WithAgencyId,
} from "../agency/agency.dto";
import { ConventionId } from "../convention/convention.dto";
import { Email } from "../email/email.dto";
import {
  AgencyRole,
  UserId,
} from "../inclusionConnectedAllowed/inclusionConnectedAllowed.dto";
import { SiretDto } from "../siret/siret";

export type WithAgencyIdAndUserId = {
  agencyId: AgencyId;
  userId: UserId;
};

export type UserParamsForAgency = WithAgencyIdAndUserId & {
  roles: AgencyRole[];
  isNotifiedByEmail: boolean;
  email: Email;
};

export type RejectIcUserRoleForAgencyParams = WithAgencyIdAndUserId & {
  justification: string;
};

export type WithAgencyRole = {
  agencyRole: AgencyRole;
};

export type WithUserFilters = WithAgencyId | WithAgencyRole;
export const isWithAgencyRole = (
  filter: WithUserFilters,
): filter is WithAgencyRole => "agencyRole" in filter;

export const isWithAgencyId = (
  filter: WithUserFilters,
): filter is WithAgencyId => "agencyId" in filter;

export type ManageConventionAdminForm = {
  conventionId: ConventionId;
};

export type ManageEstablishmentAdminForm = {
  siret: SiretDto;
};

export type UpdateAgencyStatusParams = {
  id: AgencyId;
} & UpdateAgencyStatusParamsWithoutId;

export type UpdateAgencyStatusParamsWithoutId =
  | {
      status: Extract<ActiveOrRejectedStatus, "active">;
    }
  | {
      status: Extract<ActiveOrRejectedStatus, "rejected">;
      rejectionJustification: string;
    };

export type GetUsersFilters = {
  emailContains: string;
};
