import {
  BackOfficeJwtPayload,
  InclusionConnectedUser,
  RejectIcUserRoleForAgencyParams,
  rejectIcUserRoleForAgencyParamsSchema,
} from "shared";
import {
  ForbiddenError,
  NotFoundError,
} from "../../../adapters/primary/helpers/httpErrors";
import { CreateNewEvent } from "../../core/eventBus/EventBus";
import { DomainEvent } from "../../core/eventBus/events";
import { UnitOfWork, UnitOfWorkPerformer } from "../../core/ports/UnitOfWork";
import { TransactionalUseCase } from "../../core/UseCase";

export class RejectIcUserForAgency extends TransactionalUseCase<
  RejectIcUserRoleForAgencyParams,
  void,
  BackOfficeJwtPayload
> {
  protected inputSchema = rejectIcUserRoleForAgencyParamsSchema;

  readonly #createNewEvent: CreateNewEvent;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    createNewEvent: CreateNewEvent,
  ) {
    super(uowPerformer);

    this.#createNewEvent = createNewEvent;
  }

  protected async _execute(
    params: RejectIcUserRoleForAgencyParams,
    uow: UnitOfWork,
    jwtPayload: BackOfficeJwtPayload,
  ): Promise<void> {
    if (!jwtPayload) throw new ForbiddenError("No JWT token provided");
    if (jwtPayload.role !== "backOffice")
      throw new ForbiddenError(
        `This user is not a backOffice user, role was : '${jwtPayload?.role}'`,
      );

    const icUser = await uow.inclusionConnectedUserRepository.getById(
      params.userId,
    );

    if (!icUser)
      throw new NotFoundError(`No user found with id: ${params.userId}`);

    const agency = await uow.agencyRepository.getById(params.agencyId);

    if (!agency)
      throw new NotFoundError(`No agency found with id: ${params.agencyId}`);

    const updatedAgencyRights = icUser.agencyRights.filter(
      (agencyRight) => agencyRight.agency.id !== params.agencyId,
    );
    const updatedIcUser: InclusionConnectedUser = {
      ...icUser,
      agencyRights: updatedAgencyRights,
    };

    const event: DomainEvent = this.#createNewEvent({
      topic: "IcUserAgencyRightRejected",
      payload: params,
    });

    await Promise.all([
      uow.inclusionConnectedUserRepository.update(updatedIcUser),
      uow.outboxRepository.save(event),
    ]);
  }
}
