import { sql } from "kysely";
import { equals, keys, pick } from "ramda";
import {
  AppellationAndRomeDto,
  AppellationCode,
  EstablishmentSearchableByValue,
  LocationId,
  RomeCode,
  SearchResultDto,
  SearchSortedBy,
  SiretDto,
  castError,
  pipeWithValue,
} from "shared";
import { BadRequestError, NotFoundError } from "shared";
import {
  KyselyDb,
  executeKyselyRawSqlQuery,
  jsonBuildObject,
  jsonStripNulls,
} from "../../../config/pg/kysely/kyselyUtils";
import { optional } from "../../../config/pg/pgUtils";
import { createLogger } from "../../../utils/logger";
import { ContactEntity } from "../entities/ContactEntity";
import {
  EstablishmentAggregate,
  EstablishmentEntity,
} from "../entities/EstablishmentEntity";
import { OfferEntity } from "../entities/OfferEntity";
import { GeoParams, SearchMade } from "../entities/SearchMadeEntity";
import {
  EstablishmentAggregateRepository,
  OfferWithSiret,
  SearchImmersionResult,
  UpdateEstablishmentsWithInseeDataParams,
} from "../ports/EstablishmentAggregateRepository";
import { hasSearchGeoParams } from "../use-cases/SearchImmersion";
import {
  establishmentByFilters,
  withEstablishmentLocationsSubQuery,
} from "./PgEstablishmentAggregateRepository.sql";

const logger = createLogger(__filename);
const MAX_RESULTS_HARD_LIMIT = 100;

