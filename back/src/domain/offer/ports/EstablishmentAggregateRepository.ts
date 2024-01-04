import {
  AppellationAndRomeDto,
  AppellationCode,
  SearchResultDto,
  SiretDto,
} from "shared";
import {
  EstablishmentAggregate,
  EstablishmentEntity,
} from "../entities/EstablishmentEntity";
import { OfferEntity } from "../entities/OfferEntity";
import { SearchMade } from "../entities/SearchMadeEntity";

export type OfferWithSiret = OfferEntity & { siret: SiretDto };
export type SearchImmersionResult = SearchResultDto & {
  isSearchable: boolean;
};

export type SearchImmersionParams = {
  searchMade: SearchMade;
  maxResults?: number;
};

export interface EstablishmentAggregateRepository {
  delete(siret: SiretDto): Promise<void>;
  insertEstablishmentAggregates(
    establishmentAggregates: EstablishmentAggregate[],
  ): Promise<void>;

  updateEstablishmentAggregate(
    establishmentAggregate: EstablishmentAggregate,
    updatedAt: Date,
  ): Promise<void>;

  updateEstablishment(
    propertiesToUpdate: Partial<EstablishmentEntity> & {
      updatedAt: Date;
      siret: SiretDto;
    },
  ): Promise<void>;

  markEstablishmentAsSearchableWhenRecentDiscussionAreUnderMaxContactPerWeek(
    fromDate: Date,
  ): Promise<number>;

  updateEstablishmentsWithInseeData(
    inseeCheckDate: Date,
    params: UpdateEstablishmentsWithInseeDataParams,
  ): Promise<void>;

  hasEstablishmentWithSiret(siret: string): Promise<boolean>;

  getEstablishmentAggregateBySiret(
    siret: string,
  ): Promise<EstablishmentAggregate | undefined>;

  getOffersAsAppellationDtoEstablishment(
    siret: string,
  ): Promise<AppellationAndRomeDto[]>;

  getSearchImmersionResultDtoBySiretAndAppellationCode(
    siret: SiretDto,
    appellationCode: AppellationCode,
  ): Promise<SearchResultDto | undefined>;

  getSiretsOfEstablishmentsWithRomeCode(rome: string): Promise<SiretDto[]>;

  getSiretOfEstablishmentsToSuggestUpdate(before: Date): Promise<SiretDto[]>;

  getSiretsOfEstablishmentsNotCheckedAtInseeSince(
    checkDate: Date,
    maxResults: number,
  ): Promise<SiretDto[]>;

  searchImmersionResults(
    searchImmersionParams: SearchImmersionParams,
  ): Promise<SearchImmersionResult[]>;
}

export type ValuesToUpdateFromInseeApi = Partial<
  Pick<
    EstablishmentEntity,
    "name" | "numberEmployeesRange" | "isOpen" | "nafDto"
  >
>;

export type UpdateEstablishmentsWithInseeDataParams = Partial<
  Record<SiretDto, ValuesToUpdateFromInseeApi>
>;

export const establishmentNotFoundErrorMessage = (siret: SiretDto): string =>
  `Establishment with siret ${siret} not found`;
