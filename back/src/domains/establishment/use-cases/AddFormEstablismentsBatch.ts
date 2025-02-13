import {
  EstablishmentBatchReport,
  FormEstablishmentBatchDto,
  InclusionConnectedUser,
  castError,
  formEstablishmentBatchSchema,
  slugify,
  splitInChunks,
} from "shared";
import { UseCase } from "../../core/UseCase";
import { UnitOfWorkPerformer } from "../../core/unit-of-work/ports/UnitOfWorkPerformer";
import { throwIfNotAdmin } from "../../inclusion-connected-users/helpers/authorization.helper";
import { GroupEntity } from "../entities/GroupEntity";
import { InsertEstablishmentAggregateFromForm } from "./InsertEstablishmentAggregateFromFormEstablishement";

export class AddFormEstablishmentBatch extends UseCase<
  FormEstablishmentBatchDto,
  EstablishmentBatchReport,
  InclusionConnectedUser
> {
  protected inputSchema = formEstablishmentBatchSchema;

  constructor(
    private insertEstablishmentAggregateFromForm: InsertEstablishmentAggregateFromForm,
    private uowPerformer: UnitOfWorkPerformer,
  ) {
    super();
  }

  protected async _execute(
    {
      formEstablishments,
      groupName,
      description,
      title,
    }: FormEstablishmentBatchDto,
    currentUser: InclusionConnectedUser,
  ): Promise<EstablishmentBatchReport> {
    throwIfNotAdmin(currentUser);
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
            await this.insertEstablishmentAggregateFromForm.execute({
              formEstablishment,
            });
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
