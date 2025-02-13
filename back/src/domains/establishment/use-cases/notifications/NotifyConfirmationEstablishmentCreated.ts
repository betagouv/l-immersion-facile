import { WithSiretDto, errors, withSiretSchema } from "shared";
import { TransactionalUseCase } from "../../../core/UseCase";
import { SaveNotificationAndRelatedEvent } from "../../../core/notifications/helpers/Notification";
import { UnitOfWork } from "../../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../../core/unit-of-work/ports/UnitOfWorkPerformer";

export class NotifyConfirmationEstablishmentCreated extends TransactionalUseCase<WithSiretDto> {
  protected inputSchema = withSiretSchema;

  readonly #saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent,
  ) {
    super(uowPerformer);
    this.#saveNotificationAndRelatedEvent = saveNotificationAndRelatedEvent;
  }

  public async _execute(
    { siret }: WithSiretDto,
    uow: UnitOfWork,
  ): Promise<void> {
    const establishment =
      await uow.establishmentAggregateRepository.getEstablishmentAggregateBySiret(
        siret,
      );

    if (!establishment) throw errors.establishment.notFound({ siret });

    const firstAdmin = establishment.userRights.find(
      (user) => user.role === "establishment-admin",
    );

    await this.#saveNotificationAndRelatedEvent(uow, {
      kind: "email",
      templatedContent: {
        kind: "NEW_ESTABLISHMENT_CREATED_CONTACT_CONFIRMATION",
        recipients: [formEstablishment.businessContact.email],
        cc: formEstablishment.businessContact.copyEmails,
        params: {
          contactFirstName: formEstablishment.businessContact.firstName,
          contactLastName: formEstablishment.businessContact.lastName,
          businessName: formEstablishment.businessName,
          businessAddresses: formEstablishment.businessAddresses.map(
            ({ rawAddress }) => rawAddress,
          ),
        },
      },
      followedIds: {
        establishmentSiret: formEstablishment.siret,
      },
    });
  }
}
