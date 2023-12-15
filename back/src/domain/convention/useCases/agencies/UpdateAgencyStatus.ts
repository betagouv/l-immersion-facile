import {AgencyDto, AgencyToReview, PartialAgencyDto, withActiveOrRejectedAgencyStatusSchema} from "shared";
import { NotFoundError } from "../../../../adapters/primary/helpers/httpErrors";
import { CreateNewEvent } from "../../../core/eventBus/EventBus";
import {
  UnitOfWork,
  UnitOfWorkPerformer,
} from "../../../core/ports/UnitOfWork";
import { TransactionalUseCase } from "../../../core/UseCase";
import { throwConflictErrorOnSimilarAgencyFound } from "../../entities/Agency";

export class UpdateAgencyStatus extends TransactionalUseCase<
  AgencyToReview,
  void
> {
  protected inputSchema = withActiveOrRejectedAgencyStatusSchema;

  #createNewEvent: CreateNewEvent;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    createNewEvent: CreateNewEvent,
  ) {
    super(uowPerformer);
    this.#createNewEvent = createNewEvent;
  }

  public async _execute(
    agencyToReview: AgencyToReview,
    uow: UnitOfWork,
  ): Promise<void> {
    const existingAgency = await uow.agencyRepository.getById(agencyToReview.id);
    if (!existingAgency)
      throw new NotFoundError(`No agency found with id ${agencyToReview.id}`);

    await throwConflictErrorOnSimilarAgencyFound({
      uow,
      agency: existingAgency,
    });

    const updatedAgencyParams: PartialAgencyDto = { id: agencyToReview.id,
      status: agencyToReview.status,
      rejectionJustification:
        agencyToReview.status === "rejected"
          ? agencyToReview.rejectionJustification
          : undefined, }
    if (agencyToReview.status) await uow.agencyRepository.update(updatedAgencyParams);

    if (agencyToReview.status === "active" || agencyToReview.status === "rejected") {
      await uow.outboxRepository.save(
        this.#createNewEvent({
          topic: agencyToReview.status === "active"
            ? "AgencyActivated"
            : "AgencyRejected",
          payload: { agency: { ...existingAgency, ...updatedAgencyParams } },
        }),
      );
    }
  }
}
