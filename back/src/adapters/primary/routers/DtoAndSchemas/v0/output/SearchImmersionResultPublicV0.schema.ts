import { z } from "zod";
import {
  appellationDtoSchema,
  emailSchema,
  geoPositionSchema,
  phoneRegExp,
  romeCodeSchema,
  siretSchema,
  zString,
  zTrimmedString,
} from "shared";
import { SearchImmersionResultPublicV0 } from "./SearchImmersionResultPublicV0.dto";

export const immersionContactInEstablishmentIdSchema: z.ZodSchema<string> =
  zTrimmedString;

export const contactPublicV0Schema = z.object({
  id: immersionContactInEstablishmentIdSchema,
  lastName: z.string(),
  firstName: z.string(),
  email: z.string(),
  job: z.string(),
  phone: z.string(),
});

export const immersionOfferIdSchema: z.ZodSchema<string> = zTrimmedString;

export const searchImmersionResultPublicV0Schema: z.Schema<SearchImmersionResultPublicV0> =
  z.object({
    id: immersionOfferIdSchema,
    rome: romeCodeSchema,
    romeLabel: z.string(),
    naf: z.string(),
    nafLabel: z.string(),
    siret: siretSchema,
    name: z.string(),
    voluntaryToImmersion: z.boolean(),
    location: geoPositionSchema,
    address: z.string(),
    city: z.string(),
    contactMode: z.enum(["EMAIL", "PHONE", "IN_PERSON"]).optional(),
    distance_m: z.number().optional(),
    contactDetails: z
      .object({
        id: z.string(),
        lastName: zTrimmedString,
        firstName: zTrimmedString,
        role: zTrimmedString,
        phone: zString.regex(phoneRegExp, "Numero de téléphone incorrect"),
        email: emailSchema,
      })
      .optional(),
    numberOfEmployeeRange: z.string().optional(),
    appellations: z.array(appellationDtoSchema),
  });

export const searchImmersionResponsePublicV0Schema = z.array(
  searchImmersionResultPublicV0Schema,
);
