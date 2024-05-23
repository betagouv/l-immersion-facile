import { z } from "zod";
import { agencyIdSchema } from "../agency/agency.schema";
import { conventionIdSchema } from "../convention/convention.schema";
import {
  agencyRoleSchema,
  userIdSchema,
} from "../inclusionConnectedAllowed/inclusionConnectedAllowed.schema";
import { siretSchema } from "../siret/siret.schema";
import { zTrimmedString } from "../zodUtils";
import {
  IcUserRoleForAgencyParams,
  ManageConventionAdminForm,
  ManageEstablishmentAdminForm,
  RejectIcUserRoleForAgencyParams,
  WithAgencyRole,
} from "./admin.dto";

export const icUserRoleForAgencyParamsSchema: z.Schema<IcUserRoleForAgencyParams> =
  z.object({
    agencyId: agencyIdSchema,
    userId: userIdSchema,
    roles: z.array(agencyRoleSchema),
  });

export const rejectIcUserRoleForAgencyParamsSchema: z.Schema<RejectIcUserRoleForAgencyParams> =
  z.object({
    agencyId: agencyIdSchema,
    userId: userIdSchema,
    justification: zTrimmedString,
  });

export const withAgencyRoleSchema: z.Schema<WithAgencyRole> = z.object({
  agencyRole: agencyRoleSchema,
});

export const manageConventionAdminFormSchema: z.Schema<ManageConventionAdminForm> =
  z.object({
    conventionId: conventionIdSchema,
  });

export const manageEstablishmentAdminFormSchema: z.Schema<ManageEstablishmentAdminForm> =
  z.object({
    siret: siretSchema,
  });
