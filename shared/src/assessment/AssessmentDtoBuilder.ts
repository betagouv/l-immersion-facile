import { Builder } from "../Builder";
import { ConventionId } from "../convention/convention.dto";
import { AssessmentDto } from "./assessment.dto";

const minimalAssessment: AssessmentDto = {
  conventionId: "aaaaac99-9c0b-1bbb-bb6d-6bb9bd38aaaa",
  status: "COMPLETED",
  endedWithAJob: false,
  establishmentFeedback: "Ca s'est bien passé",
  establishmentAdvices: "mon conseil",
};

const fullAssessment: AssessmentDto = {
  conventionId: "aaaaac99-9c0b-1bbb-bb6d-6bb9bd38aaaa",
  status: "PARTIALLY_COMPLETED",
  lastDayOfPresence: new Date("2024-01-01").toISOString(),
  numberOfMissedHours: 10,
  endedWithAJob: true,
  typeOfContract: "CDI",
  contractStartDate: new Date("2024-01-10").toISOString(),
  establishmentFeedback: "Ca s'est bien passé",
  establishmentAdvices: "mon conseil",
};

export class AssessmentDtoBuilder implements Builder<AssessmentDto> {
  constructor(private dto: AssessmentDto = { ...minimalAssessment }) {}
  public build() {
    return this.dto;
  }
  public withMinimalInformations() {
    this.dto = minimalAssessment;
    return this;
  }
  public withFullInformations() {
    this.dto = fullAssessment;
    return this;
  }
  public withConventionId(conventionId: ConventionId) {
    this.dto.conventionId = conventionId;
    return this;
  }
}
