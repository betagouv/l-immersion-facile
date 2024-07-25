import {
  AppellationAndRomeDto,
  AppellationCode,
  DateTimeIsoString,
  LocationId,
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
  nextAvailabilityDate?: DateTimeIsoString;
};

export type SearchImmersionParams = {
  searchMade: SearchMade;
  maxResults?: number;
};

export type EstablishmentAggregateFilters = { contactEmail: string };

export interface EstablishmentAggregateRepository {
  //Establishment aggregate
  delete(siret: SiretDto): Promise<void>;
  insertEstablishmentAggregate(
    establishmentAggregate: EstablishmentAggregate,
  ): Promise<void>;
  updateEstablishmentAggregate(
    establishmentAggregate: EstablishmentAggregate,
    updatedAt: Date,
  ): Promise<void>;
  getEstablishmentAggregateBySiret(
    siret: string,
  ): Promise<EstablishmentAggregate | undefined>;
  getEstablishmentAggregatesByFilters({
    contactEmail,
  }: EstablishmentAggregateFilters): Promise<EstablishmentAggregate[]>;
  hasEstablishmentAggregateWithSiret(siret: string): Promise<boolean>;
  updateEstablishmentsWithInseeData(
    inseeCheckDate: Date,
    params: UpdateEstablishmentsWithInseeDataParams,
  ): Promise<void>;
  markEstablishmentAsSearchableWhenRecentDiscussionAreUnderMaxContactPerMonth(
    fromDate: Date,
  ): Promise<number>;

  //Offers
  getOffersAsAppellationAndRomeDtosBySiret(
    siret: string,
  ): Promise<AppellationAndRomeDto[]>;

  //SearchResult & SearchImmersionResults
  getSearchImmersionResultDtoBySearchQuery(
    siret: SiretDto,
    appellationCode: AppellationCode,
    locationId: LocationId,
  ): Promise<SearchResultDto | undefined>;
  searchImmersionResults(
    searchImmersionParams: SearchImmersionParams,
  ): Promise<SearchImmersionResult[]>;

  //Sirets
  getSiretsOfEstablishmentsWithRomeCode(rome: string): Promise<SiretDto[]>;
  getSiretOfEstablishmentsToSuggestUpdate(before: Date): Promise<SiretDto[]>;
  getSiretsOfEstablishmentsNotCheckedAtInseeSince(
    checkDate: Date,
    maxResults: number,
  ): Promise<SiretDto[]>;
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
