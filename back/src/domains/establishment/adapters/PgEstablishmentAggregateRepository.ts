import { sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { equals, pick } from "ramda";
import {
  AppellationAndRomeDto,
  AppellationCode,
  AppellationDto,
  DateTimeIsoString,
  EstablishmentSearchableByValue,
  LocationId,
  NafCode,
  RomeCode,
  SearchSortedBy,
  SiretDto,
  castError,
  errors,
  pipeWithValue,
} from "shared";
import {
  KyselyDb,
  jsonBuildObject,
  jsonStripNulls,
} from "../../../config/pg/kysely/kyselyUtils";
import { createLogger } from "../../../utils/logger";
import { EstablishmentAggregate } from "../entities/EstablishmentAggregate";
import { EstablishmentEntity } from "../entities/EstablishmentEntity";
import { OfferEntity } from "../entities/OfferEntity";
import { GeoParams } from "../entities/SearchMadeEntity";
import {
  EstablishmentAggregateFilters,
  EstablishmentAggregateRepository,
  OfferWithSiret,
  RepositorySearchImmertionResult,
  RepositorySearchResultDto,
  SearchImmersionParams,
  UpdateEstablishmentsWithInseeDataParams,
} from "../ports/EstablishmentAggregateRepository";
import { hasSearchGeoParams } from "../use-cases/SearchImmersion";

const logger = createLogger(__filename);
const MAX_RESULTS_HARD_LIMIT = 100;

export class PgEstablishmentAggregateRepository
  implements EstablishmentAggregateRepository
{
  constructor(private transaction: KyselyDb) {}

  public async getAllEstablishmentAggregatesForTest(): Promise<
    EstablishmentAggregate[]
  > {
    const aggregateWithStringDates = await establishmentByFiltersQueryBuilder(
      this.transaction,
    ).execute();
    return aggregateWithStringDates.map(({ aggregate }) =>
      makeEstablishmentAggregateFromDb(aggregate),
    );
  }

  public async getEstablishmentAggregateBySiret(
    siret: SiretDto,
  ): Promise<EstablishmentAggregate | undefined> {
    const aggregates = await establishmentByFiltersQueryBuilder(
      this.transaction,
    )
      .where("e.siret", "=", siret)
      .execute();
    const aggregate = aggregates.at(0);
    return aggregate && makeEstablishmentAggregateFromDb(aggregate.aggregate);
  }

  public async getEstablishmentAggregatesByFilters({
    userId,
  }: EstablishmentAggregateFilters): Promise<EstablishmentAggregate[]> {
    const aggregates = await establishmentByFiltersQueryBuilder(
      this.transaction,
    )
      .leftJoin(
        "establishments__users",
        "establishments__users.siret",
        "e.siret",
      )
      .where("establishments__users.user_id", "=", userId)
      .execute();
    return aggregates.map(({ aggregate }) =>
      makeEstablishmentAggregateFromDb(aggregate),
    );
  }

  public async createImmersionOffersToEstablishments(
    offersWithSiret: OfferWithSiret[],
  ) {
    if (offersWithSiret.length === 0) return;

    await this.transaction
      .insertInto("immersion_offers")
      .values(
        offersWithSiret.map((offerWithSiret) => ({
          appellation_code: parseInt(offerWithSiret.appellationCode),
          siret: offerWithSiret.siret,
          created_at: sql`${offerWithSiret.createdAt.toISOString()}`,
        })),
      )
      .execute();
  }

  public async delete(siret: string): Promise<void> {
    logger.info({
      message: `About to delete establishment with siret : ${siret}`,
    });

    await this.#deleteUserRightsBySiret(siret);

    return this.transaction
      .deleteFrom("establishments")
      .where("siret", "=", siret)
      .returning("siret")
      .execute()
      .then((result) => {
        if (result.length !== 1)
          throw errors.establishment.missingAggregate({ siret });
        logger.info({
          message: `Deleted establishment successfully. Siret was : ${siret}`,
        });
      })
      .catch((error) => {
        logger.info({
          message: `Error when deleting establishment with siret ${siret} : ${error.message}`,
        });
        logger.info({ message: "Full Error", error });
        throw error;
      });
  }

  public async getOffersAsAppellationAndRomeDtosBySiret(
    siret: string,
  ): Promise<AppellationAndRomeDto[]> {
    const results = await this.transaction
      .selectFrom("immersion_offers as io")
      .leftJoin(
        "public_appellations_data as pad",
        "pad.ogr_appellation",
        "io.appellation_code",
      )
      .fullJoin("public_romes_data as prd", "prd.code_rome", "pad.code_rome")
      .select([
        "prd.code_rome",
        "prd.libelle_rome",
        "pad.libelle_appellation_long",
        "pad.ogr_appellation",
      ])
      .where("io.siret", "=", siret)
      .execute();

    return results.map(
      ({
        code_rome,
        libelle_rome,
        libelle_appellation_long,
        ogr_appellation,
      }) => {
        if (!code_rome) throw new Error("code_rome is null");
        if (!libelle_rome) throw new Error("libelle_rome is null");
        if (!libelle_appellation_long)
          throw new Error("libelle_appellation_long is null");
        if (!ogr_appellation) throw new Error("ogr_appellation is null");
        const dto: AppellationAndRomeDto = {
          romeCode: code_rome,
          appellationCode: ogr_appellation.toString(),
          romeLabel: libelle_rome,
          appellationLabel: libelle_appellation_long, // libelle_appellation_long should not be undefined
        };
        return dto;
      },
    );
  }

  public async getSiretOfEstablishmentsToSuggestUpdate(
    before: Date,
  ): Promise<SiretDto[]> {
    const result = await this.transaction
      .selectFrom("establishments")
      .select("establishments.siret")
      .distinct()
      .where("establishments.update_date", "<", before)
      .where(({ not, exists, selectFrom }) =>
        not(
          exists(
            selectFrom("notifications_email as n")
              .select(sql`1`.as("__"))
              .where("n.email_kind", "=", "SUGGEST_EDIT_FORM_ESTABLISHMENT")
              .whereRef("n.establishment_siret", "=", "establishments.siret")
              .where("n.created_at", ">", before)
              .limit(1),
          ),
        ),
      )
      .execute();

    return result.map(({ siret }) => siret);
  }

  public async getSiretsOfEstablishmentsNotCheckedAtInseeSince(
    checkDate: Date,
    maxResults: number,
  ): Promise<SiretDto[]> {
    const maxLimit = 1000;
    if (maxResults > maxLimit)
      throw errors.establishment.outOfMaxLimit({
        kind: "getSiretsOfEstablishmentsNotCheckedAtInseeSince",
        maxLimit,
      });

    const results = await this.transaction
      .selectFrom("establishments")
      .select("siret")
      .where((eb) =>
        eb.or([
          eb("last_insee_check_date", "is", null),
          eb("last_insee_check_date", "<", checkDate),
        ]),
      )
      .limit(maxResults)
      .execute();

    return results.map(({ siret }) => siret);
  }

  public async getSiretsOfEstablishmentsWithRomeCode(
    rome: string,
  ): Promise<string[]> {
    const results = await this.transaction
      .selectFrom("immersion_offers")
      .select("siret")
      .leftJoin(
        "public_appellations_data",
        "public_appellations_data.ogr_appellation",
        "immersion_offers.appellation_code",
      )
      .where("public_appellations_data.code_rome", "=", rome)
      .execute();

    return results.map((row) => row.siret);
  }

  public async hasEstablishmentAggregateWithSiret(
    siret: string,
  ): Promise<boolean> {
    const result = await this.transaction
      .selectNoFrom(({ exists, selectFrom }) =>
        exists(
          selectFrom("establishments")
            .where("siret", "=", siret)
            .select("siret"),
        ).as("exist"),
      )
      .executeTakeFirst();

    return result !== undefined ? Boolean(result.exist) : false;
  }

  public async insertEstablishmentAggregate(aggregate: EstablishmentAggregate) {
    await this.#insertEstablishmentFromAggregate(aggregate);
    await this.#insertLocations(aggregate.establishment);
    await this.#insertUserRightsFromAggregate(aggregate);
    await this.createImmersionOffersToEstablishments(
      aggregate.offers.map((immersionOffer) => ({
        siret: aggregate.establishment.siret,
        ...immersionOffer,
      })),
    );
  }

  public async markEstablishmentAsSearchableWhenRecentDiscussionAreUnderMaxContactPerMonth(
    since: Date,
  ): Promise<number> {
    const result = await this.transaction
      .updateTable("establishments")
      .set({ is_max_discussions_for_period_reached: false })
      .where("is_max_discussions_for_period_reached", "=", true)
      .where("max_contacts_per_month", ">", 0)
      .where("siret", "not in", (eb) =>
        eb
          .selectFrom("establishments")
          .select("establishments.siret")
          .leftJoin("discussions", "establishments.siret", "discussions.siret")
          .where("is_max_discussions_for_period_reached", "=", true)
          .where("max_contacts_per_month", ">", 0)
          .where("discussions.created_at", ">", since)
          .groupBy("establishments.siret")
          .havingRef(
            (eb) => eb.fn.countAll(),
            ">=",
            "establishments.max_contacts_per_month",
          ),
      )
      .returning("siret")
      .execute();

    return result.length;
  }

  public async searchImmersionResults({
    searchMade,
    maxResults,
    fitForDisabledWorkers,
  }: SearchImmersionParams): Promise<RepositorySearchImmertionResult[]> {
    const results = await searchImmersionResultsQuery(this.transaction, {
      limit:
        maxResults && maxResults < MAX_RESULTS_HARD_LIMIT
          ? maxResults
          : MAX_RESULTS_HARD_LIMIT,
      filters: {
        geoParams:
          "lat" in searchMade
            ? pick(["lat", "lon", "distanceKm"], searchMade)
            : undefined,
        searchableBy: searchMade.establishmentSearchableBy,
        fitForDisabledWorkers,
        nafCodes: searchMade.nafCodes,
        romeCodes: searchMade.romeCode
          ? [searchMade.romeCode]
          : await this.#getRomeCodeFromAppellationCodes(
              searchMade.appellationCodes,
            ),
      },
      sortedBy: searchMade.sortedBy ?? "date",
    });

    return pgSearchResultsToSearchResults(results);
  }

  public async getSearchResultBySearchQuery(
    siret: SiretDto,
    appellationCode: AppellationCode,
    locationId: LocationId,
  ): Promise<RepositorySearchResultDto | undefined> {
    const results = await searchImmersionResultsQuery(this.transaction, {
      limit: 1,
      sortedBy: "date",
      filters: {
        siret,
        appellationCode,
        locationId,
      },
    });

    const searchResult = pgSearchResultsToSearchResults(results).at(0);

    if (!searchResult) return;

    const { isSearchable: _, nextAvailabilityDate: __, ...rest } = searchResult;

    return rest;
  }

  public async updateEstablishmentAggregate(
    updatedAggregate: EstablishmentAggregate,
    updatedAt: Date,
  ): Promise<void> {
    const existingAggregate = await this.getEstablishmentAggregateBySiret(
      updatedAggregate.establishment.siret,
    );
    if (!existingAggregate)
      throw errors.establishment.missingAggregate({
        siret: updatedAggregate.establishment.siret,
      });

    // Remove offers that don't exist anymore and create those that did not exist before
    await this.#updateImmersionOffersFromAggregates(
      existingAggregate,
      updatedAggregate,
    );
    // Update establishment if it has changed
    if (
      !establishmentsEqual(
        existingAggregate.establishment,
        updatedAggregate.establishment,
      )
    ) {
      await this.#updateEstablishmentEntity(
        updatedAggregate.establishment,
        updatedAt,
      );
    }

    await this.#deleteUserRightsBySiret(updatedAggregate.establishment.siret);
    await this.#insertUserRightsFromAggregate(updatedAggregate);
  }

  public async updateEstablishmentsWithInseeData(
    inseeCheckDate: Date,
    params: UpdateEstablishmentsWithInseeDataParams,
  ): Promise<void> {
    for (const [siret, values] of Object.entries(params)) {
      const isOpen =
        values?.isOpen !== undefined ? { is_open: values.isOpen } : {};
      const name = values?.name !== undefined ? { name: values.name } : {};
      const nafDto =
        values?.nafDto !== undefined
          ? {
              naf_code: values.nafDto.code,
              naf_nomenclature: values.nafDto.nomenclature,
            }
          : {};
      const numberEmployees =
        values?.numberEmployeesRange !== undefined
          ? { number_employees: values.numberEmployeesRange }
          : {};

      await this.transaction
        .updateTable("establishments")
        .set({
          last_insee_check_date: inseeCheckDate,
          ...isOpen,
          ...nafDto,
          ...name,
          ...numberEmployees,
        })
        .where("siret", "=", siret)
        .execute();
    }
  }

  async #updateEstablishmentEntity(
    establishment: EstablishmentEntity,
    updatedAt: Date,
  ): Promise<void> {
    await this.transaction
      .updateTable("establishments")
      .set({
        additional_information: establishment.additionalInformation ?? null,
        customized_name: establishment.customizedName ?? null,
        fit_for_disabled_workers: establishment.fitForDisabledWorkers ?? null,
        is_commited: establishment.isCommited ?? null,
        is_open: establishment.isOpen,
        is_max_discussions_for_period_reached:
          establishment.isMaxDiscussionsForPeriodReached,
        last_insee_check_date: establishment.lastInseeCheckDate ?? null,
        max_contacts_per_month: establishment.maxContactsPerMonth,
        naf_code: establishment.nafDto.code,
        naf_nomenclature: establishment.nafDto.nomenclature,
        name: establishment.name,
        next_availability_date: establishment.nextAvailabilityDate ?? null,
        number_employees: establishment.numberEmployeesRange,
        searchable_by_job_seekers: establishment.searchableBy.jobSeekers,
        searchable_by_students: establishment.searchableBy.students,
        siret: establishment.siret,
        source_provider: establishment.sourceProvider,
        update_date: updatedAt,
        website: establishment.website ?? null,
        contact_mode: establishment.contactMethod,
      })
      .where("siret", "=", establishment.siret)
      .execute();

    await this.transaction
      .deleteFrom("establishments_location_infos")
      .where("establishment_siret", "=", establishment.siret)
      .execute();

    await this.#insertLocations(establishment);
  }

  async #insertEstablishmentFromAggregate(aggregate: EstablishmentAggregate) {
    await this.transaction
      .insertInto("establishments")
      .values({
        siret: aggregate.establishment.siret,
        score: aggregate.establishment.score,
        name: aggregate.establishment.name,
        customized_name: aggregate.establishment.customizedName,
        website: aggregate.establishment.website,
        additional_information: aggregate.establishment.additionalInformation,
        number_employees: aggregate.establishment.numberEmployeesRange,
        naf_code: aggregate.establishment.nafDto.code,
        naf_nomenclature: aggregate.establishment.nafDto.nomenclature,
        source_provider: aggregate.establishment.sourceProvider,
        update_date: aggregate.establishment.updatedAt,
        is_open: aggregate.establishment.isOpen,
        is_max_discussions_for_period_reached:
          aggregate.establishment.isMaxDiscussionsForPeriodReached,
        is_commited: aggregate.establishment.isCommited,
        fit_for_disabled_workers: aggregate.establishment.fitForDisabledWorkers,
        max_contacts_per_month: aggregate.establishment.maxContactsPerMonth,
        last_insee_check_date: aggregate.establishment.lastInseeCheckDate,
        created_at: aggregate.establishment.createdAt,
        next_availability_date: aggregate.establishment.nextAvailabilityDate,
        searchable_by_students: aggregate.establishment.searchableBy.students,
        searchable_by_job_seekers:
          aggregate.establishment.searchableBy.jobSeekers,
        acquisition_keyword: aggregate.establishment.acquisitionKeyword,
        acquisition_campaign: aggregate.establishment.acquisitionCampaign,
        contact_mode: aggregate.establishment.contactMethod,
      })
      .execute();
  }

  async #insertUserRightsFromAggregate(
    aggregate: EstablishmentAggregate,
  ): Promise<void> {
    const { userRights } = aggregate;
    if (!userRights.length) return;

    return this.transaction
      .insertInto("establishments__users")
      .values(
        userRights.map((userRight) => ({
          siret: aggregate.establishment.siret,
          user_id: userRight.userId,
          role: userRight.role,
          job: userRight.job,
          phone: userRight.phone,
        })),
      )
      .execute()
      .then(() => {
        return;
      })
      .catch((error) => {
        logger.error({
          error: castError(error),
          message: "Error inserting contacts",
        });
        throw error;
      });
  }

  async #deleteUserRightsBySiret(siret: SiretDto): Promise<void> {
    await this.transaction
      .deleteFrom("establishments__users")
      .where("siret", "=", siret)
      .execute();
  }

  async #getRomeCodeFromAppellationCodes(
    appellationCodes: AppellationCode[] | undefined,
  ): Promise<RomeCode[] | undefined> {
    if (!appellationCodes) return;

    const result = await this.transaction
      .selectFrom("public_appellations_data")
      .select("code_rome")
      .where(
        "ogr_appellation",
        "in",
        appellationCodes.map((appellationCode) => parseInt(appellationCode)),
      )
      .execute();

    const romeCodes: RomeCode[] = result.map(({ code_rome }) => code_rome);

    if (romeCodes.length === 0)
      throw new Error(
        `No Rome code found for appellation codes ${appellationCodes}`,
      );

    return romeCodes;
  }

  async #updateImmersionOffersFromAggregates(
    existingAggregate: EstablishmentAggregate,
    updatingAggregate: EstablishmentAggregate,
  ) {
    const updatedOffers = updatingAggregate.offers;
    const existingOffers = existingAggregate.offers;
    const siret = existingAggregate.establishment.siret;

    const offersToAdd = updatedOffers.filter(
      (updatedOffer) =>
        !existingOffers.find((existingOffer) =>
          offersEqual(existingOffer, updatedOffer),
        ),
    );

    if (offersToAdd.length > 0)
      await this.transaction
        .insertInto("immersion_offers")
        .values(
          offersToAdd.map((offerToAdd) => ({
            appellation_code: parseInt(offerToAdd.appellationCode),
            created_at: sql`${offerToAdd.createdAt.toISOString()}`,
            siret,
          })),
        )
        .execute();

    const offersToRemove = existingOffers.filter(
      (updatedOffer) =>
        !updatedOffers.find((existingOffer) =>
          offersEqual(existingOffer, updatedOffer),
        ),
    );
    const offersToRemoveByRomeCode = offersToRemove
      .filter((offer) => !offer.appellationCode)
      .map((offer) => offer.romeCode);

    if (offersToRemoveByRomeCode.length > 0)
      await this.transaction
        .deleteFrom("immersion_offers")
        .leftJoin(
          "public_appellations_data",
          "immersion_offers.appellation_code",
          "public_appellations_data.ogr_appellation",
        )
        .where("siret", "=", siret)
        .where("appellation_code", "is", null)
        .where(
          "public_appellations_data.code_rome",
          "in",
          offersToRemoveByRomeCode,
        )
        .execute();

    const offersToRemoveByAppellationCode = offersToRemove
      .filter((offer) => !!offer.appellationCode)
      .map((offer) => offer.appellationCode);

    if (offersToRemoveByAppellationCode.length > 0)
      await this.transaction
        .deleteFrom("immersion_offers")
        .where("siret", "=", siret)
        .where(
          "appellation_code",
          "in",
          offersToRemoveByAppellationCode.map((appellationCode) =>
            parseInt(appellationCode),
          ),
        )
        .execute();
  }

  async #insertLocations(establishment: EstablishmentEntity) {
    await this.transaction
      .insertInto("establishments_location_infos")
      .values(
        establishment.locations.map(({ position, address, id }) => ({
          id,
          establishment_siret: establishment.siret,
          city: address.city,
          department_code: address.departmentCode,
          post_code: address.postcode,
          street_number_and_address: address.streetNumberAndAddress,
          lat: position.lat,
          lon: position.lon,
        })),
      )
      .execute();

    await this.transaction
      .insertInto("establishments_location_positions")
      .values((eb) =>
        establishment.locations.map(({ position, id }) => ({
          id,
          position: eb.fn("ST_GeographyFromText", [
            sql`${`POINT(${position.lon} ${position.lat})`}`,
          ]),
        })),
      )
      .execute();
  }
}

