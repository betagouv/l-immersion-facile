import {
  addressDtoToString,
  EstablishmentJwtPayload,
  FormEstablishmentDto,
  SiretDto,
  siretSchema,
} from "shared";
import {
  BadRequestError,
  ForbiddenError,
} from "../../../adapters/primary/helpers/httpErrors";
import { UnitOfWork, UnitOfWorkPerformer } from "../../core/ports/UnitOfWork";
import { TransactionalUseCase } from "../../core/UseCase";

export class RetrieveFormEstablishmentFromAggregates extends TransactionalUseCase<
  SiretDto,
  FormEstablishmentDto,
  EstablishmentJwtPayload
> {
  inputSchema = siretSchema;

  constructor(uowPerformer: UnitOfWorkPerformer) {
    super(uowPerformer);
  }

  protected async _execute(
    siret: SiretDto,
    uow: UnitOfWork,
    { siret: siretFromJwt }: EstablishmentJwtPayload,
  ) {
    if (siret !== siretFromJwt) throw new ForbiddenError();

    const establishmentAggregate =
      await uow.establishmentAggregateRepository.getEstablishmentAggregateBySiret(
        siret,
      );

    if (!establishmentAggregate)
      throw new BadRequestError(`No establishment found with siret ${siret}.`);

    if (!establishmentAggregate.contact)
      throw new BadRequestError("No contact ");

    const offersAsAppellationDto =
      await uow.establishmentAggregateRepository.getOffersAsAppellationDtoEstablishment(
        siret,
      );

    const retrievedForm: FormEstablishmentDto = {
      siret,
      source: "immersion-facile",
      website: establishmentAggregate.establishment.website,
      additionalInformation:
        establishmentAggregate.establishment.additionalInformation,
      businessName: establishmentAggregate.establishment.name,
      businessNameCustomized:
        establishmentAggregate.establishment.customizedName,
      businessAddress: addressDtoToString(
        establishmentAggregate.establishment.address,
      ),
      isEngagedEnterprise: establishmentAggregate.establishment.isCommited,
      fitForDisabledWorkers:
        establishmentAggregate.establishment.fitForDisabledWorkers,
      naf: establishmentAggregate.establishment?.nafDto,
      appellations: offersAsAppellationDto,
      businessContact: establishmentAggregate.contact,
      maxContactsPerWeek:
        establishmentAggregate.establishment.maxContactsPerWeek,
    };
    return retrievedForm;
  }
}
