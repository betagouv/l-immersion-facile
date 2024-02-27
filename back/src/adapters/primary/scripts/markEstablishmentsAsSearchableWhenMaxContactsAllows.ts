import { Pool } from "pg";
import { RealTimeGateway } from "../../../domain/core/time-gateway/adapters/RealTimeGateway";
import { MarkEstablishmentsAsSearchableScript } from "../../../domain/offer/useCases/MarkEstablishmentsAsSearchableScript";
import { makeKyselyDb } from "../../secondary/pg/kysely/kyselyUtils";
import { PgEstablishmentAggregateRepository } from "../../secondary/pg/repositories/PgEstablishmentAggregateRepository";
import { AppConfig } from "../config/appConfig";
import { handleEndOfScriptNotification } from "./handleEndOfScriptNotification";

const config = AppConfig.createFromEnv();
const dbUrl = config.pgImmersionDbUrl;

const startScript = async () => {
  const timeGateway = new RealTimeGateway();
  const pool = new Pool({
    connectionString: dbUrl,
  });

  const establishmentAggregateRepository =
    new PgEstablishmentAggregateRepository(makeKyselyDb(pool));

  const markAsSearchableScript = new MarkEstablishmentsAsSearchableScript(
    establishmentAggregateRepository,
    timeGateway,
  );

  const numberOfEstablishmentsUpdated = await markAsSearchableScript.execute();
  return { numberOfEstablishmentsUpdated };
};

/* eslint-disable-next-line @typescript-eslint/no-floating-promises */
handleEndOfScriptNotification(
  "markEstablishmentsAsSearchableWhenMaxContactsAllows",
  config,
  startScript,
  ({ numberOfEstablishmentsUpdated }) =>
    `${numberOfEstablishmentsUpdated} establishments have been marked as searchable again`,
);