const offersEqual = (a: OfferEntity, b: OfferEntity) =>
  // Only compare romeCode and appellationCode
  a.appellationCode === b.appellationCode;

const objectsDeepEqual = <T>(a: T, b: T) =>
  equals(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b))); // replacing with clone() would does not work here

const establishmentsEqual = (
  a: EstablishmentEntity,
  b: EstablishmentEntity,
) => {
  // Ignore key updatedAt
  const { updatedAt: _unusedUpdatedAtA, ...establishmentAWithoutUpdatedAt } = a;
  const { updatedAt: _unusedUpdatedAtB, ...establishmentBWithoutUpdatedAt } = b;

  return objectsDeepEqual(
    establishmentAWithoutUpdatedAt,
    establishmentBWithoutUpdatedAt,
  );
};

const makeEstablishmentAggregateFromDb = (
  aggregate: any,
): EstablishmentAggregate => {
  return {
    establishment: {
      ...aggregate.establishment,
      locations: aggregate.establishment.locations.map(
        (location: any) => location.location,
      ),
      updatedAt: aggregate.establishment.updatedAt
        ? new Date(aggregate.establishment.updatedAt)
        : undefined,
      createdAt: new Date(aggregate.establishment.createdAt),
      lastInseeCheckDate: aggregate.establishment.lastInseeCheckDate
        ? new Date(aggregate.establishment.lastInseeCheckDate)
        : undefined,
      voluntaryToImmersion: true,
    },
    offers: aggregate.immersionOffers.map(
      (immersionOfferWithStringDate: any) => ({
        ...immersionOfferWithStringDate.offer,
        createdAt: new Date(immersionOfferWithStringDate.offer.createdAt),
      }),
    ),
    userRights: aggregate.userRights?.map(
      (userRight: any) => userRight.userRight,
    ),
  };
};

