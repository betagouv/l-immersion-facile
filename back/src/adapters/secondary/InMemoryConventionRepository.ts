import {
  ConventionDto,
  ConventionDtoWithoutExternalId,
  ConventionExternalId,
  ConventionId,
} from "shared";
import { ConventionRepository } from "../../domain/convention/ports/ConventionRepository";
import { createLogger } from "../../utils/logger";
import { ConflictError } from "../primary/helpers/httpErrors";

const logger = createLogger(__filename);

export class InMemoryConventionRepository implements ConventionRepository {
  public _conventions: Record<string, ConventionDto> = {};

  private _nextExternalId: ConventionExternalId = "00000000001";

  get conventions() {
    return Object.values(this._conventions);
  }

  public async getById(id: ConventionId) {
    logger.info({ id }, "getById");
    return this._conventions[id];
  }

  public async save(
    conventionWithoutExternalId: ConventionDtoWithoutExternalId,
  ): Promise<ConventionExternalId> {
    logger.info({ conventionWithoutExternalId }, "save");
    const convention: ConventionDto = {
      ...conventionWithoutExternalId,
      externalId: this._nextExternalId,
    };
    if (this._conventions[convention.id]) {
      throw new ConflictError(
        `Convention with id ${convention.id} already exists`,
      );
    }
    this._conventions[convention.id] = convention;
    return convention.externalId;
  }

  // for test purpose
  setConventions(conventions: Record<string, ConventionDto>) {
    this._conventions = conventions;
  }

  setNextExternalId(externalId: ConventionExternalId) {
    this._nextExternalId = externalId;
  }

  public async update(convention: ConventionDto) {
    logger.info({ convention }, "updateConvention");
    const id = convention.id;
    if (!this._conventions[id]) return;

    this._conventions[id] = convention;
    return id;
  }
}
