import { contactEstablishmentRequestSchema } from "shared";
import { z } from "zod";
import { ContactEstablishmentPublicV2Dto } from "./ContactEstablishmentPublicV2.dto";

export const contactEstablishmentPublicV2Schema: z.Schema<ContactEstablishmentPublicV2Dto> =
  contactEstablishmentRequestSchema;
