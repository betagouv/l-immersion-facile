import { ConventionId } from "shared";
import { AssessmentEntity } from "../entities/AssessmentEntity";
import { AssessmentRepository } from "../ports/AssessmentRepository";

export class InMemoryAssessmentRepository implements AssessmentRepository {
  #assessments: AssessmentEntity[] = [];

  // test purpose
  public get assessments(): AssessmentEntity[] {
    return this.#assessments;
  }

  public async getByConventionId(
    conventionId: ConventionId,
  ): Promise<AssessmentEntity | undefined> {
    return this.#assessments.find(
      (assessment) => assessment.conventionId === conventionId,
    );
  }

  public async getByConventionIds(
    _conventionIds: ConventionId[],
  ): Promise<AssessmentEntity[]> {
    throw new Error("Method not implemented.");
  }

  public async save(assessment: AssessmentEntity): Promise<void> {
    this.#assessments.push(assessment);
  }

  public setAssessments(assessments: AssessmentEntity[]) {
    this.#assessments = assessments;
  }
}
