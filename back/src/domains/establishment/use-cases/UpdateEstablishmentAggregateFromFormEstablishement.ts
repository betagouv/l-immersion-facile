import {
  EstablishmentDomainPayload,
  InclusionConnectDomainJwtPayload,
  WithFormEstablishmentDto,
  errors,
  withFormEstablishmentSchema,
} from "shared";
import { rawAddressToLocation } from "../../../utils/address";
import { TransactionalUseCase } from "../../core/UseCase";
import { AddressGateway } from "../../core/address/ports/AddressGateway";
import { createOrGetUserIdByEmail } from "../../core/authentication/inclusion-connect/entities/user.helper";
import {
  WithTriggeredBy,
  withTriggeredBySchema,
} from "../../core/events/events";
import { CreateNewEvent } from "../../core/events/ports/EventBus";
import { TimeGateway } from "../../core/time-gateway/ports/TimeGateway";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../core/unit-of-work/ports/UnitOfWorkPerformer";
import { UuidGenerator } from "../../core/uuid-generator/ports/UuidGenerator";
import { EstablishmentUserRight } from "../entities/EstablishmentAggregate";
import { makeEstablishmentAggregate } from "../helpers/makeEstablishmentAggregate";

export class UpdateEstablishmentAggregateFromForm extends TransactionalUseCase<
  WithFormEstablishmentDto,
  void,
  InclusionConnectDomainJwtPayload | EstablishmentDomainPayload
> {
  protected inputSchema = withFormEstablishmentSchema.and(
    withTriggeredBySchema,
  );

  readonly #addressGateway: AddressGateway;

  readonly #uuidGenerator: UuidGenerator;

  readonly #timeGateway: TimeGateway;

  readonly #createNewEvent: CreateNewEvent;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    addressAPI: AddressGateway,
    uuidGenerator: UuidGenerator,
    timeGateway: TimeGateway,
    createNewEvent: CreateNewEvent,
  ) {
    super(uowPerformer);

    this.#addressGateway = addressAPI;
    this.#timeGateway = timeGateway;
    this.#uuidGenerator = uuidGenerator;
    this.#createNewEvent = createNewEvent;
  }

  public async _execute(
    {
      formEstablishment,
      triggeredBy,
    }: WithFormEstablishmentDto & WithTriggeredBy,
    uow: UnitOfWork,
    jwtPayload: InclusionConnectDomainJwtPayload | EstablishmentDomainPayload,
  ): Promise<void> {
    if (!jwtPayload) throw errors.user.noJwtProvided();
    const initialEstablishmentAggregate =
      await uow.establishmentAggregateRepository.getEstablishmentAggregateBySiret(
        formEstablishment.siret,
      );

    if (!initialEstablishmentAggregate)
      throw errors.establishment.notFound({
        siret: formEstablishment.siret,
      });

    const adminUserId = await createOrGetUserIdByEmail(
      uow,
      this.#timeGateway,
      this.#uuidGenerator,
      {
        email: formEstablishment.businessContact.email,
        firstName: formEstablishment.businessContact.firstName,
        lastName: formEstablishment.businessContact.lastName,
      },
    );

    const contactUserIds = await Promise.all(
      formEstablishment.businessContact.copyEmails.map((email) =>
        createOrGetUserIdByEmail(uow, this.#timeGateway, this.#uuidGenerator, {
          email,
        }),
      ),
    );

    const updatedUserRights: EstablishmentUserRight[] = [
      {
        role: "establishment-admin",
        job: formEstablishment.businessContact.job,
        phone: formEstablishment.businessContact.phone,
        userId: adminUserId,
      },
      ...contactUserIds.map(
        (userId): EstablishmentUserRight => ({
          role: "establishment-contact",
          userId,
        }),
      ),
    ];

    const establishmentAggregate = makeEstablishmentAggregate({
      uuidGenerator: this.#uuidGenerator,
      timeGateway: this.#timeGateway,
      formEstablishment,
      nafAndNumberOfEmployee: {
        nafDto: initialEstablishmentAggregate.establishment.nafDto,
        numberEmployeesRange:
          initialEstablishmentAggregate.establishment.numberEmployeesRange,
      },
      addressesAndPosition: await Promise.all(
        formEstablishment.businessAddresses.map(async (address) =>
          rawAddressToLocation(
            this.#addressGateway,
            formEstablishment.siret,
            address,
          ),
        ),
      ),
      score: initialEstablishmentAggregate.establishment.score,
      userRights: updatedUserRights,
    });

    await uow.establishmentAggregateRepository.updateEstablishmentAggregate(
      establishmentAggregate,
      this.#timeGateway.now(),
    );

    return uow.outboxRepository.save(
      this.#createNewEvent({
        topic: "UpdatedEstablishmentAggregateInsertedFromForm",
        payload: {
          siret: establishmentAggregate.establishment.siret,
          triggeredBy,
        },
      }),
    );
  }
}