type SearchImmersionResultsQueryResult = Awaited<
  ReturnType<typeof searchImmersionResultsQuery>
>;

const searchImmersionResultsQuery = (
  transaction: KyselyDb,
  {
    filters,
    sortedBy,
    limit,
  }: {
    limit: number;
    filters: {
      fitForDisabledWorkers?: boolean;
      searchableBy?: EstablishmentSearchableByValue;
      romeCodes?: RomeCode[];
      geoParams?: GeoParams;
      nafCodes?: NafCode[];
      siret?: SiretDto;
      appellationCode?: AppellationCode;
      locationId?: LocationId;
    };
    sortedBy: SearchSortedBy;
  },
) => {
  const {
    appellationCode,
    fitForDisabledWorkers,
    geoParams,
    locationId,
    nafCodes,
    romeCodes,
    searchableBy,
    siret,
  } = filters;

  const query = transaction
    .with("filtered_results", (qb) =>
      pipeWithValue(
        qb
          .selectFrom((qb) =>
            pipeWithValue(
              qb
                .selectFrom("establishments")
                .select(["siret", "score", "update_date"])
                .where("is_open", "=", true),
              (qb) =>
                nafCodes?.length
                  ? qb.where("establishments.naf_code", "in", nafCodes)
                  : qb,
              (qb) =>
                fitForDisabledWorkers === undefined
                  ? qb
                  : qb.where(
                      "establishments.fit_for_disabled_workers",
                      fitForDisabledWorkers ? "is" : "is not",
                      true,
                    ),
              (qb) =>
                siret ? qb.where("establishments.siret", "=", siret) : qb,
              (qb) => {
                if (searchableBy === "jobSeekers")
                  return qb.whereRef(
                    "searchable_by_job_seekers",
                    "is",
                    sql`TRUE`,
                  );
                if (searchableBy === "students")
                  return qb.whereRef("searchable_by_students", "is", sql`TRUE`);
                return qb;
              },
              (qb) => {
                if (
                  !hasSearchGeoParams(filters?.geoParams ?? {}) &&
                  !romeCodes &&
                  (sortedBy === "date" || sortedBy === "score")
                ) {
                  // this is in the case when NO filters are provided, to avoid doing the joins on the whole table when we will only keep 100 results in the end
                  // still doing a limit of 5000 because they will be aggregated by ROME and siret
                  return qb
                    .orderBy(
                      sortedBy === "date" ? "update_date" : "score",
                      "desc",
                    )
                    .limit(5000);
                }
                return qb;
              },
            ).as("e"),
          )
          .innerJoin(
            (eb) =>
              pipeWithValue(
                eb
                  .selectFrom("establishments_location_positions")
                  .innerJoin(
                    "establishments_location_infos",
                    "establishments_location_infos.id",
                    "establishments_location_positions.id",
                  )
                  .select([
                    "establishment_siret as siret",
                    "establishments_location_infos.id",
                    "position",
                  ]),
                (eb) =>
                  geoParams && hasSearchGeoParams(geoParams)
                    ? eb.where(({ fn }) =>
                        fn("ST_DWithin", [
                          "position",
                          fn("ST_GeographyFromText", [
                            sql`${`POINT(${geoParams.lon} ${geoParams.lat})`}`,
                          ]),
                          sql`${(1000 * geoParams.distanceKm).toString()}`,
                        ]),
                      )
                    : eb,
                (eb) =>
                  locationId
                    ? eb.where(
                        "establishments_location_infos.id",
                        "=",
                        locationId,
                      )
                    : eb,
              ).as("loc"),
            (join) => join.onRef("loc.siret", "=", "e.siret"),
          )
          .innerJoin(
            (eb) =>
              pipeWithValue(
                eb
                  .selectFrom("immersion_offers")
                  .leftJoin(
                    "public_appellations_data",
                    "immersion_offers.appellation_code",
                    "public_appellations_data.ogr_appellation",
                  )
                  .select([
                    "siret",
                    "public_appellations_data.code_rome as rome_code",
                    "created_at",
                    "appellation_code",
                  ]),
                (eb) =>
                  romeCodes
                    ? eb.where(
                        "public_appellations_data.code_rome",
                        "in",
                        romeCodes,
                      )
                    : eb,
                (eb) =>
                  appellationCode
                    ? eb.where(
                        "immersion_offers.appellation_code",
                        "=",
                        parseInt(appellationCode),
                      )
                    : eb,
              ).as("offer"),
            (join) => join.onRef("offer.siret", "=", "e.siret"),
          )
          .innerJoin(
            "public_appellations_data as a",
            "a.ogr_appellation",
            "offer.appellation_code",
          )
          .select([
            "e.siret",
            "e.score",
            "loc.id as loc_id",
            "offer.rome_code as code_rome",
            sql<AppellationDto[]>`JSON_AGG
            ( JSON_BUILD_OBJECT(
                'appellationCode', a.ogr_appellation::text,
                'appellationLabel', a.libelle_appellation_long
                ) ORDER BY a.ogr_appellation)`.as("appellations"),
            sql<number>`ROW_NUMBER() OVER (ORDER BY ${makeOrderByClauses(
              sortedBy,
              filters,
            )})`.as("rank"),
          ])
          .groupBy([
            "e.siret",
            "e.score",
            "e.update_date",
            "offer.rome_code",
            "loc.position",
            "loc.id",
          ])
          .orderBy(makeOrderByClauses(sortedBy, filters))
          .limit(limit),
      ),
    )
    .selectFrom("filtered_results as r")
    .innerJoin("establishments as e", "e.siret", "r.siret")
    .innerJoin("establishments_location_infos as loc", "loc.id", "r.loc_id")
    .innerJoin(
      "establishments_location_positions as loc_pos",
      "loc.id",
      "loc_pos.id",
    )
    .innerJoin("public_naf_rev2_sous_classes as n", "n.naf_code", "e.naf_code")
    .innerJoin("public_romes_data as ro", "ro.code_rome", "r.code_rome")
    .orderBy("r.rank")
    .select(({ ref, fn }) =>
      jsonStripNulls(
        jsonBuildObject({
          naf: ref("e.naf_code"),
          siret: ref("e.siret"),
          establishmentScore: ref("r.score"),
          isSearchable: sql`NOT ${ref(
            "e.is_max_discussions_for_period_reached",
          )}`,
          nextAvailabilityDate: ref("e.next_availability_date"),
          name: ref("e.name"),
          website: ref("e.website"),
          additionalInformation: ref("e.additional_information"),
          customizedName: ref("e.customized_name"),
          fitForDisabledWorkers: ref("e.fit_for_disabled_workers"),
          numberOfEmployeeRange: ref("e.number_employees"),
          nafLabel: ref("n.libelle"),
          contactMode: ref("e.contact_mode"),
          rome: ref("ro.code_rome"),
          romeLabel: ref("ro.libelle_rome"),
          address: jsonBuildObject({
            streetNumberAndAddress: ref("loc.street_number_and_address"),
            postcode: ref("loc.post_code"),
            city: ref("loc.city"),
            departmentCode: ref("loc.department_code"),
          }),
          position: jsonBuildObject({
            lon: ref("loc.lon"),
            lat: ref("loc.lat"),
          }),
          locationId: ref("loc.id"),
          updatedAt: sql<DateTimeIsoString>`date_to_iso(e.update_date)`,
          createdAt: sql<DateTimeIsoString>`date_to_iso(e.created_at)`,
          ...(geoParams && hasSearchGeoParams(geoParams)
            ? {
                distance_m: fn("ST_Distance", [
                  ref("loc_pos.position"),
                  fn("ST_GeographyFromText", [
                    sql`${`POINT(${geoParams.lon} ${geoParams.lat})`}`,
                  ]),
                ]),
              }
            : {}),
          voluntaryToImmersion: sql`TRUE`,
          appellations: ref("r.appellations"),
        }),
      ).as("search_immersion_result"),
    );

  return query.execute();
};

