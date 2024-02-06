import {
  agencyModifierRoles,
  allRoles,
  allSignatoryRoles,
  conventionSchema,
  zTrimmedString,
} from "shared";
import { z } from "zod";
import {
  AgencyActorRequestModificationPayload,
  ConventionRequiresModificationPayload,
  SignatoryRequestModificationPayload,
} from "./eventPayload.dto";

const agencyActorRequestConventionModificationPayloadSchema: z.Schema<AgencyActorRequestModificationPayload> =
  z.object({
    convention: conventionSchema,
    justification: zTrimmedString,
    requesterRole: z.enum(allRoles),
    modifierRole: z.enum(agencyModifierRoles),
    agencyActorEmail: zTrimmedString,
  });

const signatoryRequestConventionModificationPayloadSchema: z.Schema<SignatoryRequestModificationPayload> =
  z.object({
    convention: conventionSchema,
    justification: zTrimmedString,
    requesterRole: z.enum(allRoles),
    modifierRole: z.enum(allSignatoryRoles),
  });

export const conventionRequiresModificationPayloadSchema: z.Schema<ConventionRequiresModificationPayload> =
  z.union([
    agencyActorRequestConventionModificationPayloadSchema,
    signatoryRequestConventionModificationPayloadSchema,
  ]);
