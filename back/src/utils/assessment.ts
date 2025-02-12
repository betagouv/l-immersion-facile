import {
  AgencyDto,
  ConventionDomainPayload,
  ConventionDto,
  Role,
  assessmentDtoSchema,
  errors,
  isSomeEmailMatchingEmailHash,
} from "shared";
import { z } from "zod";
import { AssessmentEntity } from "../domains/convention/entities/AssessmentEntity";

type AssessmentMode = "CreateAssessment" | "GetAssessment";
export const throwForbiddenIfNotAllowedForAssessments = (
  mode: AssessmentMode,
  convention: ConventionDto,
  agency: AgencyDto,
  { emailHash, applicationId, role }: ConventionDomainPayload,
) => {
  if (convention.id !== applicationId)
    throw errors.assessment.conventionIdMismatch();

  const emailsOrError = assessmentEmailsByRole(convention, agency, mode)[role];

  if (emailsOrError instanceof Error) throw emailsOrError;
  if (!isSomeEmailMatchingEmailHash(emailsOrError, emailHash))
    throw errors.assessment.forbidden();
};

export const assessmentEntitySchema: z.Schema<AssessmentEntity> =
  assessmentDtoSchema.and(
    z.object({
      _entityName: z.literal("Assessment"),
      numberOfHoursActuallyMade: z.number().or(z.null()),
    }),
  );

const assessmentEmailsByRole = (
  convention: ConventionDto,
  agency: AgencyDto,
  mode: AssessmentMode,
): Record<Role, string[] | Error> => ({
  "back-office": errors.assessment.forbidden(),
  "to-review": errors.assessment.forbidden(),
  "agency-viewer": errors.assessment.forbidden(),
  beneficiary:
    mode === "GetAssessment"
      ? [convention.signatories.beneficiary.email]
      : errors.assessment.forbidden(),
  "beneficiary-current-employer": errors.assessment.forbidden(),
  "beneficiary-representative": errors.assessment.forbidden(),
  "agency-admin": errors.assessment.forbidden(),
  "establishment-representative": errors.assessment.forbidden(),
  "establishment-tutor": [convention.establishmentTutor.email],
  counsellor: agency.counsellorEmails,
  validator: agency.validatorEmails,
});
