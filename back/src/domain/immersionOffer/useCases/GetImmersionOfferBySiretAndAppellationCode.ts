import {
  ApiConsumer,
  SearchImmersionResultDto,
  SiretAndAppellationDto,
  siretAndAppellationSchema,
} from "shared";
import { NotFoundError } from "../../../adapters/primary/helpers/httpErrors";
import { UnitOfWork, UnitOfWorkPerformer } from "../../core/ports/UnitOfWork";
import { TransactionalUseCase } from "../../core/UseCase";

export class GetImmersionOfferBySiretAndAppellationCode extends TransactionalUseCase<
  SiretAndAppellationDto,
  SearchImmersionResultDto,
  ApiConsumer
> {
  constructor(uowPerformer: UnitOfWorkPerformer) {
    super(uowPerformer);
  }

  inputSchema = siretAndAppellationSchema;

  public async _execute(
    siretAndAppellationDto: SiretAndAppellationDto,
    uow: UnitOfWork,
  ): Promise<SearchImmersionResultDto> {
    const { siret, appellationCode } = siretAndAppellationDto;

    const searchImmersionResultDto =
      await uow.establishmentAggregateRepository.getSearchImmersionResultDtoBySiretAndAppellationCode(
        siret,
        appellationCode,
      );

    if (!searchImmersionResultDto)
      throw new NotFoundError(
        `No offer found for siret ${siret} and appellation code ${appellationCode}`,
      );
    return searchImmersionResultDto;
  }
}
