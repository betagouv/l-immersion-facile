import {
  AssessmentDto,
  ConventionDomainPayload,
  ConventionDto,
  ForbiddenError,
  assessmentDtoSchema,
  errors,
} from "shared";
import { agencyWithRightToAgencyDto } from "../../../utils/agency";
import { throwForbiddenIfNotAllowedForAssessments } from "../../../utils/assessment";
import { createTransactionalUseCase } from "../../core/UseCase";
import { CreateNewEvent } from "../../core/events/ports/EventBus";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import {
  AssessmentEntity,
  createAssessmentEntity,
} from "../entities/AssessmentEntity";
import { retrieveConventionWithAgency } from "../entities/Convention";

type WithCreateNewEvent = { createNewEvent: CreateNewEvent };

export type CreateAssessment = ReturnType<typeof makeCreateAssessment>;
export const makeCreateAssessment = createTransactionalUseCase<
  AssessmentDto,
  void,
  ConventionDomainPayload | undefined,
  WithCreateNewEvent
>(
  { name: "CreateAssessment", inputSchema: assessmentDtoSchema },
  async ({
    inputParams: assessment,
    uow,
    deps,
    currentUser: conventionJwtPayload,
  }) => {
    if (!conventionJwtPayload)
      throw new ForbiddenError("No magic link provided");

    const { agency, convention } = await retrieveConventionWithAgency(
      uow,
      assessment.conventionId,
    );

    throwForbiddenIfNotAllowedForAssessments(
      "CreateAssessment",
      convention,
      await agencyWithRightToAgencyDto(uow, agency),
      conventionJwtPayload,
    );

    const assessmentEntity = await createAssessmentEntityIfNotExist(
      uow,
      convention,
      assessment,
    );

    await Promise.all([
      uow.assessmentRepository.save(assessmentEntity),
      uow.outboxRepository.save(
        deps.createNewEvent({
          topic: "AssessmentCreated",
          payload: {
            assessment: assessment,
            triggeredBy: {
              kind: "convention-magic-link",
              role: conventionJwtPayload.role,
            },
          },
        }),
      ),
    ]);
  },
);

const createAssessmentEntityIfNotExist = async (
  uow: UnitOfWork,
  convention: ConventionDto,
  assessment: AssessmentDto,
): Promise<AssessmentEntity> => {
  const existingAssessmentEntity =
    await uow.assessmentRepository.getByConventionId(convention.id);

  if (existingAssessmentEntity)
    throw errors.assessment.alreadyExist(convention.id);

  return createAssessmentEntity(assessment, convention);
};
