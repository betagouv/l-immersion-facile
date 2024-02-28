import {
  BackOfficeJwtPayload,
  SiretDto,
  addressDtoToString,
  siretSchema,
} from "shared";
import { z } from "zod";
import {
  ForbiddenError,
  NotFoundError,
} from "../../../adapters/primary/helpers/httpErrors";
import { TransactionalUseCase } from "../../core/UseCase";
import { SaveNotificationAndRelatedEvent } from "../../core/notifications/helpers/Notification";
import { TimeGateway } from "../../core/time-gateway/ports/TimeGateway";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../core/unit-of-work/ports/UnitOfWorkPerformer";
import { establishmentNotFoundErrorMessage } from "../ports/EstablishmentAggregateRepository";

type DeleteEstablishmentPayload = {
  siret: SiretDto;
};

const deleteEstablishmentPayloadSchema: z.Schema<DeleteEstablishmentPayload> =
  z.object({
    siret: siretSchema,
  });

export class DeleteEstablishment extends TransactionalUseCase<
  DeleteEstablishmentPayload,
  void,
  BackOfficeJwtPayload
> {
  protected inputSchema = deleteEstablishmentPayloadSchema;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    private timeGateway: TimeGateway,
    private readonly saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent,
  ) {
    super(uowPerformer);
  }

  public async _execute(
    { siret }: DeleteEstablishmentPayload,
    uow: UnitOfWork,
    jwtPayload?: BackOfficeJwtPayload,
  ): Promise<void> {
    if (!jwtPayload) throw new ForbiddenError();

    const groupsWithSiret = await uow.groupRepository.groupsWithSiret(siret);

    const groupsUpdatedWithoutSiret = groupsWithSiret.map((group) => ({
      ...group,
      sirets: group.sirets.filter((groupSiret) => groupSiret !== siret),
    }));

    const establishmentAggregate =
      await uow.establishmentAggregateRepository.getEstablishmentAggregateBySiret(
        siret,
      );
    if (!establishmentAggregate)
      throw new NotFoundError(establishmentNotFoundErrorMessage(siret));

    await Promise.all([
      uow.establishmentAggregateRepository.delete(siret),
      uow.formEstablishmentRepository.delete(siret),
      ...groupsUpdatedWithoutSiret.map((group) =>
        uow.groupRepository.save(group),
      ),
      uow.deletedEstablishmentRepository.save({
        siret,
        createdAt: establishmentAggregate.establishment.createdAt,
        deletedAt: this.timeGateway.now(),
      }),
    ]);

    if (establishmentAggregate.contact)
      await this.saveNotificationAndRelatedEvent(uow, {
        kind: "email",
        templatedContent: {
          kind: "ESTABLISHMENT_DELETED",
          recipients: [establishmentAggregate.contact.email],
          cc: establishmentAggregate.contact.copyEmails,
          params: {
            businessAddresses:
              establishmentAggregate.establishment.locations.map(
                (addressAndPosition) =>
                  addressDtoToString(addressAndPosition.address),
              ),
            businessName: establishmentAggregate.establishment.name,
            siret: establishmentAggregate.establishment.siret,
          },
        },
        followedIds: {
          establishmentSiret: establishmentAggregate.establishment.siret,
        },
      });
  }
}
