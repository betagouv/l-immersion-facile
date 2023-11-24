import {
  ConventionStatus,
  UpdateConventionRequestDto,
  updateConventionRequestSchema,
  WithConventionIdLegacy,
} from "shared";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../../../adapters/primary/helpers/httpErrors";
import { CreateNewEvent } from "../../core/eventBus/EventBus";
import { UnitOfWork, UnitOfWorkPerformer } from "../../core/ports/UnitOfWork";
import { TransactionalUseCase } from "../../core/UseCase";

export class UpdateConvention extends TransactionalUseCase<
  UpdateConventionRequestDto,
  WithConventionIdLegacy
> {
  protected inputSchema = updateConventionRequestSchema;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    private readonly createNewEvent: CreateNewEvent,
  ) {
    super(uowPerformer);
  }

  protected async _execute(
    { convention }: UpdateConventionRequestDto,
    uow: UnitOfWork,
  ): Promise<WithConventionIdLegacy> {
    const minimalValidStatus: ConventionStatus = "READY_TO_SIGN";

    if (convention.status !== minimalValidStatus)
      throw new ForbiddenError(
        `Convention ${convention.id} with modifications should have status ${minimalValidStatus}`,
      );

    const conventionFromRepo = await uow.conventionRepository.getById(
      convention.id,
    );

    if (!conventionFromRepo)
      throw new NotFoundError(
        `Convention with id ${convention.id} was not found`,
      );
    if (conventionFromRepo.status != "DRAFT") {
      throw new BadRequestError(
        `Convention ${conventionFromRepo.id} cannot be modified as it has status ${conventionFromRepo.status}`,
      );
    }

    await Promise.all([
      uow.conventionRepository.update(convention),
      uow.outboxRepository.save(
        this.createNewEvent({
          topic: "ConventionSubmittedAfterModification",
          payload: { convention },
        }),
      ),
    ]);

    return { id: conventionFromRepo.id };
  }
}
