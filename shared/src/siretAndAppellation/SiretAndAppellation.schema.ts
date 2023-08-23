import { z } from "zod";
import { appellationCodeSchema } from "../romeAndAppellationDtos/romeAndAppellation.schema";
import { siretSchema } from "../siret/siret.schema";
import { SiretAndAppellationDto } from "./SiretAndAppellation.dto";

export const siretAndAppellationSchema: z.Schema<SiretAndAppellationDto> =
  z.object({
    appellationCode: appellationCodeSchema,
    siret: siretSchema,
  });
