import { Email, emailSchema } from "shared";
import { z } from "zod";

export type InclusionConnectIdTokenPayload = {
  nonce: string;
  sub: string;
  given_name: string;
  family_name: string;
  email: Email;
  structure_pe?: string;
};

export const inclusionConnectIdTokenPayloadSchema: z.Schema<InclusionConnectIdTokenPayload> =
  z.object({
    nonce: z.string(),
    sub: z.string(),
    given_name: z.string(),
    family_name: z.string(),
    email: emailSchema,
    structure_pe: z.string().optional(),
  });
