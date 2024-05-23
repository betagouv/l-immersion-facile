import { z } from "zod";
import { emailSchema } from "./email.schema";
import {
  ValidateEmailInput,
  ValidateEmailStatus,
  validateEmailReason,
} from "./validateEmail.dto";

export const validateEmailInputSchema: z.Schema<ValidateEmailInput> = z.object({
  email: emailSchema,
});

export const validateEmailReasonSchema = z.enum(validateEmailReason);

export const validateEmailResponseSchema: z.Schema<ValidateEmailStatus> =
  z.object({
    isValid: z.boolean(),
    proposal: z.string().or(z.null()),
    reason: validateEmailReasonSchema,
  });
