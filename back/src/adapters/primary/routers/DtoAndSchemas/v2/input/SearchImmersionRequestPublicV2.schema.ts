import { z } from "zod";
import {
  appellationSchema,
  romeCodeSchema,
  siretSchema,
  zToBoolean,
  zToNumber,
} from "shared";
import { SearchImmersionRequestPublicV2 } from "./SearchImmersionRequestPublicV2.dto";

export const searchImmersionRequestPublicV2Schema: z.Schema<SearchImmersionRequestPublicV2> =
  z.object({
    rome: romeCodeSchema.optional(),
    appellationCode: appellationSchema.optional(),
    siret: siretSchema.optional(),
    latitude: zToNumber,
    longitude: zToNumber,
    distanceKm: zToNumber.positive("'distance_km' doit être > 0").max(100),
    voluntaryToImmersion: zToBoolean.optional(),
    place: z.string().optional(),
    sortedBy: z.enum(["distance", "date"]).optional(),
  });
