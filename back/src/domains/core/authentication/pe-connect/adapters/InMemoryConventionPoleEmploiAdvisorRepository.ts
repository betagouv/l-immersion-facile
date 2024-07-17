import { ConventionId, PeExternalId } from "shared";
import { NotFoundError } from "shared";
import {
  ConventionPoleEmploiUserAdvisorEntity,
  PeUserAndAdvisor,
} from "../dto/PeConnect.dto";
import {
  ConventionAndPeExternalIds,
  ConventionPoleEmploiAdvisorRepository,
} from "../port/ConventionPoleEmploiAdvisorRepository";

export class InMemoryConventionPoleEmploiAdvisorRepository
  implements ConventionPoleEmploiAdvisorRepository
{
  #conventionPoleEmploiUsersAdvisors: ConventionPoleEmploiUserAdvisorEntity[] =
    [];

  public async associateConventionAndUserAdvisor(
    conventionId: ConventionId,
    peExternalId: PeExternalId,
  ): Promise<ConventionAndPeExternalIds> {
    const entity: ConventionPoleEmploiUserAdvisorEntity =
      await this.#getAlreadyOpenIfExist(peExternalId);
    this.#upsertWithClosedConvention(entity, {
      ...entity,
      conventionId,
    });

    return {
      conventionId,
      peExternalId,
    };
  }

  //test purposes only
  public get conventionPoleEmploiUsersAdvisors() {
    return this.#conventionPoleEmploiUsersAdvisors;
  }

  public async getByConventionId(
    conventionId: ConventionId,
  ): Promise<ConventionPoleEmploiUserAdvisorEntity | undefined> {
    return this.#conventionPoleEmploiUsersAdvisors.find(
      matchConventionId(conventionId),
    );
  }

  public async openSlotForNextConvention(
    peUserAndAdvisor: PeUserAndAdvisor,
  ): Promise<void> {
    this.#conventionPoleEmploiUsersAdvisors.push({
      advisor: peUserAndAdvisor.advisor,
      conventionId: CONVENTION_ID_DEFAULT_UUID,
      peExternalId: peUserAndAdvisor.user.peExternalId,
      _entityName: "ConventionPoleEmploiAdvisor",
    });
  }

  //test purposes only
  public setConventionPoleEmploiUsersAdvisor(
    conventionPoleEmploiUserAdvisorEntities: ConventionPoleEmploiUserAdvisorEntity[],
  ) {
    this.#conventionPoleEmploiUsersAdvisors =
      conventionPoleEmploiUserAdvisorEntities;
  }

  async #getAlreadyOpenIfExist(
    peExternalId: PeExternalId,
  ): Promise<ConventionPoleEmploiUserAdvisorEntity> {
    const entity: ConventionPoleEmploiUserAdvisorEntity | undefined =
      this.#conventionPoleEmploiUsersAdvisors
        .filter(matchPeExternalId(peExternalId))
        .find(isOpenEntity);
    if (entity) return entity;
    throw new NotFoundError(
      "There is no open France Travail advisor entity linked to this OAuth peExternalId",
    );
  }

  #upsertWithClosedConvention = (
    oldEntity: ConventionPoleEmploiUserAdvisorEntity,
    newEntity: ConventionPoleEmploiUserAdvisorEntity,
  ): void => {
    this.#conventionPoleEmploiUsersAdvisors[
      this.#conventionPoleEmploiUsersAdvisors.indexOf(oldEntity)
    ] = newEntity;
  };
}

export const CONVENTION_ID_DEFAULT_UUID =
  "00000000-0000-0000-0000-000000000000";

const matchPeExternalId =
  (peExternalId: string) =>
  (conventionPoleEmploiUserAdvisor: ConventionPoleEmploiUserAdvisorEntity) =>
    conventionPoleEmploiUserAdvisor.peExternalId === peExternalId;

const matchConventionId =
  (conventionId: string) =>
  (conventionPoleEmploiUserAdvisor: ConventionPoleEmploiUserAdvisorEntity) =>
    conventionPoleEmploiUserAdvisor.conventionId === conventionId;

const isOpenEntity = (entity: ConventionPoleEmploiUserAdvisorEntity) =>
  entity.conventionId === CONVENTION_ID_DEFAULT_UUID;
