import { propEq } from "ramda";
import {
  ConventionDto,
  ConventionId,
  ConventionReadDto,
  ConventionScope,
  ListConventionsRequestDto,
  validatedConventionStatuses,
  WithConventionIdLegacy,
} from "shared";
import {
  ConventionQueries,
  GetConventionsByFiltersQueries,
} from "../../domain/convention/ports/ConventionQueries";
import { createLogger } from "../../utils/logger";
import { NotFoundError } from "../primary/helpers/httpErrors";
import { InMemoryOutboxRepository } from "./core/InMemoryOutboxRepository";
import { InMemoryAgencyRepository } from "./InMemoryAgencyRepository";
import { InMemoryConventionRepository } from "./InMemoryConventionRepository";

export const TEST_AGENCY_NAME = "TEST_AGENCY_NAME";
export const TEST_AGENCY_DEPARTMENT = "75-test";
const logger = createLogger(__filename);

export class InMemoryConventionQueries implements ConventionQueries {
  constructor(
    private readonly conventionRepository: InMemoryConventionRepository,
    private readonly agencyRepository: InMemoryAgencyRepository,
    private readonly outboxRepository?: InMemoryOutboxRepository,
  ) {}

  public async getAllConventionsForThoseEndingThatDidntReceivedAssessmentLink(
    dateEnd: Date,
  ): Promise<ConventionReadDto[]> {
    const immersionIdsThatAlreadyGotAnEmail = this.outboxRepository
      ? this.outboxRepository.events
          .filter(propEq("topic", "EmailWithLinkToCreateAssessmentSent"))
          .map((event) => (event.payload as WithConventionIdLegacy).id)
      : [];
    return Object.values(this.conventionRepository._conventions)
      .filter(
        (convention) =>
          new Date(convention.dateEnd).getDate() === dateEnd.getDate() &&
          validatedConventionStatuses.includes(convention.status) &&
          !immersionIdsThatAlreadyGotAnEmail.includes(convention.id),
      )
      .map((convention) => this.#addAgencyDataToConvention(convention));
  }

  public async getConventionById(
    id: ConventionId,
  ): Promise<ConventionReadDto | undefined> {
    logger.info("getAll");
    const convention = this.conventionRepository.conventions.find(
      propEq("id", id),
    );
    if (!convention) return;

    return this.#addAgencyDataToConvention(convention);
  }

  public async getConventionsByFilters(
    filters: GetConventionsByFiltersQueries,
  ): Promise<ConventionReadDto[]> {
    return Object.values(this.conventionRepository._conventions)
      .filter(makeApplyFiltersToConventions(filters))
      .map((convention) => this.#addAgencyDataToConvention(convention));
  }

  public async getConventionsByScope(params: {
    scope: ConventionScope;
    limit: number;
    filters: GetConventionsByFiltersQueries;
  }): Promise<ConventionReadDto[]> {
    return Object.values(this.conventionRepository._conventions)
      .filter((convention) => {
        const agency = this.agencyRepository.agencies.find(
          (agency) => agency.id === convention.agencyId,
        );

        if (!agency) throw new NotFoundError("agency not found");

        return (
          params.scope.agencyKinds?.includes(agency.kind) ||
          params.scope.agencyIds?.includes(agency.id)
        );
      })
      .filter(makeApplyFiltersToConventions(params.filters))
      .map((convention) => this.#addAgencyDataToConvention(convention));
  }

  public async getLatestConventions({
    status,
    agencyId,
  }: ListConventionsRequestDto): Promise<ConventionReadDto[]> {
    logger.info("getAll");
    return Object.values(this.conventionRepository._conventions)
      .filter((dto) => !status || dto.status === status)
      .filter((dto) => !agencyId || dto.agencyId === agencyId)
      .map((dto) => this.#addAgencyDataToConvention(dto));
  }

  #addAgencyDataToConvention = (
    convention: ConventionDto,
  ): ConventionReadDto => {
    const agency = this.agencyRepository.agencies.find(
      (agency) => agency.id === convention.agencyId,
    );

    return {
      ...convention,
      agencyName: agency?.name ?? TEST_AGENCY_NAME,
      agencyDepartment:
        agency?.address.departmentCode ?? TEST_AGENCY_DEPARTMENT,
      agencyKind: agency?.kind ?? "autre",
      agencySiret: agency?.agencySiret,
      agencyRefersToOtherAgency: agency?.refersToAgency && {
        id: agency.refersToAgency.id,
        name: agency.refersToAgency.name,
      },
    };
  };
}

const makeApplyFiltersToConventions =
  ({
    startDateLessOrEqual,
    startDateGreater,
    withStatuses,
  }: GetConventionsByFiltersQueries) =>
  (convention: ConventionDto) => {
    if (
      startDateLessOrEqual &&
      new Date(convention.dateStart) > startDateLessOrEqual
    )
      return false;
    if (startDateGreater && new Date(convention.dateStart) <= startDateGreater)
      return false;
    if (
      withStatuses &&
      withStatuses.length > 0 &&
      !withStatuses.includes(convention.status)
    )
      return false;
    return true;
  };