const makeOrderByClauses = (
  sortedBy: SearchSortedBy,
  filters?: {
    searchableBy?: EstablishmentSearchableByValue;
    romeCodes?: RomeCode[];
    geoParams?: GeoParams;
  },
) => {
  if (sortedBy === "date") return sql`e.update_date DESC`;
  if (sortedBy === "score") return sql`e.score DESC`;
  const geoParams = filters?.geoParams;
  if (geoParams && hasSearchGeoParams(geoParams))
    return sql`ST_Distance(loc.position,ST_GeographyFromText(${sql`${`POINT(${geoParams.lon} ${geoParams.lat})`}`})) ASC`;

  throw errors.establishment.invalidGeoParams();
};

const establishmentByFiltersQueryBuilder = (db: KyselyDb) =>
  db
    .selectFrom("establishments as e")
    .select(({ ref, eb }) =>
      jsonStripNulls(
        jsonBuildObject({
          establishment: jsonBuildObject({
            acquisitionCampaign: ref("e.acquisition_campaign"),
            acquisitionKeyword: ref("e.acquisition_keyword"),
            score: ref("e.score"),
            siret: ref("e.siret"),
            name: ref("e.name"),
            customizedName: ref("e.customized_name"),
            contactMethod: ref("e.contact_mode"),
            website: ref("e.website"),
            additionalInformation: ref("e.additional_information"),
            locations: jsonArrayFrom(
              eb
                .selectFrom("establishments_location_infos as loc")
                .whereRef("loc.establishment_siret", "=", "e.siret")
                .select(({ ref }) =>
                  jsonBuildObject({
                    id: ref("loc.id"),
                    position: jsonBuildObject({
                      lon: ref("loc.lon"),
                      lat: ref("loc.lat"),
                    }),
                    address: jsonBuildObject({
                      streetNumberAndAddress: ref(
                        "loc.street_number_and_address",
                      ),
                      postcode: ref("loc.post_code"),
                      city: ref("loc.city"),
                      departmentCode: ref("department_code"),
                    }),
                  }).as("location"),
                ),
            ),
            sourceProvider: ref("e.source_provider"),
            numberEmployeesRange: ref("e.number_employees"),
            updatedAt: sql<string>`TO_CHAR
                ( ${ref(
                  "e.update_date",
                )}::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
            createdAt: sql<string>`TO_CHAR
                ( ${ref(
                  "e.created_at",
                )}::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
            lastInseeCheckDate: sql<string>`TO_CHAR
                ( ${ref(
                  "e.last_insee_check_date",
                )}::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
            isOpen: ref("e.is_open"),
            isMaxDiscussionsForPeriodReached: ref(
              "e.is_max_discussions_for_period_reached",
            ),
            isCommited: ref("e.is_commited"),
            fitForDisabledWorkers: ref("e.fit_for_disabled_workers"),
            maxContactsPerMonth: ref("e.max_contacts_per_month"),
            nextAvailabilityDate: sql<string>`date_to_iso
                    (${ref("e.next_availability_date")})`,
            searchableBy: jsonBuildObject({
              jobSeekers: ref("e.searchable_by_job_seekers"),
              students: ref("e.searchable_by_students"),
            }),
            nafDto: jsonBuildObject({
              code: ref("e.naf_code"),
              nomenclature: ref("e.naf_nomenclature"),
            }),
          }),
          immersionOffers: jsonArrayFrom(
            eb
              .selectFrom("immersion_offers as io")
              .leftJoin(
                "public_appellations_data as pad",
                "pad.ogr_appellation",
                "io.appellation_code",
              )
              .leftJoin(
                "public_romes_data as prd",
                "prd.code_rome",
                "pad.code_rome",
              )
              .whereRef("io.siret", "=", "e.siret")
              .select(({ ref }) =>
                jsonBuildObject({
                  romeCode: ref("pad.code_rome"),
                  romeLabel: ref("prd.libelle_rome"),
                  appellationCode: sql<string>`${ref(
                    "io.appellation_code",
                  )}::text`,
                  appellationLabel: ref("pad.libelle_appellation_long"),
                  createdAt: sql<string>`TO_CHAR
                      ( ${ref(
                        "io.created_at",
                      )}::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
                }).as("offer"),
              )
              .orderBy("io.appellation_code asc"),
          ),
          userRights: jsonArrayFrom(
            eb
              .selectFrom("establishments__users as eu")
              .whereRef("eu.siret", "=", "e.siret")
              .select(({ ref }) =>
                jsonBuildObject({
                  userId: ref("eu.user_id"),
                  role: ref("eu.role"),
                  job: ref("eu.job"),
                  phone: ref("eu.phone"),
                }).as("userRight"),
              ),
          ),
        }),
      ).as("aggregate"),
    )
    .groupBy("e.siret")
    .orderBy("e.siret asc");

