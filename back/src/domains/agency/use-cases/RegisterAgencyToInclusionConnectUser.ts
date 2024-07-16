import {
  AgencyId,
  InclusionConnectDomainJwtPayload,
  agencyIdsSchema,
  errors,
} from "shared";
import { TransactionalUseCase } from "../../core/UseCase";
import { CreateNewEvent } from "../../core/events/ports/EventBus";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../core/unit-of-work/ports/UnitOfWorkPerformer";

export class RegisterAgencyToInclusionConnectUser extends TransactionalUseCase<
  AgencyId[],
  void,
  InclusionConnectDomainJwtPayload
> {
  protected inputSchema = agencyIdsSchema;

  #createNewEvent: CreateNewEvent;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    createNewEvent: CreateNewEvent,
  ) {
    super(uowPerformer);
    this.#createNewEvent = createNewEvent;
  }

  protected async _execute(
    agencyIds: AgencyId[],
    uow: UnitOfWork,
    inclusionConnectedPayload: InclusionConnectDomainJwtPayload,
  ): Promise<void> {
    if (!inclusionConnectedPayload) throw errors.user.noJwtProvided();

    const user = await uow.inclusionConnectedUserRepository.getById(
      inclusionConnectedPayload.userId,
    );
    if (!user)
      throw errors.user.notFound({
        userId: inclusionConnectedPayload.userId,
      });
    if (user.agencyRights.length > 0) {
      throw errors.user.alreadyHaveAgencyRights({
        userId: user.id,
      });
    }

    const agencies = await uow.agencyRepository.getByIds(agencyIds);
    if (agencies.length !== agencyIds.length) {
      throw errors.agencies.notFound({
        agencyIds: agencies.map((agency) => agency.id),
      });
    }

    const event = this.#createNewEvent({
      topic: "AgencyRegisteredToInclusionConnectedUser",
      payload: {
        userId: user.id,
        agencyIds,
        triggeredBy: {
          kind: "inclusion-connected",
          userId: user.id,
        },
      },
    });

    await Promise.all([
      uow.inclusionConnectedUserRepository.updateAgencyRights({
        userId: user.id,
        agencyRights: agencies.map((agency) => ({
          agency,
          roles: ["toReview"],
          isNotifiedByEmail: false,
        })),
      }),
      uow.outboxRepository.save(event),
    ]);
  }
}
