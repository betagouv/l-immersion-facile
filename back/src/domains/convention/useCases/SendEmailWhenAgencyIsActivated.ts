import {
  AgencyDto,
  agencySchema,
  getCounsellorsAndValidatorsEmailsDeduplicated,
} from "shared";
import { z } from "zod";
import { TransactionalUseCase } from "../../core/UseCase";
import { SaveNotificationAndRelatedEvent } from "../../core/notifications/helpers/Notification";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../core/unit-of-work/ports/UnitOfWorkPerformer";

type WithAgency = { agency: AgencyDto };

export class SendEmailWhenAgencyIsActivated extends TransactionalUseCase<WithAgency> {
  protected inputSchema = z.object({ agency: agencySchema });

  readonly #saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent,
  ) {
    super(uowPerformer);
    this.#saveNotificationAndRelatedEvent = saveNotificationAndRelatedEvent;
  }

  public async _execute(
    { agency }: WithAgency,
    uow: UnitOfWork,
  ): Promise<void> {
    const refersToOtherAgencyParams = agency.refersToAgencyId
      ? {
          refersToOtherAgency: true as const,
          validatorEmails: agency.validatorEmails,
        }
      : { refersToOtherAgency: false as const };

    await this.#saveNotificationAndRelatedEvent(uow, {
      kind: "email",
      templatedContent: {
        kind: "AGENCY_WAS_ACTIVATED",
        recipients: getCounsellorsAndValidatorsEmailsDeduplicated(agency),
        params: {
          agencyName: agency.name,
          agencyLogoUrl: agency.logoUrl ?? undefined,
          ...refersToOtherAgencyParams,
        },
      },
      followedIds: {
        agencyId: agency.id,
      },
    });
  }
}