//TODO : revoir la query kysely, il y a des soucis de typage d'où cette fonction
const pgSearchResultsToSearchResults = (
  results: SearchImmersionResultsQueryResult,
): RepositorySearchImmertionResult[] =>
  results.map(({ search_immersion_result: result }) => {
    if (!result.naf) throw new Error("Missing naf.");
    if (!result.name) throw new Error("Missing name.");

    return {
      address: result.address,
      appellations: result.appellations,
      establishmentScore: result.establishmentScore,
      locationId: result.locationId,
      naf: result.naf,
      nafLabel: result.nafLabel,
      additionalInformation: result.additionalInformation,
      contactMode: result.contactMode,
      createdAt: result.createdAt,
      name: result.name,
      position: result.position,
      rome: result.rome,
      romeLabel: result.romeLabel,
      siret: result.siret,
      voluntaryToImmersion: Boolean(result.voluntaryToImmersion),
      isSearchable: Boolean(result.isSearchable),
      customizedName: result.customizedName,
      distance_m: result.distance_m,
      fitForDisabledWorkers: result.fitForDisabledWorkers,
      nextAvailabilityDate: result.nextAvailabilityDate
        ? new Date(result.nextAvailabilityDate).toISOString()
        : undefined,
      numberOfEmployeeRange: result.numberOfEmployeeRange,
      updatedAt: result.updatedAt,
      website: result.website,
    };
  });
