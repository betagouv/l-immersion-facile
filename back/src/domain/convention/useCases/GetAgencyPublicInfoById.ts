import {
  AgencyPublicDisplayDto,
  toAgencyPublicDisplayDto,
  WithAgencyId,
  withAgencyIdSchema,
} from "shared";
import { NotFoundError } from "../../../adapters/primary/helpers/httpErrors";
import { UnitOfWork, UnitOfWorkPerformer } from "../../core/ports/UnitOfWork";
import { TransactionalUseCase } from "../../core/UseCase";

export class GetAgencyPublicInfoById extends TransactionalUseCase<
  WithAgencyId,
  AgencyPublicDisplayDto
> {
  protected inputSchema = withAgencyIdSchema;

  constructor(uowPerformer: UnitOfWorkPerformer) {
    super(uowPerformer);
  }

  public async _execute(
    { agencyId }: WithAgencyId,
    uow: UnitOfWork,
  ): Promise<AgencyPublicDisplayDto> {
    const [agencyDto] = await uow.agencyRepository.getByIds([agencyId]);
    if (!agencyDto) throw new NotFoundError(agencyId);
    const referedAgency =
      agencyDto.refersToAgencyId &&
      (await uow.agencyRepository.getById(agencyDto.refersToAgencyId));
    return toAgencyPublicDisplayDto(agencyDto, referedAgency);
  }
}
