import { prop, uniqBy } from "ramda";
import {
  FormEstablishmentDto,
  InclusionConnectedUser,
  WithFormEstablishmentDto,
  errors,
  withFormEstablishmentSchema,
} from "shared";
import { rawAddressToLocation } from "../../../utils/address";
import { notifyToTeamAndThrowError } from "../../../utils/notifyTeam";
import { getNafAndNumberOfEmployee } from "../../../utils/siret";
import { TransactionalUseCase } from "../../core/UseCase";
import { AddressGateway } from "../../core/address/ports/AddressGateway";
import { createOrGetUserIdByEmail } from "../../core/authentication/inclusion-connect/entities/user.helper";
import { TriggeredBy } from "../../core/events/events";
import { CreateNewEvent } from "../../core/events/ports/EventBus";
import { rejectsSiretIfNotAnOpenCompany } from "../../core/sirene/helpers/rejectsSiretIfNotAnOpenCompany";
import { SiretGateway } from "../../core/sirene/ports/SiretGateway";
import { TimeGateway } from "../../core/time-gateway/ports/TimeGateway";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../core/unit-of-work/ports/UnitOfWorkPerformer";
import { UuidGenerator } from "../../core/uuid-generator/ports/UuidGenerator";
import { EstablishmentUserRight } from "../entities/EstablishmentAggregate";
import { makeEstablishmentAggregate } from "../helpers/makeEstablishmentAggregate";

export class InsertEstablishmentAggregateFromForm extends TransactionalUseCase<
  WithFormEstablishmentDto,
  void,
  InclusionConnectedUser
> {
  protected inputSchema = withFormEstablishmentSchema;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    private readonly siretGateway: SiretGateway,
    private readonly addressAPI: AddressGateway,
    private readonly uuidGenerator: UuidGenerator,
    private readonly timeGateway: TimeGateway,
    private readonly createNewEvent: CreateNewEvent,
  ) {
    super(uowPerformer);
  }

  protected async _execute(
    { formEstablishment }: WithFormEstablishmentDto,
    uow: UnitOfWork,
    currentUser?: InclusionConnectedUser,
  ): Promise<void> {
    const establishment =
      await uow.establishmentAggregateRepository.getEstablishmentAggregateBySiret(
        formEstablishment.siret,
      );

    if (establishment)
      throw errors.establishment.conflictError({
        siret: formEstablishment.siret,
      });

    await rejectsSiretIfNotAnOpenCompany(
      this.siretGateway,
      formEstablishment.siret,
    );

    const appellations =
      await uow.romeRepository.getAppellationAndRomeDtosFromAppellationCodes(
        formEstablishment.appellations.map(
          ({ appellationCode }) => appellationCode,
        ),
      );

    const correctFormEstablishment: FormEstablishmentDto = {
      ...formEstablishment,
      appellations,
      businessNameCustomized:
        formEstablishment.businessNameCustomized?.trim().length === 0
          ? undefined
          : formEstablishment.businessNameCustomized,
    };

    const triggeredBy: TriggeredBy | null = currentUser
      ? {
          kind: "inclusion-connected",
          userId: currentUser.id,
        }
      : null;

    await this.next(uow, correctFormEstablishment, triggeredBy);
  }

  private async next(
    uow: UnitOfWork,
    formEstablishment: FormEstablishmentDto,
    triggeredBy: TriggeredBy | null,
  ) {
    const { businessContact } = formEstablishment;

    const establishmentAdminId = await createOrGetUserIdByEmail(
      uow,
      this.timeGateway,
      this.uuidGenerator,
      {
        email: businessContact.email,
        firstName: businessContact.firstName,
        lastName: businessContact.lastName,
      },
    );

    const establishmentContactIds = await Promise.all(
      businessContact.copyEmails.map((email) =>
        createOrGetUserIdByEmail(uow, this.timeGateway, this.uuidGenerator, {
          email,
        }),
      ),
    );

    const userRights: EstablishmentUserRight[] = uniqBy(prop("userId"), [
      {
        role: "establishment-admin",
        userId: establishmentAdminId,
        job: businessContact.job,
        phone: businessContact.phone,
      },
      ...establishmentContactIds.map(
        (userId): EstablishmentUserRight => ({
          role: "establishment-contact",
          userId,
        }),
      ),
    ]);

    const establishmentAggregate = await makeEstablishmentAggregate({
      uuidGenerator: this.uuidGenerator,
      timeGateway: this.timeGateway,
      nafAndNumberOfEmployee: await getNafAndNumberOfEmployee(
        this.siretGateway,
        formEstablishment.siret,
      ),
      addressesAndPosition: await Promise.all(
        formEstablishment.businessAddresses.map(
          async (formEstablishmentAddress) =>
            rawAddressToLocation(
              this.addressAPI,
              formEstablishment.siret,
              formEstablishmentAddress,
            ),
        ),
      ),
      formEstablishment,
      userRights,
    });

    await uow.establishmentAggregateRepository
      .insertEstablishmentAggregate(establishmentAggregate)
      .catch((err) => {
        notifyToTeamAndThrowError(
          new Error(
            `Error when adding establishment aggregate with siret ${formEstablishment.siret} due to ${err}`,
          ),
        );
      });

    const event = this.createNewEvent({
      topic: "NewEstablishmentAggregateInsertedFromForm",
      payload: { establishmentAggregate, triggeredBy: null },
    });

    await uow.outboxRepository.save(event);
  }
}