export class PgEstablishmentAggregateRepository
  implements EstablishmentAggregateRepository
{
  constructor(private transaction: KyselyDb) {}

  public async getAllEstablishmentAggregates(): Promise<
    EstablishmentAggregate[]
  > {
    const aggregateWithStringDates = await executeKyselyRawSqlQuery(
      this.transaction,
      establishmentByFilters("all"),
    );
    return aggregateWithStringDates.rows.map(({ aggregate }) =>
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
          rome_code: offerWithSiret.romeCode,
          appellation_code: parseInt(offerWithSiret.appellationCode),
          siret: offerWithSiret.siret,
          score: offerWithSiret.score,
          created_at: sql`${offerWithSiret.createdAt.toISOString()}`,
        })),
      )
      .execute();
  }

  public async delete(siret: string): Promise<void> {
    logger.info({
      message: `About to delete establishment with siret : ${siret}`,
    });

    await this.#deleteEstablishmentContactBySiret(siret);

    return this.transaction
      .deleteFrom("establishments")
      .where("siret", "=", siret)
      .returning("siret")
      .execute()
      .then((result) => {
        if (result.length !== 1)
          throw new NotFoundError(
            `Establishment with siret ${siret} missing on Establishment Aggregate Repository.`,
          );
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

  public async getEstablishmentAggregateBySiret(
    siret: SiretDto,
  ): Promise<EstablishmentAggregate | undefined> {
    const aggregate = (
      await executeKyselyRawSqlQuery(
        this.transaction,
        establishmentByFilters("siret"),
        [siret],
      )
    ).rows[0]?.aggregate;
    return aggregate && makeEstablishmentAggregateFromDb(aggregate);
  }

  public async getEstablishmentAggregatesByFilters({
    contactEmail,
  }: { contactEmail: string }): Promise<EstablishmentAggregate[]> {
    const aggregateWithStringDates = await executeKyselyRawSqlQuery(
      this.transaction,
      establishmentByFilters("contactEmail"),
      [contactEmail],
    );
    return aggregateWithStringDates.rows.map(({ aggregate }) =>
      makeEstablishmentAggregateFromDb(aggregate),
    );
  }

  public async getOffersAsAppellationAndRomeDtosBySiret(
    siret: string,
  ): Promise<AppellationAndRomeDto[]> {
    const results = await this.transaction
      .selectFrom("immersion_offers as io")
      .fullJoin("public_romes_data as prd", "prd.code_rome", "io.rome_code")
      .leftJoin(
        "public_appellations_data as pad",
        "pad.ogr_appellation",
        "io.appellation_code",
      )
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
            selectFrom("outbox as o")
              .select(sql`1`.as("_"))
              .where("o.topic", "=", "FormEstablishmentEditLinkSent")
              .whereRef(sql`o.payload ->> 'siret'`, "=", "establishments.siret")
              .where("o.occurred_at", ">", before),
          ),
        ),
      )
      .where(({ not, exists, selectFrom }) =>
        not(
          exists(
            selectFrom("notifications_email as n")
              .select(sql`1`.as("__"))
              .where("n.email_kind", "=", "SUGGEST_EDIT_FORM_ESTABLISHMENT")
              .whereRef("n.establishment_siret", "=", "establishments.siret")
              .where("n.created_at", ">", before),
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
    if (maxResults > 1000)
      throw new BadRequestError(
        "Querying getSiretsOfEstablishmentsNotCheckedAtInseeSince, maxResults must be <= 1000",
      );

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
      .where("rome_code", "=", rome)
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
    await this.#insertLocations(aggregate);
    await this.#insertContactFromAggregate(aggregate);
    await this.createImmersionOffersToEstablishments(
      aggregate.offers.map((immersionOffer) => ({
        siret: aggregate.establishment.siret,
        ...immersionOffer,
      })),
    );
  }

  public async markEstablishmentAsSearchableWhenRecentDiscussionAreUnderMaxContactPerWeek(
    since: Date,
  ): Promise<number> {
    const result = await this.transaction
      .updateTable("establishments")
      .set({ is_searchable: true })
      .where("is_searchable", "=", false)
      .where("max_contacts_per_week", ">", 0)
      .where("siret", "not in", (eb) =>
        eb
          .selectFrom("establishments")
          .select("siret")
          .leftJoin("discussions", "establishments.siret", "discussions.siret")
          .where("is_searchable", "=", false)
          .where("max_contacts_per_week", ">", 0)
          .where("discussions.created_at", ">", since)
          .groupBy("establishments.siret")
          .havingRef(
            (eb) => eb.fn.countAll(),
            ">=",
            "establishments.max_contacts_per_week",
          ),
      )
      .returning("siret")
      .execute();

    return result.length;
  }

  public async searchImmersionResults({
    searchMade,
    maxResults,
  }: {
    searchMade: SearchMade;
    maxResults?: number;
  }): Promise<SearchImmersionResult[]> {
    const around =
      "lat" in searchMade
        ? pick(["lat", "lon", "distanceKm"], searchMade)
        : undefined;

    const results = await searchImmersionResultsQuery(this.transaction, {
      limit:
        maxResults && maxResults < MAX_RESULTS_HARD_LIMIT
          ? maxResults
          : MAX_RESULTS_HARD_LIMIT,
      filters: {
        geoParams: around,
        searchableBy: searchMade.establishmentSearchableBy,
        romeCodes: searchMade.romeCode
          ? [searchMade.romeCode]
          : await this.#getRomeCodeFromAppellationCodes(
              searchMade.appellationCodes,
            ),
      },
      sortedBy: searchMade.sortedBy ?? "date",
    });

    return results.map(
      ({ search_immersion_result }): SearchImmersionResult => ({
        ...(search_immersion_result as SearchImmersionResult),
        nextAvailabilityDate: search_immersion_result.nextAvailabilityDate
          ? new Date(search_immersion_result.nextAvailabilityDate).toISOString()
          : undefined,
        customizedName: search_immersion_result.customizedName ?? undefined,
      }),
    );
  }

  public async getSearchImmersionResultDtoBySearchQuery(
    siret: SiretDto,
    appellationCode: AppellationCode,
    locationId: LocationId,
  ): Promise<SearchResultDto | undefined> {
    const immersionSearchResultDtos =
      await this.#selectImmersionSearchResultDtoQueryGivenSelectedOffersSubQuery(
        `SELECT 
          io.siret,
          io.rome_code,
          prd.libelle_rome as rome_label,
          (JSON_AGG (JSON_BUILD_OBJECT(
            'appellationCode', ogr_appellation::text,
            'appellationLabel', libelle_appellation_long,
            'score', io.score
          ) ORDER BY ogr_appellation)) AS appellations,
          null AS distance_m,
          1 AS row_number,
          loc.*,
          loc.id AS location_id,
          e.naf_code,
          e.is_searchable,
          date_to_iso(e.next_availability_date) as next_availability_date,
          e.name,
          e.website,
          e.additional_information,
          e.customized_name,
          e.fit_for_disabled_workers,
          e.number_employees
        FROM immersion_offers AS io
        LEFT JOIN establishments e ON io.siret = e.siret
        LEFT JOIN public_appellations_data AS pad ON pad.ogr_appellation = io.appellation_code 
        LEFT JOIN public_romes_data AS prd ON prd.code_rome = io.rome_code 
        LEFT JOIN establishments_locations AS loc ON loc.establishment_siret = io.siret
        WHERE io.siret = $1 AND io.appellation_code = $2 AND loc.id = $3
        GROUP BY (io.siret, io.rome_code, prd.libelle_rome, location_id, e.naf_code, e.is_searchable, e.next_availability_date, e.name, e.website,
          e.additional_information, e.customized_name, e.fit_for_disabled_workers, e.number_employees)`,
        [siret, appellationCode, locationId],
      );
    const immersionSearchResultDto = immersionSearchResultDtos.at(0);
    if (!immersionSearchResultDto) return;
    const { isSearchable: _, ...rest } = immersionSearchResultDto;
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
      throw new NotFoundError(
        `We do not have an establishment with siret ${updatedAggregate.establishment.siret} to update`,
      );
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

    if (
      !existingAggregate.contact ||
      keys(existingAggregate.contact).length === 0
    ) {
      await this.#insertContactFromAggregate(updatedAggregate);
    } else {
      // Update contact if it has changed
      await this.#updateContactFromAggregates(
        { ...existingAggregate, contact: existingAggregate.contact },
        updatedAggregate,
      );
    }
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
        is_searchable: establishment.isSearchable,
        last_insee_check_date: establishment.lastInseeCheckDate ?? null,
        max_contacts_per_week: establishment.maxContactsPerWeek,
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
      })
      .where("siret", "=", establishment.siret)
      .execute();

    await this.transaction
      .deleteFrom("establishments_locations")
      .where("establishment_siret", "=", establishment.siret)
      .execute();

    await this.transaction
      .insertInto("establishments_locations")
      .values((eb) =>
        establishment.locations.map(({ address, id, position }) => ({
          id,
          establishment_siret: establishment.siret,
          city: address.city,
          department_code: address.departmentCode,
          post_code: address.postcode,
          street_number_and_address: address.streetNumberAndAddress,
          lat: position.lat,
          lon: position.lon,
          position: eb.fn("ST_MakePoint", [
            sql`${position.lon}, ${position.lat}`,
          ]),
        })),
      )
      .execute();
  }

  async #deleteEstablishmentContactBySiret(siret: SiretDto): Promise<void> {
    await this.transaction
      .deleteFrom("establishments_contacts")
      .where("siret", "=", siret)
      .execute();
  }

  async #selectImmersionSearchResultDtoQueryGivenSelectedOffersSubQuery(
    selectedOffersSubQuery: string,
    selectedOffersSubQueryParams: any[],
    shouldSetDistance = true,
  ): Promise<SearchImmersionResult[]> {
    // Given a subquery and its parameters to select immersion offers (with columns siret, rome_code, rome_label, appellations and distance_m),
    // this method returns a list of SearchImmersionResultDto
    const pgResult = await executeKyselyRawSqlQuery(
      this.transaction,
      `WITH 
      unique_establishments_contacts AS ( 
        SELECT DISTINCT ON (siret) siret, uuid 
        FROM establishments_contacts
      ), 
      match_immersion_offer AS (
        ${selectedOffersSubQuery}
      ),
      establishment_locations_agg AS (
        ${withEstablishmentLocationsSubQuery}
      )
      SELECT 
        row_number,
        JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
          'rome', io.rome_code,
          'siret', io.siret,
          ${shouldSetDistance ? `'distance_m', io.distance_m,` : ""}
          'isSearchable',io.is_searchable,
          'nextAvailabilityDate', io.next_availability_date,
          'name', io.name,
          'website', io.website,
          'additionalInformation', io.additional_information,
          'customizedName', io.customized_name,
          'fitForDisabledWorkers', io.fit_for_disabled_workers,
          'romeLabel', io.rome_label,
          'appellations',  io.appellations,
          'naf', io.naf_code,
          'nafLabel', public_naf_classes_2008.class_label,
          'address', JSON_BUILD_OBJECT(
            'streetNumberAndAddress', io.street_number_and_address,
            'postcode', io.post_code,
            'city', io.city,
            'departmentCode', io.department_code
            ),
          'position', JSON_BUILD_OBJECT('lon', io.lon, 'lat', io.lat),
          'locationId', io.location_id,
          'contactMode', ec.contact_mode,
          'numberOfEmployeeRange', io.number_employees
        )) AS search_immersion_result
      FROM match_immersion_offer AS io   
      LEFT JOIN public_naf_classes_2008 ON (public_naf_classes_2008.class_id = REGEXP_REPLACE(io.naf_code,'(\\d\\d)(\\d\\d).', '\\1.\\2'))
      LEFT JOIN unique_establishments_contacts AS uec ON uec.siret = io.siret
      LEFT JOIN establishments_contacts AS ec ON ec.uuid = uec.uuid
      ORDER BY row_number ASC, io.location_id ASC;`,
      selectedOffersSubQueryParams,
    );

    return pgResult.rows.map(
      (row): SearchImmersionResult => ({
        ...row.search_immersion_result,
        // TODO : find a way to return 'undefined' instead of 'null' from query
        customizedName: optional(row.search_immersion_result.customizedName),
        contactMode: optional(row.search_immersion_result.contactMode),
        distance_m: optional(row.search_immersion_result.distance_m),
        numberOfEmployeeRange: optional(
          row.search_immersion_result.numberOfEmployeeRange,
        ),
        fitForDisabledWorkers: optional(
          row.search_immersion_result.fitForDisabledWorkers,
        ),
        voluntaryToImmersion: true,
        isSearchable: row.search_immersion_result.isSearchable,
        nextAvailabilityDate: row.search_immersion_result.nextAvailabilityDate,
        locationId: row.search_immersion_result.locationId,
      }),
    );
  }

  async #insertEstablishmentFromAggregate(aggregate: EstablishmentAggregate) {
    await this.transaction
      .insertInto("establishments")
      .values({
        siret: aggregate.establishment.siret,
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
        is_searchable: aggregate.establishment.isSearchable,
        is_commited: aggregate.establishment.isCommited,
        fit_for_disabled_workers: aggregate.establishment.fitForDisabledWorkers,
        max_contacts_per_week: aggregate.establishment.maxContactsPerWeek,
        last_insee_check_date: aggregate.establishment.lastInseeCheckDate,
        created_at: aggregate.establishment.createdAt,
        next_availability_date: aggregate.establishment.nextAvailabilityDate,
        searchable_by_students: aggregate.establishment.searchableBy.students,
        searchable_by_job_seekers:
          aggregate.establishment.searchableBy.jobSeekers,
        acquisition_keyword: aggregate.establishment.acquisitionKeyword,
        acquisition_campaign: aggregate.establishment.acquisitionCampaign,
      })
      .execute();
  }

  async #insertContactFromAggregate(
    aggregate: EstablishmentAggregate,
  ): Promise<void> {
    const { contact } = aggregate;
    if (!contact) return;

    return this.transaction
      .insertInto("establishments_contacts")
      .values({
        uuid: contact.id,
        firstname: contact.firstName,
        lastname: contact.lastName,
        email: contact.email,
        job: contact.job,
        phone: contact.phone,
        contact_mode: contact.contactMethod,
        copy_emails: sql`${JSON.stringify(contact.copyEmails)}`,
        siret: aggregate.establishment.siret,
      })
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
            rome_code: offerToAdd.romeCode,
            appellation_code: parseInt(offerToAdd.appellationCode),
            score: offerToAdd.score,
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
        .where("siret", "=", siret)
        .where("appellation_code", "is", null)
        .where("rome_code", "in", offersToRemoveByRomeCode)
        .execute();

    const offersToRemoveByAppelationCode = offersToRemove
      .filter((offer) => !!offer.appellationCode)
      .map((offer) => offer.appellationCode);

    if (offersToRemoveByAppelationCode.length > 0)
      await this.transaction
        .deleteFrom("immersion_offers")
        .where("siret", "=", siret)
        .where(
          "appellation_code",
          "in",
          offersToRemoveByAppelationCode.map((appelationCode) =>
            parseInt(appelationCode),
          ),
        )
        .execute();
  }

  async #updateContactFromAggregates(
    existingAggregate: EstablishmentAggregate & {
      contact: ContactEntity;
    },
    updatedAggregate: EstablishmentAggregate,
  ) {
    if (!contactsEqual(updatedAggregate.contact, existingAggregate.contact)) {
      await this.transaction
        .updateTable("establishments_contacts")
        .set({
          lastname: updatedAggregate.contact.lastName,
          firstname: updatedAggregate.contact.firstName,
          email: updatedAggregate.contact.email,
          job: updatedAggregate.contact.job,
          phone: updatedAggregate.contact.phone,
          contact_mode: updatedAggregate.contact.contactMethod,
          copy_emails: sql`${JSON.stringify(
            updatedAggregate.contact.copyEmails,
          )}`,
          siret: updatedAggregate.establishment.siret,
        })
        .where("uuid", "=", existingAggregate.contact.id)
        .execute();
    }
  }

  async #insertLocations(aggregate: EstablishmentAggregate) {
    await this.transaction
      .insertInto("establishments_locations")
      .values((eb) =>
        aggregate.establishment.locations.map(({ position, address, id }) => ({
          id: id,
          establishment_siret: aggregate.establishment.siret,
          city: address.city,
          department_code: address.departmentCode,
          post_code: address.postcode,
          street_number_and_address: address.streetNumberAndAddress,
          lat: position.lat,
          lon: position.lon,
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
const contactsEqual = (a: ContactEntity, b: ContactEntity) => {
  // Ignore key id
  const { id: _unusedIdA, ...contactAWithoutId } = a;
  const { id: _unusedIdB, ...contactBWithoutId } = b;
  return objectsDeepEqual(contactAWithoutId, contactBWithoutId);
};

const makeEstablishmentAggregateFromDb = (
  aggregate: any,
): EstablishmentAggregate => ({
  establishment: {
    ...aggregate.establishment,
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
      ...immersionOfferWithStringDate,
      createdAt: new Date(immersionOfferWithStringDate.createdAt),
    }),
  ),
  contact:
    aggregate.contact && keys(aggregate.contact).length > 0
      ? aggregate.contact
      : undefined,
});

const searchImmersionResultsQuery = (
  transaction: KyselyDb,
  {
    filters,
    sortedBy,
    limit,
  }: {
    limit: number;
    filters?: {
      searchableBy?: EstablishmentSearchableByValue;
      romeCodes?: RomeCode[];
      geoParams?: GeoParams;
    };
    sortedBy: SearchSortedBy;
  },
) => {
  const geoParams = filters?.geoParams;
  const searchableBy = filters?.searchableBy;

  const query = transaction
    .with("filtered_results", (qb) =>
      pipeWithValue(
        qb
          .selectFrom((qb) =>
            pipeWithValue(
              qb
                .selectFrom("establishments")
                .select("siret")
                .where("is_open", "=", true),
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
            ).as("e"),
          )
          .innerJoin(
            (eb) =>
              pipeWithValue(
                eb
                  .selectFrom("establishments_locations")
                  .select(["establishment_siret as siret", "id", "position"]),
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
              ).as("loc"),
            (join) => join.onRef("loc.siret", "=", "e.siret"),
          )
          .innerJoin(
            (eb) =>
              pipeWithValue(
                eb
                  .selectFrom("immersion_offers")
                  .select([
                    "siret",
                    "rome_code",
                    "created_at",
                    "appellation_code",
                    "score",
                  ]),
                (eb) =>
                  filters?.romeCodes
                    ? eb.where("rome_code", "in", filters.romeCodes)
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
            "loc.id as loc_id",
            "offer.rome_code as code_rome",
            sql`JSON_AGG( JSON_BUILD_OBJECT( 'appellationCode', a.ogr_appellation::text, 'appellationLabel', a.libelle_appellation_long, 'score', offer.score ) ORDER BY a.ogr_appellation)`.as(
              "appelations",
            ),
            sql<number>`ROW_NUMBER() OVER (ORDER BY ${makeOrderByClauses(
              sortedBy,
              filters,
            )})`.as("rank"),
          ])
          .groupBy(["e.siret", "offer.rome_code", "loc.position", "loc.id"])
          .limit(limit)
          .orderBy(makeOrderByClauses(sortedBy, filters)),
      ),
    )
    .selectFrom("filtered_results as r")
    .innerJoin("establishments as e", "e.siret", "r.siret")
    .innerJoin("establishments_contacts as c", "c.siret", "r.siret")
    .innerJoin("establishments_locations as loc", "loc.id", "r.loc_id")
    .innerJoin(
      (eb) => eb.selectFrom("public_naf_classes_2008").selectAll().as("n"),
      (join) =>
        join.onRef(
          "n.class_id",
          "=",
          sql`REGEXP_REPLACE(e.naf_code,'(\\d\\d)(\\d\\d).', '\\1.\\2')`,
        ),
    )
    .innerJoin("public_romes_data as ro", "ro.code_rome", "r.code_rome")
    .select(({ ref, fn }) =>
      jsonStripNulls(
        jsonBuildObject({
          naf: ref("e.naf_code"),
          siret: ref("e.siret"),
          isSearchable: ref("e.is_searchable"),
          nextAvailabilityDate: ref("e.next_availability_date"),
          name: ref("e.name"),
          website: ref("e.website"),
          additionalInformation: ref("e.additional_information"),
          customizedName: ref("e.customized_name"),
          fitForDisabledWorkers: ref("e.fit_for_disabled_workers"),
          numberOfEmployeeRange: ref("e.number_employees"),
          nafLabel: ref("n.class_label"),
          contactMode: ref("c.contact_mode"),
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
          ...(geoParams && hasSearchGeoParams(geoParams)
            ? {
                distance_m: fn("ST_Distance", [
                  ref("loc.position"),
                  fn("ST_GeographyFromText", [
                    sql`${`POINT(${geoParams.lon} ${geoParams.lat})`}`,
                  ]),
                ]),
              }
            : {}),
          voluntaryToImmersion: sql`TRUE`,
          appellations: ref("r.appelations"),
        }),
      ).as("search_immersion_result"),
    )
    .orderBy("r.rank");

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
  if (sortedBy === "date") return sql`MAX(offer.created_at) DESC, RANDOM()`;
  if (sortedBy === "score") return sql`MAX(offer.score) DESC, RANDOM()`;
  const geoParams = filters?.geoParams;
  if (geoParams && hasSearchGeoParams(geoParams))
    return sql`ST_Distance(loc.position,ST_GeographyFromText(${sql`${`POINT(${geoParams.lon} ${geoParams.lat})`}`})) ASC, RANDOM()`;

  throw new BadRequestError(
    "Cannot search by distance with invalid geo params",
  );
};
