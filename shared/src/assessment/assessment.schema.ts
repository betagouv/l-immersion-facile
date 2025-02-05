import { z } from "zod";
import { makeDateStringSchema } from "../schedule/Schedule.schema";
import { localization, zEnumValidation, zStringMinLength1 } from "../zodUtils";
import {
  AssessmentDto,
  DateRange,
  WithAssessmentDto,
  WithEndedWithAJob,
  WithEstablishmentComments,
  typeOfContracts,
} from "./assessment.dto";

const withAssessmentStatusSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.enum(["COMPLETED", "DID_NOT_SHOW"]),
  }),
  z.object({
    status: z.literal("PARTIALLY_COMPLETED"),
    lastDayOfPresence: makeDateStringSchema(),
    numberOfMissedHours: z.number(),
  }),
]);

const withEstablishmentCommentsSchema: z.Schema<WithEstablishmentComments> =
  z.object({
    establishmentFeedback: zStringMinLength1,
    establishmentAdvices: zStringMinLength1,
  });

const withEndedWithAJobSchema: z.Schema<WithEndedWithAJob> =
  z.discriminatedUnion("endedWithAJob", [
    z.object({
      endedWithAJob: z.literal(true),
      typeOfContract: zEnumValidation(typeOfContracts, localization.required),
      contractStartDate: makeDateStringSchema(),
    }),
    z.object({
      endedWithAJob: z.literal(false),
    }),
  ]);

export const assessmentDtoSchema: z.Schema<AssessmentDto> = z
  .object({
    conventionId: z.string(),
  })
  .and(withAssessmentStatusSchema)
  .and(withEstablishmentCommentsSchema)
  .and(withEndedWithAJobSchema);

export const withAssessmentSchema: z.Schema<WithAssessmentDto> = z.object({
  assessment: assessmentDtoSchema,
});

export const withDateRangeSchema: z.Schema<DateRange> = z
  .object({
    from: z.date(),
    to: z.date(),
  })
  .refine(
    ({ from, to }) => from < to,
    "La date de fin doit être après la date de début.",
  );
