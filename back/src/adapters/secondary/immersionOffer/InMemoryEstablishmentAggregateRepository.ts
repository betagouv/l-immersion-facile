import { uniq } from "ramda";
import {
  AppellationAndRomeDto,
  AppellationCode,
  conflictErrorSiret,
  GeoPositionDto,
  path,
  pathEq,
  pathNotEq,
  replaceArrayElement,
  RomeCode,
  SearchImmersionResultDto,
  SiretDto,
} from "shared";
import {
  EstablishmentAggregate,
  EstablishmentEntity,
} from "../../../domain/immersionOffer/entities/EstablishmentEntity";
import {
  EstablishmentAggregateRepository,
  SearchImmersionParams,
  SearchImmersionResult,
  UpdateEstablishmentsWithInseeDataParams,
} from "../../../domain/immersionOffer/ports/EstablishmentAggregateRepository";
import { distanceBetweenCoordinatesInMeters } from "../../../utils/distanceBetweenCoordinatesInMeters";
import { ConflictError, NotFoundError } from "../../primary/helpers/httpErrors";

export const TEST_NAF_LABEL = "test_naf_label";
export const TEST_ROME_LABEL = "test_rome_label";
export const TEST_APPELLATION_LABEL = "test_appellation_label";
export const TEST_APPELLATION_CODE = "12345";
export const TEST_POSITION = { lat: 43.8666, lon: 8.3333 };

export class InMemoryEstablishmentAggregateRepository
  implements EstablishmentAggregateRepository
{
  constructor(
    private _establishmentAggregates: EstablishmentAggregate[] = [],
  ) {}

  public getSiretOfEstablishmentsToSuggestUpdate(): Promise<SiretDto[]> {
    throw new Error(
      "Method not implemented : getSiretOfEstablishmentsToSuggestUpdate, you can use PG implementation instead",
    );
  }

  public async markEstablishmentAsSearchableWhenRecentDiscussionAreUnderMaxContactPerWeek(): Promise<number> {
    // not implemented because this method is used only in a script,
    // and the use case consists only in a PG query
    throw new Error("NOT implemented");
  }

  public async insertEstablishmentAggregates(
    aggregates: EstablishmentAggregate[],
  ) {
    this._establishmentAggregates = [
      ...this._establishmentAggregates,
      ...aggregates,
    ];
  }

  public async updateEstablishmentAggregate(aggregate: EstablishmentAggregate) {
    const aggregateIndex = this._establishmentAggregates.findIndex(
      pathEq("establishment.siret", aggregate.establishment.siret),
    );
    if (aggregateIndex === -1)
      throw new NotFoundError(
        `We do not have an establishment with siret ${aggregate.establishment.siret} to update`,
      );
    this._establishmentAggregates = replaceArrayElement(
      this._establishmentAggregates,
      aggregateIndex,
      aggregate,
    );
  }

  public async getEstablishmentAggregateBySiret(
    siret: SiretDto,
  ): Promise<EstablishmentAggregate | undefined> {
    return this._establishmentAggregates.find(
      pathEq("establishment.siret", siret),
    );
  }

  public async searchImmersionResults({
    searchMade: { lat, lon, rome },
    withContactDetails = false,
    maxResults,
  }: SearchImmersionParams): Promise<SearchImmersionResult[]> {
    return this._establishmentAggregates
      .filter((aggregate) => aggregate.establishment.isActive)
      .flatMap((aggregate) =>
        uniq(aggregate.immersionOffers.map((offer) => offer.romeCode))
          .filter((uniqRome) => !rome || rome === uniqRome)
          .map((matchedRome) =>
            buildSearchImmersionResultDtoForOneEstablishmentAndOneRome(
              aggregate,
              withContactDetails,
              matchedRome,
              {
                lat,
                lon,
              },
            ),
          ),
      )
      .slice(0, maxResults);
  }

  public async getSearchImmersionResultDtoBySiretAndRome(
    siret: SiretDto,
    rome: string,
  ): Promise<SearchImmersionResultDto | undefined> {
    const aggregate = this.establishmentAggregates.find(
      (aggregate) => aggregate.establishment.siret === siret,
    );
    if (!aggregate) return undefined;
    const {
      contactDetails,
      isSearchable,
      ...buildSearchImmersionResultWithoutContactDetailsAndIsSearchable
    } = buildSearchImmersionResultDtoForOneEstablishmentAndOneRome(
      aggregate,
      false,
      rome,
    );
    return buildSearchImmersionResultWithoutContactDetailsAndIsSearchable;
  }

  public async updateEstablishment(
    propertiesToUpdate: Partial<EstablishmentEntity> & {
      updatedAt: Date;
      siret: SiretDto;
    },
  ): Promise<void> {
    this._establishmentAggregates = this._establishmentAggregates.map(
      (aggregate) =>
        aggregate.establishment.siret === propertiesToUpdate.siret
          ? {
              ...aggregate,
              establishment: {
                ...aggregate.establishment,
                ...JSON.parse(JSON.stringify(propertiesToUpdate)), // parse and stringify to drop undefined values from propertiesToUpdate (Does not work with clone() from ramda)
                updatedAt: propertiesToUpdate.updatedAt,
              },
            }
          : aggregate,
    );
  }

  public async hasEstablishmentWithSiret(siret: string): Promise<boolean> {
    if (siret === conflictErrorSiret)
      throw new ConflictError(
        `Establishment with siret ${siret} already in db`,
      );
    return !!this._establishmentAggregates.find(
      (aggregate) => aggregate.establishment.siret === siret,
    );
  }

  public async removeEstablishmentAndOffersAndContactWithSiret(
    siret: string,
  ): Promise<void> {
    this.establishmentAggregates = this._establishmentAggregates.filter(
      pathNotEq("establishment.siret", siret),
    );
  }

  public async getOffersAsAppellationDtoEstablishment(
    siret: string,
  ): Promise<AppellationAndRomeDto[]> {
    return (
      this.establishmentAggregates
        .find(pathEq("establishment.siret", siret))
        ?.immersionOffers.map((offer) => ({
          romeCode: offer.romeCode,
          appellationCode: offer.appellationCode?.toString() ?? "", // Should not be undefined though
          romeLabel: TEST_ROME_LABEL,
          appellationLabel: TEST_APPELLATION_LABEL,
        })) ?? []
    );
  }

  public async getSearchImmersionResultDtoBySiretAndAppellationCode(
    siret: SiretDto,
    appellationCode: AppellationCode,
  ): Promise<SearchImmersionResultDto | undefined> {
    const aggregate = this.establishmentAggregates.find(
      (aggregate) => aggregate.establishment.siret === siret,
    );
    if (!aggregate) return;
    const immersionOffer = aggregate.immersionOffers.find(
      (offer) => offer.appellationCode === appellationCode,
    );
    if (!immersionOffer) return;
    return {
      rome: immersionOffer.romeCode,
      romeLabel: TEST_ROME_LABEL,
      appellations: [
        {
          appellationCode: immersionOffer.appellationCode,
          appellationLabel: immersionOffer.appellationLabel,
        },
      ],
      naf: aggregate.establishment.nafDto.code,
      nafLabel: aggregate.establishment.nafDto.nomenclature,
      siret,
      name: aggregate.establishment.name,
      customizedName: aggregate.establishment.customizedName,
      voluntaryToImmersion: aggregate.establishment.voluntaryToImmersion,
      numberOfEmployeeRange: aggregate.establishment.numberEmployeesRange,
      position: aggregate.establishment.position,
      address: aggregate.establishment.address,
      contactMode: aggregate.contact?.contactMethod,
    };
  }

  async getSiretsOfEstablishmentsWithRomeCode(
    rome: string,
  ): Promise<SiretDto[]> {
    return this._establishmentAggregates
      .filter(
        (aggregate) =>
          !!aggregate.immersionOffers.find((offer) => offer.romeCode === rome),
      )
      .map(path("establishment.siret"));
  }

  public async getSiretsOfEstablishmentsNotCheckedAtInseeSince(
    checkDate: Date,
    maxResults: number,
  ): Promise<SiretDto[]> {
    return this._establishmentAggregates
      .filter(
        (establishmentAggregate) =>
          !establishmentAggregate.establishment.lastInseeCheckDate ||
          establishmentAggregate.establishment.lastInseeCheckDate < checkDate,
      )
      .map(({ establishment }) => establishment.siret)
      .slice(0, maxResults);
  }

  public async updateEstablishmentsWithInseeData(
    inseeCheckDate: Date,
    params: UpdateEstablishmentsWithInseeDataParams,
  ): Promise<void> {
    this._establishmentAggregates = this._establishmentAggregates.map(
      (aggregate) => {
        const newValues = params[aggregate.establishment.siret];
        return newValues
          ? {
              ...aggregate,
              establishment: {
                ...aggregate.establishment,
                ...newValues,
                lastInseeCheckDate: inseeCheckDate,
              },
            }
          : aggregate;
      },
    );
  }

  // for test purposes only :
  get establishmentAggregates() {
    return this._establishmentAggregates;
  }

  set establishmentAggregates(
    establishmentAggregates: EstablishmentAggregate[],
  ) {
    this._establishmentAggregates = establishmentAggregates;
  }
}

