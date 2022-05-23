import { Pool } from "pg";
import { makeCreateNewEvent } from "../../../domain/core/eventBus/EventBus";
import { InsertEstablishmentAggregateFromForm } from "../../../domain/immersionOffer/useCases/InsertEstablishmentAggregateFromFormEstablishement";
import { FormEstablishmentDto } from "shared/src/formEstablishment/FormEstablishment.dto";

import { random, sleep } from "shared/src/utils";
import { createLogger } from "../../../utils/logger";
import { notifyDiscord } from "../../../utils/notifyDiscord";
import { getTestPgPool } from "../../../_testBuilders/getTestPgPool";
import { RealClock } from "../../secondary/core/ClockImplementations";
import {
  defaultMaxBackoffPeriodMs,
  defaultRetryDeadlineMs,
  ExponentialBackoffRetryStrategy,
} from "../../secondary/core/ExponentialBackoffRetryStrategy";
import { QpsRateLimiter } from "../../secondary/core/QpsRateLimiter";
import { UuidV4Generator } from "../../secondary/core/UuidGeneratorImplementations";
import { HttpsSireneGateway } from "../../secondary/HttpsSireneGateway";
import { HttpAdresseAPI } from "../../secondary/immersionOffer/HttpAdresseAPI";
import { PgUowPerformer } from "../../secondary/pg/PgUowPerformer";
import { AppConfig } from "../config/appConfig";
import { createPgUow } from "../config/uowConfig";

const maxQpsApiAdresse = 5;
const maxQpsSireneApi = 0.25;

const logger = createLogger(__filename);

const clock = new RealClock();

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
  const adresseAPI = new HttpAdresseAPI(
    new QpsRateLimiter(maxQpsApiAdresse, clock, sleep),
    new ExponentialBackoffRetryStrategy(
      defaultMaxBackoffPeriodMs,
      defaultRetryDeadlineMs,
      clock,
      sleep,
      random,
    ),
  );
  const sireneGateway = new HttpsSireneGateway(
    config.sireneHttpsConfig,
    clock,
    new QpsRateLimiter(maxQpsSireneApi, clock, sleep),
    new ExponentialBackoffRetryStrategy(
      defaultMaxBackoffPeriodMs,
      defaultRetryDeadlineMs,
      clock,
      sleep,
      random,
    ),
  );
  const testPool = getTestPgPool();
  const pgUowPerformer = new PgUowPerformer(testPool, createPgUow);
  const uuidGenerator = new UuidV4Generator();
  const upsertAggregateFromForm = new InsertEstablishmentAggregateFromForm(
    pgUowPerformer,
    sireneGateway,
    adresseAPI,
    new UuidV4Generator(),
    clock,
    makeCreateNewEvent({ clock, uuidGenerator }),
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
      businessAddress: row.business_address,
      naf: row.naf,
      appellations: row.professions,
      businessContact: row.business_contact,
      isSearchable: true,
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
);
