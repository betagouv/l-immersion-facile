import { ConventionId, assessmentSchema, errors } from "shared";
import { KyselyDb } from "../../../config/pg/kysely/kyselyUtils";
import { AssessmentEntity } from "../entities/AssessmentEntity";
import { AssessmentRepository } from "../ports/AssessmentRepository";

export class PgAssessmentRepository implements AssessmentRepository {
  constructor(private transaction: KyselyDb) {}

  public async getByConventionId(
    conventionId: ConventionId,
  ): Promise<AssessmentEntity | undefined> {
    const result = await this.transaction
      .selectFrom("immersion_assessments")
      .selectAll()
      .where("convention_id", "=", conventionId)
      .executeTakeFirst();

    if (!result) return;

    const dto = assessmentSchema.parse({
      conventionId: result.convention_id,
      status: result.status,
      establishmentFeedback: result.establishment_feedback,
      establishmentAdvices: result.establishment_advices,
      endedWithAJob: result.ended_with_a_job,
      ...(result.contract_start_date
        ? { contractStartDate: result.contract_start_date.toISOString() }
        : {}),
      ...(result.type_of_contract
        ? { typeOfContract: result.type_of_contract }
        : {}),
      ...(result.last_day_of_presence
        ? { lastDayOfPresence: result.last_day_of_presence.toISOString() }
        : {}),
      ...(result.number_of_missed_hours
        ? { numberOfMissedHours: result.number_of_missed_hours }
        : {}),
    });

    return {
      _entityName: "Assessment",
      ...dto,
    };
  }

  public async save(assessmentEntity: AssessmentEntity): Promise<void> {
    await this.transaction
      .insertInto("immersion_assessments")
      .values({
        convention_id: assessmentEntity.conventionId,
        status: assessmentEntity.status,
        last_day_of_presence:
          assessmentEntity.status === "PARTIALLY_COMPLETED"
            ? assessmentEntity.lastDayOfPresence
            : null,
        number_of_missed_hours:
          assessmentEntity.status === "PARTIALLY_COMPLETED"
            ? assessmentEntity.numberOfMissedHours
            : null,
        ended_with_a_job: assessmentEntity.endedWithAJob,
        type_of_contract: assessmentEntity.endedWithAJob
          ? assessmentEntity.typeOfContract
          : null,
        contract_start_date: assessmentEntity.endedWithAJob
          ? assessmentEntity.contractStartDate
          : null,
        establishment_feedback: assessmentEntity.establishmentFeedback,
        establishment_advices: assessmentEntity.establishmentAdvices,
      })
      .execute()
      .catch((error) => {
        if (error?.message.includes(noConventionMatchingErrorMessage))
          throw errors.convention.notFound({
            conventionId: assessmentEntity.conventionId,
          });

        throw error;
      });
  }
}

const noConventionMatchingErrorMessage =
  '"immersion_assessments" violates foreign key constraint "immersion_assessments_convention_id_fkey"';
