import axios from "axios";
import { Pool } from "pg";
import { FormEstablishmentDto, random, sleep } from "shared";
import { createAxiosSharedClient } from "shared-routes/axios";
import { getTestPgPool } from "../../../_testBuilders/getTestPgPool";
import { makeCreateNewEvent } from "../../../domain/core/eventBus/EventBus";
import { InsertEstablishmentAggregateFromForm } from "../../../domain/offer/useCases/InsertEstablishmentAggregateFromFormEstablishement";
import { createLogger } from "../../../utils/logger";
import { notifyDiscord } from "../../../utils/notifyDiscord";
import { HttpAddressGateway } from "../../secondary/addressGateway/HttpAddressGateway";
import { addressesExternalRoutes } from "../../secondary/addressGateway/HttpAddressGateway.routes";
import {
  defaultMaxBackoffPeriodMs,
  defaultRetryDeadlineMs,
  ExponentialBackoffRetryStrategy,
} from "../../secondary/core/ExponentialBackoffRetryStrategy";
import { RealTimeGateway } from "../../secondary/core/TimeGateway/RealTimeGateway";
import { UuidV4Generator } from "../../secondary/core/UuidGeneratorImplementations";
import { PgUowPerformer } from "../../secondary/pg/PgUowPerformer";
import { InseeSiretGateway } from "../../secondary/siret/InseeSiretGateway";
import { AppConfig } from "../config/appConfig";
import { createPgUow } from "../config/uowConfig";

const logger = createLogger(__filename);

const timeGateway = new RealTimeGateway();

const config = AppConfig.createFromEnv();

const transformPastFormEstablishmentsIntoSearchableData = async (
  originPgConnectionString: string,
  destinationPgConnectionString: string,
) => {
  logger.info(
    { originPgConnectionString, destinationPgConnectionString },
    "starting to convert form establishement to searchable data",
  );

  // We create the use case transformFormEstablishementIntoSearchData
  const poolOrigin = new Pool({ connectionString: originPgConnectionString });
  const clientOrigin = await poolOrigin.connect();

  const poolDestination = new Pool({
    connectionString: destinationPgConnectionString,
  });
  const clientDestination = await poolDestination.connect();
  const addressAPI = new HttpAddressGateway(
    createAxiosSharedClient(
      addressesExternalRoutes,
      axios.create({ timeout: 10_000 }),
    ),
    config.apiKeyOpenCageDataGeocoding,
    config.apiKeyOpenCageDataGeosearch,
  );
  const siretGateway = new InseeSiretGateway(
    config.inseeHttpConfig,
    timeGateway,
    new ExponentialBackoffRetryStrategy(
      defaultMaxBackoffPeriodMs,
      defaultRetryDeadlineMs,
      timeGateway,
      sleep,
      random,
    ),
  );
  const testPool = getTestPgPool();
  const pgUowPerformer = new PgUowPerformer(testPool, createPgUow);
  const uuidGenerator = new UuidV4Generator();
  const upsertAggregateFromForm = new InsertEstablishmentAggregateFromForm(
    pgUowPerformer,
    siretGateway,
    addressAPI,
    new UuidV4Generator(),
    timeGateway,
    makeCreateNewEvent({ timeGateway, uuidGenerator }),
  );
  const missingFormEstablishmentRows = (
    await clientOrigin.query(
      `select * from form_establishments where siret not in 
    (select siret from establishments where data_source = 'form')`,
    )
  ).rows;
  logger.info(
    `Found ${missingFormEstablishmentRows.length} in form tables that are not in establishments`,
  );

  let succeed = 0;
  const failedSiret = [];
  for (const row of missingFormEstablishmentRows) {
    const formEstablishmentDto: FormEstablishmentDto = {
      source: row.source,
      siret: row.siret,
      businessName: row.business_name,
      businessNameCustomized: row.business_name_customized,
      website: row.website,
      additionalInformation: row.additional_information,
      businessAddress: row.business_address,
      naf: row.naf,
      appellations: row.professions,
      businessContact: row.business_contact,
      maxContactsPerWeek: row.max_contacts_per_week,
    };
    try {
      await upsertAggregateFromForm.execute(formEstablishmentDto);
      logger.info(
        `Successfully added form with siret ${row.siret} to aggregate tables.`,
      );
      succeed += 1;
    } catch (_) {
      logger.warn(
        `Could not add form with siret ${row.siret} to aggregate tables.`,
      );
      failedSiret.push(row.siret);
    }
  }
  notifyDiscord(
    `Script summary: Succeed: ${succeed}; Failed: ${
      failedSiret.length
    }\nFailing siret were: ${failedSiret.join(", ")}`,
  );
  clientOrigin.release();
  await poolOrigin.end();
  clientDestination.release();
  await poolDestination.end();
};

transformPastFormEstablishmentsIntoSearchableData(
  config.pgImmersionDbUrl,
  config.pgImmersionDbUrl,
).then(
  () => {
    logger.info(`Script finished success`);
    process.exit(0);
  },
  (error: any) => {
    logger.error(error, `Script failed`);
    process.exit(1);
  },
);
