import { z } from "zod";
import { absoluteUrlSchema } from "../AbsoluteUrl";
import { addressSchema } from "../address/address.schema";
import { emailSchema } from "../email/email.schema";
import { geoPositionSchema } from "../geoPosition/geoPosition.schema";
import { siretSchema } from "../siret/siret.schema";
import {
  localization,
  zEnumValidation,
  zSchemaForType,
  zStringMinLength1,
  zStringPossiblyEmpty,
  zTrimmedString,
} from "../zodUtils";
import {
  AgencyDto,
  AgencyId,
  AgencyIdResponse,
  AgencyKind,
  agencyKindList,
  AgencyOption,
  AgencyPublicDisplayDto,
  AgencyPublicDisplayDtoWithoutRefersToAgency,
  allAgencyStatuses,
  CreateAgencyDto,
  ListAgenciesRequestDto,
  PrivateListAgenciesRequestDto,
  UpdateAgencyRequestDto,
  WithActiveOrRejectedStatus,
  WithAgencyId,
  WithAgencyStatus,
} from "./agency.dto";

export const agencyIdSchema: z.ZodSchema<AgencyId> = zTrimmedString;
export const refersToAgencyIdSchema: z.ZodSchema<AgencyId> = z.string();
export const agencyIdsSchema: z.Schema<AgencyId[]> = z
  .array(agencyIdSchema)
  .nonempty();

export const withAgencyIdSchema = zSchemaForType<WithAgencyId>()(
  z.object({
    agencyId: agencyIdSchema,
  }),
);

export const agencyIdResponseSchema: z.ZodSchema<AgencyIdResponse> =
  agencyIdSchema.optional();

export const agencyKindSchema: z.ZodSchema<AgencyKind> = zEnumValidation(
  agencyKindList,
  "Ce type de structure n'est pas supporté",
);

export const agencyIdAndNameSchema: z.ZodSchema<AgencyOption> = z.object({
  id: agencyIdSchema,
  name: z.string(),
  kind: agencyKindSchema,
});

export const agenciesIdAndNameSchema: z.ZodSchema<AgencyOption[]> = z.array(
  agencyIdAndNameSchema,
);

export const listAgenciesRequestSchema: z.ZodSchema<ListAgenciesRequestDto> =
  z.object({
    departmentCode: z.string().optional(),
    nameIncludes: z.string().optional(),
    kind: z
      .enum([
        "immersionPeOnly",
        "immersionWithoutPe",
        "miniStageOnly",
        "miniStageExcluded",
      ])
      .optional(),
  });

const commonAgencyShape = {
  id: agencyIdSchema,
  name: zStringMinLength1,
  kind: agencyKindSchema,
  address: addressSchema,
  position: geoPositionSchema,
  counsellorEmails: z.array(emailSchema),
  validatorEmails: z.array(emailSchema).refine((emails) => emails.length > 0, {
    message: localization.atLeastOneEmail,
  }),
  questionnaireUrl: z.string().optional(),
  signature: zStringMinLength1,
  logoUrl: absoluteUrlSchema.optional(),
  agencySiret: siretSchema,
};

const agencyPublicDisplayDtoWithoutRefersToAgencySchema: z.Schema<AgencyPublicDisplayDtoWithoutRefersToAgency> =
  z.object({
    id: agencyIdSchema,
    name: zStringMinLength1,
    kind: agencyKindSchema,
    address: addressSchema,
    position: geoPositionSchema,
    signature: zStringMinLength1,
  });

export const createAgencySchema: z.ZodSchema<CreateAgencyDto> = z
  .object(commonAgencyShape)
  .and(
    z.object({
      refersToAgencyId: refersToAgencyIdSchema.optional(),
    }),
  );

const agencyStatusSchema = z.enum(allAgencyStatuses);

export const editAgencySchema: z.ZodSchema<AgencyDto> = createAgencySchema.and(
  z.object({
    questionnaireUrl: z.string(),
    status: agencyStatusSchema,
    adminEmails: z.array(zStringMinLength1),
    codeSafir: zStringPossiblyEmpty,
  }),
);

export const agencySchema: z.ZodSchema<AgencyDto> = z
  .object(commonAgencyShape)
  .merge(
    z.object({
      agencySiret: siretSchema.optional().or(z.literal("")),
    }),
  )
  .and(
    z.object({
      questionnaireUrl: z.string(),
      status: agencyStatusSchema,
      adminEmails: z.array(zStringMinLength1),
      codeSafir: zStringPossiblyEmpty,
      refersToAgency:
        agencyPublicDisplayDtoWithoutRefersToAgencySchema.optional(),
    }),
  );

export const privateListAgenciesRequestSchema: z.ZodSchema<PrivateListAgenciesRequestDto> =
  z.object({
    status: agencyStatusSchema.optional(),
  });

export const updateAgencyRequestSchema: z.ZodSchema<UpdateAgencyRequestDto> =
  z.object({
    id: agencyIdSchema,
    status: agencyStatusSchema.optional(),
  });

export const agencyPublicDisplaySchema: z.ZodSchema<AgencyPublicDisplayDto> =
  z.object({
    id: agencyIdSchema,
    name: zStringMinLength1,
    kind: agencyKindSchema,
    address: addressSchema,
    position: geoPositionSchema,
    agencySiret: siretSchema.optional().or(z.literal("")),
    logoUrl: absoluteUrlSchema.optional(),
    signature: zStringMinLength1,
    refersToAgency:
      agencyPublicDisplayDtoWithoutRefersToAgencySchema.optional(),
  });

export const withActiveOrRejectedAgencyStatusSchema: z.Schema<WithActiveOrRejectedStatus> =
  z.object({
    status: z.enum(["active", "rejected"]),
  });

export const withAgencyStatusSchema: z.Schema<WithAgencyStatus> = z.object({
  status: agencyStatusSchema,
});
