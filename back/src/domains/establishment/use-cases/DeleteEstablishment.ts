import {
  InclusionConnectedUser,
  SiretDto,
  addressDtoToString,
  errors,
  siretSchema,
} from "shared";
import { z } from "zod";
import { TransactionalUseCase } from "../../core/UseCase";
import { makeProvider } from "../../core/authentication/inclusion-connect/port/OAuthGateway";
import { SaveNotificationAndRelatedEvent } from "../../core/notifications/helpers/Notification";
import { TimeGateway } from "../../core/time-gateway/ports/TimeGateway";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../core/unit-of-work/ports/UnitOfWorkPerformer";
import { throwIfNotAdmin } from "../../inclusion-connected-users/helpers/authorization.helper";

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
  InclusionConnectedUser
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
    currentUser: InclusionConnectedUser,
  ): Promise<void> {
    throwIfNotAdmin(currentUser);

    const groupsWithSiret = await uow.groupRepository.groupsWithSiret(siret);

    const groupsUpdatedWithoutSiret = groupsWithSiret.map((group) => ({
      ...group,
      sirets: group.sirets.filter((groupSiret) => groupSiret !== siret),
    }));

    const establishmentAggregate =
      await uow.establishmentAggregateRepository.getEstablishmentAggregateBySiret(
        siret,
      );
    if (!establishmentAggregate) throw errors.establishment.notFound({ siret });

    await Promise.all([
      uow.establishmentAggregateRepository.delete(siret),
      ...groupsUpdatedWithoutSiret.map((group) =>
        uow.groupRepository.save(group),
      ),
      uow.deletedEstablishmentRepository.save({
        siret,
        createdAt: establishmentAggregate.establishment.createdAt,
        deletedAt: this.timeGateway.now(),
      }),
    ]);

    const adminIds = establishmentAggregate.userRights
      .filter(({ role }) => role === "establishment-admin")
      .map(({ userId }) => userId);
    const contactIds = establishmentAggregate.userRights
      .filter(({ role }) => role === "establishment-contact")
      .map(({ userId }) => userId);

    const provider = await makeProvider(uow);

    await this.saveNotificationAndRelatedEvent(uow, {
      kind: "email",
      templatedContent: {
        kind: "ESTABLISHMENT_DELETED",
        recipients: (await uow.userRepository.getByIds(adminIds, provider)).map(
          ({ email }) => email,
        ),
        cc: (await uow.userRepository.getByIds(contactIds, provider)).map(
          ({ email }) => email,
        ),
        params: {
          businessAddresses: establishmentAggregate.establishment.locations.map(
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
