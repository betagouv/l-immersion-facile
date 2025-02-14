import {
  AssessmentDto,
  ConventionDomainPayload,
  WithConventionId,
  errors,
  withConventionIdSchema,
} from "shared";
import { agencyWithRightToAgencyDto } from "../../../utils/agency";
import { throwForbiddenIfNotAllowedForAssessments } from "../../../utils/assessment";
import { createTransactionalUseCase } from "../../core/UseCase";
import { toAssessmentDto } from "../entities/AssessmentEntity";
import { retrieveConventionWithAgency } from "../entities/Convention";

export type GetAssessmentByConventionId = ReturnType<
  typeof makeGetAssessmentByConventionId
>;
export const makeGetAssessmentByConventionId = createTransactionalUseCase<
  WithConventionId,
  AssessmentDto,
  ConventionDomainPayload | undefined
>(
  {
    name: "GetAssessment",
    inputSchema: withConventionIdSchema,
  },
  async ({ uow, currentUser, inputParams }) => {
    if (!currentUser) throw errors.user.noJwtProvided();
    const { agency, convention } = await retrieveConventionWithAgency(
      uow,
      inputParams.conventionId,
    );

    throwForbiddenIfNotAllowedForAssessments(
      "GetAssessment",
      convention,
      await agencyWithRightToAgencyDto(uow, agency),
      currentUser,
    );

    const assessment = await uow.assessmentRepository.getByConventionId(
      inputParams.conventionId,
    );

    if (!assessment) {
      throw errors.assessment.notFound(inputParams.conventionId);
    }

    return toAssessmentDto(assessment);
  },
);
