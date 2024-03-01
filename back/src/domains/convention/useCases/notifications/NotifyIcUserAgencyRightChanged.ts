import {
  IcUserRoleForAgencyParams,
  icUserRoleForAgencyParamsSchema,
} from "shared";
import { NotFoundError } from "../../../../adapters/primary/helpers/httpErrors";
import { TransactionalUseCase } from "../../../core/UseCase";
import { SaveNotificationAndRelatedEvent } from "../../../core/notifications/helpers/Notification";
import { UnitOfWork } from "../../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../../core/unit-of-work/ports/UnitOfWorkPerformer";

export class NotifyIcUserAgencyRightChanged extends TransactionalUseCase<
  IcUserRoleForAgencyParams,
  void
> {
  protected inputSchema = icUserRoleForAgencyParamsSchema;

  readonly #saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent,
  ) {
    super(uowPerformer);
    this.#saveNotificationAndRelatedEvent = saveNotificationAndRelatedEvent;
  }

  protected async _execute(
    params: IcUserRoleForAgencyParams,
    uow: UnitOfWork,
  ): Promise<void> {
    const agency = await uow.agencyRepository.getById(params.agencyId);
    if (!agency) {
      throw new NotFoundError(
        `Unable to send mail. No agency config found for ${params.agencyId}`,
      );
    }

    const user = await uow.inclusionConnectedUserRepository.getById(
      params.userId,
    );
    if (!user)
      throw new NotFoundError(`User with id ${params.userId} not found`);

    if (params.role !== "toReview")
      await this.#saveNotificationAndRelatedEvent(uow, {
        kind: "email",
        templatedContent: {
          kind: "IC_USER_RIGHTS_HAS_CHANGED",
          recipients: [user.email],
          params: {
            agencyName: agency.name,
          },
        },
        followedIds: {
          agencyId: agency.id,
          userId: user.id,
        },
      });
  }
}
