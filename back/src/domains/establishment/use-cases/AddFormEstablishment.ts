import {
  FormEstablishmentDto,
  InclusionConnectedUser,
  errors,
  formEstablishmentSchema,
} from "shared";
import { TransactionalUseCase } from "../../core/UseCase";
import { TriggeredBy } from "../../core/events/events";
import { CreateNewEvent } from "../../core/events/ports/EventBus";
import { rejectsSiretIfNotAnOpenCompany } from "../../core/sirene/helpers/rejectsSiretIfNotAnOpenCompany";
import { SiretGateway } from "../../core/sirene/ports/SiretGateway";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../core/unit-of-work/ports/UnitOfWorkPerformer";

export class AddFormEstablishment extends TransactionalUseCase<
  FormEstablishmentDto,
  void,
  InclusionConnectedUser
> {
  protected inputSchema = formEstablishmentSchema;

  readonly #createNewEvent: CreateNewEvent;

  readonly #siretGateway: SiretGateway;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    createNewEvent: CreateNewEvent,
    siretGateway: SiretGateway,
  ) {
    super(uowPerformer);

    this.#createNewEvent = createNewEvent;
    this.#siretGateway = siretGateway;
  }

  protected async _execute(
    dto: FormEstablishmentDto,
    uow: UnitOfWork,
    inclusionConnectedUser?: InclusionConnectedUser,
  ): Promise<void> {
    if (!inclusionConnectedUser) throw errors.user.noJwtProvided();
    const existingFormEstablishment =
      await uow.formEstablishmentRepository.getBySiret(dto.siret);

    if (existingFormEstablishment)
      throw errors.establishment.conflictError({ siret: dto.siret });

    await rejectsSiretIfNotAnOpenCompany(this.#siretGateway, dto.siret);

    const appellations =
      await uow.romeRepository.getAppellationAndRomeDtosFromAppellationCodes(
        dto.appellations.map(({ appellationCode }) => appellationCode),
      );

    const correctFormEstablishment: FormEstablishmentDto = {
      ...dto,
      appellations,
      businessNameCustomized:
        dto.businessNameCustomized?.trim().length === 0
          ? undefined
          : dto.businessNameCustomized,
    };

    const triggeredBy: TriggeredBy | null = inclusionConnectedUser
      ? {
          kind: "inclusion-connected",
          userId: inclusionConnectedUser.id,
        }
      : null;

    const event = this.#createNewEvent({
      topic: "FormEstablishmentAdded",
      payload: {
        formEstablishment: correctFormEstablishment,
        triggeredBy,
      },
    });

    await Promise.all([
      uow.formEstablishmentRepository.create(correctFormEstablishment),
      uow.outboxRepository.save(event),
    ]);
  }
}