const buildSearchImmersionResultDtoForOneEstablishmentAndOneRome = (
  establishmentAgg: EstablishmentAggregate,
  withContactDetails: boolean,
  searchedRome: RomeCode,
  position?: GeoPositionDto,
): SearchImmersionResult => ({
  address: establishmentAgg.establishment.address,
  naf: establishmentAgg.establishment.nafDto.code,
  nafLabel: establishmentAgg.establishment.nafDto.nomenclature,
  name: establishmentAgg.establishment.name,
  customizedName: establishmentAgg.establishment.customizedName,
  rome: searchedRome,
  romeLabel: TEST_ROME_LABEL,
  appellations: establishmentAgg.immersionOffers
    .filter((immersionOffer) => immersionOffer.romeCode === searchedRome)
    .map((immersionOffer) => ({
      appellationLabel: immersionOffer.appellationLabel,
      appellationCode: immersionOffer.appellationCode,
    })),
  siret: establishmentAgg.establishment.siret,
  voluntaryToImmersion: establishmentAgg.establishment.voluntaryToImmersion,
  contactMode: establishmentAgg.contact?.contactMethod,
  numberOfEmployeeRange: establishmentAgg.establishment.numberEmployeesRange,
  website: establishmentAgg.establishment?.website,
  additionalInformation: establishmentAgg.establishment?.additionalInformation,
  distance_m: position
    ? distanceBetweenCoordinatesInMeters(
        establishmentAgg.establishment.position.lat,
        establishmentAgg.establishment.position.lon,
        position.lat,
        position.lon,
      )
    : undefined,
  position: establishmentAgg.establishment.position,
  ...(withContactDetails &&
    establishmentAgg.contact && {
      contactDetails: {
        id: establishmentAgg.contact.id,
        firstName: establishmentAgg.contact.firstName,
        lastName: establishmentAgg.contact.lastName,
        email: establishmentAgg.contact.email,
        phone: establishmentAgg.contact.phone,
        job: establishmentAgg.contact.job,
      },
    }),
  isSearchable: establishmentAgg.establishment.isSearchable,
});
