import { values } from "ramda";
import {
  ConventionDto,
  ConventionId,
  ConventionReadDto,
  Email,
  errorMessages,
} from "shared";
import { ConflictError } from "shared";
import { ConventionRepository } from "../ports/ConventionRepository";

export class InMemoryConventionRepository implements ConventionRepository {
  #conventions: Record<string, ConventionDto> = {};

  public get conventions() {
    return Object.values(this.#conventions);
  }

  public async deprecateConventionsWithoutDefinitiveStatusEndedSince(): Promise<number> {
    throw new Error("not implemented");
  }

  public async getById(id: ConventionId) {
    return this.#conventions[id];
  }

  public async getIdsByEstablishmentRepresentativeEmail(
    email: Email,
  ): Promise<ConventionId[]> {
    return values(this.#conventions)
      .filter(
        ({ signatories }) =>
          signatories.establishmentRepresentative.email === email,
      )
      .map(({ id }) => id);
  }

  public async getIdsByEstablishmentTutorEmail(
    email: Email,
  ): Promise<ConventionId[]> {
    return values(this.#conventions)
      .filter(({ establishmentTutor }) => establishmentTutor.email === email)
      .map(({ id }) => id);
  }

  public async save(convention: ConventionDto): Promise<void> {
    if (this.#conventions[convention.id]) {
      throw new ConflictError(
        errorMessages.convention.conflict({ conventionId: convention.id }),
      );
    }
    this.#conventions[convention.id] = dropConventionReadFields(convention);
  }

  // for test purpose
  public setConventions(conventions: ConventionDto[]) {
    this.#conventions = conventions.reduce<Record<ConventionId, ConventionDto>>(
      (acc, convention) => ({
        ...acc,
        [convention.id]: dropConventionReadFields(convention),
      }),
      {},
    );
  }

  public async update(convention: ConventionDto) {
    const id = convention.id;
    if (!this.#conventions[id]) return;

    this.#conventions[id] = dropConventionReadFields(convention);
    return id;
  }
}

const dropConventionReadFields = (
  convention: ConventionReadDto | ConventionDto,
): ConventionDto => {
  const {
    agencyCounsellorEmails: _1,
    agencyValidatorEmails: _2,
    agencyDepartment: _3,
    agencyKind: _4,
    agencyName: _5,
    agencySiret: _6,
    agencyRefersTo: _7,
    ...conventionWithoutReadFields
  } = convention as ConventionReadDto;
  return conventionWithoutReadFields;
};
