import subDays from "date-fns/subDays";
import { keys } from "ramda";
import { z } from "zod";
import { SiretDto, SiretEstablishmentDto } from "shared";
import { TimeGateway } from "../../core/ports/TimeGateway";
import { UnitOfWork, UnitOfWorkPerformer } from "../../core/ports/UnitOfWork";
import { UseCase } from "../../core/UseCase";
import { SiretGateway } from "../../sirene/ports/SirenGateway";
import {
  UpdateEstablishmentsWithInseeDataParams,
  ValuesToUpdateFromInseeApi,
} from "../ports/EstablishmentAggregateRepository";

type Report = {
  numberOfEstablishmentsToUpdate: number;
  establishmentWithNewData: number;
  callsToInseeApi: number;
};

type BatchReport = {
  numberOfEstablishmentsToUpdateInBatch: number;
  establishmentWithNewDataInBatch: number;
};

export class UpdateEstablishmentsFromSirenApiScript extends UseCase<
  void,
  Report
> {
  private callsToInseeApi = 0;

  inputSchema = z.void();

  private processOneBatch = async (
    now: Date,
    since: Date,
    // offset: number,
  ): Promise<BatchReport> => {
    const establishmentSiretsToUpdate: SiretDto[] =
      await this.uowPerformer.perform(async (uow: UnitOfWork) =>
        uow.establishmentAggregateRepository.getSiretsOfEstablishmentsNotCheckedAtInseeSince(
          since,
          this.maxEstablishmentsPerBatch,
        ),
      );

    const siretEstablishmentsWithChanges =
      await this.getEstablishmentsUpdatesFromInsee(
        since,
        now,
        establishmentSiretsToUpdate,
      );

    const paramsToUpdate: UpdateEstablishmentsWithInseeDataParams =
      establishmentSiretsToUpdate.reduce(
        (acc, siret): UpdateEstablishmentsWithInseeDataParams => ({
          ...acc,
          [siret]: siretEstablishmentToValuesToUpdateInEstablishment(
            siretEstablishmentsWithChanges[siret],
          ),
        }),
        {} satisfies UpdateEstablishmentsWithInseeDataParams,
      );

    await this.uowPerformer.perform(async (uow: UnitOfWork) =>
      uow.establishmentAggregateRepository.updateEstablishmentsWithInseeData(
        now,
        paramsToUpdate,
      ),
    );

    return {
      numberOfEstablishmentsToUpdateInBatch: establishmentSiretsToUpdate.length,
      establishmentWithNewDataInBatch: keys(siretEstablishmentsWithChanges)
        .length,
    };
  };

  constructor(
    private uowPerformer: UnitOfWorkPerformer,
    private readonly siretGateway: SiretGateway,
    private readonly timeGateway: TimeGateway,
    private readonly numberOfDaysAgoToCheckForInseeUpdates: number = 30,
    private readonly maxEstablishmentsPerBatch: number = 1000,
    private readonly maxEstablishmentsPerFullRun: number = 5000,
  ) {
    super();
  }

  public async _execute(_: void): Promise<Report> {
    this.callsToInseeApi = 0;
    const now = this.timeGateway.now();
    const since = subDays(now, this.numberOfDaysAgoToCheckForInseeUpdates);

    let offset = 0;
    let numberOfEstablishmentsToUpdate = 0;
    let establishmentWithNewData = 0;

    while (this.maxEstablishmentsPerFullRun > offset) {
      const {
        numberOfEstablishmentsToUpdateInBatch,
        establishmentWithNewDataInBatch,
      } = await this.processOneBatch(now, since);

      numberOfEstablishmentsToUpdate += numberOfEstablishmentsToUpdateInBatch;
      establishmentWithNewData += establishmentWithNewDataInBatch;

      const areThereMoreEstablishmentsToUpdate =
        numberOfEstablishmentsToUpdateInBatch ===
        this.maxEstablishmentsPerBatch;

      offset = areThereMoreEstablishmentsToUpdate
        ? offset + this.maxEstablishmentsPerBatch
        : this.maxEstablishmentsPerFullRun;
    }

    return {
      numberOfEstablishmentsToUpdate,
      establishmentWithNewData,
      callsToInseeApi: this.callsToInseeApi,
    };
  }

  private async getEstablishmentsUpdatesFromInsee(
    since: Date,
    now: Date,
    establishmentSiretsToUpdate: SiretDto[],
  ): Promise<Partial<Record<SiretDto, SiretEstablishmentDto>>> {
    if (establishmentSiretsToUpdate.length > 0) {
      const results = await this.siretGateway.getEstablishmentUpdatedBetween(
        since,
        now,
        establishmentSiretsToUpdate,
      );
      this.callsToInseeApi++;
      return results;
    }

    return {};
  }
}

const siretEstablishmentToValuesToUpdateInEstablishment = (
  params: Partial<SiretEstablishmentDto> = {},
): Partial<ValuesToUpdateFromInseeApi> => ({
  ...(params.nafDto !== undefined ? { nafDto: params.nafDto } : {}),
  ...(params.businessName !== undefined ? { name: params.businessName } : {}),
  ...(params.isOpen !== undefined ? { isOpen: params.isOpen } : {}),
  ...(params.numberEmployeesRange !== undefined
    ? { numberEmployeesRange: params.numberEmployeesRange }
    : {}),
});
