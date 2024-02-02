import {
  CommonJwtPayload,
  EstablishmentBatchReport,
  FormEstablishmentBatchDto,
  castError,
  formEstablishmentBatchSchema,
  slugify,
  splitInChunks,
} from "shared";
import { UseCase } from "../../core/UseCase";
import { UnitOfWorkPerformer } from "../../core/ports/UnitOfWork";
import { GroupEntity } from "../entities/GroupEntity";
import { AddFormEstablishment } from "./AddFormEstablishment";

export class AddFormEstablishmentBatch extends UseCase<
  FormEstablishmentBatchDto,
  EstablishmentBatchReport,
  CommonJwtPayload
> {
  protected inputSchema = formEstablishmentBatchSchema;

  constructor(
    private addFormEstablishmentUseCase: AddFormEstablishment,
    private uowPerformer: UnitOfWorkPerformer,
  ) {
    super();
  }

  protected async _execute({
    formEstablishments,
    groupName,
    description,
    title,
  }: FormEstablishmentBatchDto): Promise<EstablishmentBatchReport> {
    const group: GroupEntity = {
      slug: slugify(groupName),
      name: groupName,
      sirets: formEstablishments.map(({ siret }) => siret),
      options: {
        heroHeader: {
          title,
          description,
        },
      },
    };
    await this.uowPerformer.perform((uow) => uow.groupRepository.save(group));

    const sizeOfChunk = 15;
    const chunksOfFormEstablishments = splitInChunks(
      formEstablishments,
      sizeOfChunk,
    );

    const report: EstablishmentBatchReport = {
      numberOfEstablishmentsProcessed: 0,
      numberOfSuccess: 0,
      failures: [],
    };

    for (let i = 0; i < chunksOfFormEstablishments.length; i++) {
      const chunkOfFormEstablishments = chunksOfFormEstablishments[i];
      await Promise.all(
        chunkOfFormEstablishments.map(async (formEstablishment) => {
          try {
            await this.addFormEstablishmentUseCase.execute(formEstablishment);
            report.numberOfSuccess += 1;
          } catch (error) {
            report.failures.push({
              siret: formEstablishment.siret,
              errorMessage: castError(error).message,
            });
          } finally {
            report.numberOfEstablishmentsProcessed += 1;
          }
        }),
      );
    }

    return report;
  }
}
