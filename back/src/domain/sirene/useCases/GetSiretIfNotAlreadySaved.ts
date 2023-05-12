import {
  GetSiretRequestDto,
  getSiretRequestSchema,
  SiretEstablishmentDto,
} from "shared";
import { ConflictError } from "../../../adapters/primary/helpers/httpErrors";
import { UnitOfWork, UnitOfWorkPerformer } from "../../core/ports/UnitOfWork";
import { TransactionalUseCase } from "../../core/UseCase";
import { SiretGateway } from "../ports/SirenGateway";
import { getSiretEstablishmentFromApi } from "../service/getSirenEstablishmentFromApi";

export class GetSiretIfNotAlreadySaved extends TransactionalUseCase<
  GetSiretRequestDto,
  SiretEstablishmentDto
> {
  constructor(
    uowPerformer: UnitOfWorkPerformer,
    private readonly siretGateway: SiretGateway,
  ) {
    super(uowPerformer);
  }

  inputSchema = getSiretRequestSchema;

  public async _execute(
    params: GetSiretRequestDto,
    uow: UnitOfWork,
  ): Promise<SiretEstablishmentDto> {
    const { siret } = params;
    const isEstablishmentWithProvidedSiretAlreadyInDb =
      await uow.establishmentAggregateRepository.hasEstablishmentWithSiret(
        siret,
      );

    if (isEstablishmentWithProvidedSiretAlreadyInDb) {
      throw new ConflictError(
        `Establishment with siret ${siret} already in db`,
      );
    }

    return getSiretEstablishmentFromApi(params, this.siretGateway);
  }
}
