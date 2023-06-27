import { PoolClient } from "pg";
import { ConventionId } from "shared";
import {
  ConventionsToSyncRepository,
  ConventionToSync,
} from "../../../domain/convention/ports/ConventionsToSyncRepository";

export const conventionsToSyncTableName = "conventions_to_sync_with_pe";

export class PgConventionsToSyncRepository
  implements ConventionsToSyncRepository
{
  constructor(private client: PoolClient) {}

  async getToProcessOrError(limit: number): Promise<ConventionToSync[]> {
    const queryResult = await this.client.query<PgConventionToSync>(
      `
          SELECT id, status, process_date, reason
          FROM ${conventionsToSyncTableName}
          WHERE status = 'TO_PROCESS'
             OR status = 'ERROR'
              LIMIT $1
      `,
      [limit],
    );
    return queryResult.rows.map((pgConventionToSync) =>
      pgResultToConventionToSync(pgConventionToSync),
    );
  }

  async save(conventionToSync: ConventionToSync): Promise<void> {
    return (await isConventionToSyncAlreadyExists(
      this.client,
      conventionToSync.id,
    ))
      ? updateConventionToSync(this.client, conventionToSync)
      : insertConventionToSync(this.client, conventionToSync);
  }

  async getById(id: ConventionId): Promise<ConventionToSync | undefined> {
    const pgConventionToSync = await selectConventionToSyncById(
      this.client,
      id,
    );
    return pgConventionToSync
      ? pgResultToConventionToSync(pgConventionToSync)
      : undefined;
  }
}

type PgConventionToSync = {
  id: string;
  status: string;
  process_date: Date | null;
  reason: string | null;
};

function pgResultToConventionToSync(
  pgConventionToSync: PgConventionToSync,
): ConventionToSync {
  return {
    id: pgConventionToSync.id,
    status: pgConventionToSync.status,
    processDate: pgConventionToSync.process_date ?? undefined,
    reason: pgConventionToSync.reason ?? undefined,
  } as ConventionToSync;
}

async function isConventionToSyncAlreadyExists(
  client: PoolClient,
  conventionId: ConventionId,
): Promise<boolean> {
  return (
    await client.query(
      `SELECT EXISTS(SELECT 1
                     FROM ${conventionsToSyncTableName}
                     WHERE id = $1)`,
      [conventionId],
    )
  ).rows.at(0).exists;
}

async function updateConventionToSync(
  client: PoolClient,
  conventionToSync: ConventionToSync,
): Promise<void> {
  await client.query(
    `
        UPDATE ${conventionsToSyncTableName}
        SET status       = $2,
            process_date = $3,
            reason       = $4
        WHERE id = $1
    `,
    [
      conventionToSync.id,
      conventionToSync.status,
      conventionToSync.status !== "TO_PROCESS"
        ? conventionToSync.processDate
        : null,
      conventionToSync.status === "ERROR" || conventionToSync.status === "SKIP"
        ? conventionToSync.reason
        : null,
    ],
  );
}

async function insertConventionToSync(
  client: PoolClient,
  conventionToSync: ConventionToSync,
): Promise<void> {
  await client.query(
    `
        INSERT INTO ${conventionsToSyncTableName} (id,
                                                   status,
                                                   process_date,
                                                   reason)
        VALUES ($1, $2, $3, $4)
    `,
    [
      conventionToSync.id,
      conventionToSync.status,
      conventionToSync.status !== "TO_PROCESS"
        ? conventionToSync.processDate
        : null,
      conventionToSync.status === "ERROR" || conventionToSync.status === "SKIP"
        ? conventionToSync.reason
        : null,
    ],
  );
}

async function selectConventionToSyncById(
  client: PoolClient,
  conventionId: ConventionId,
): Promise<PgConventionToSync | undefined> {
  return (
    await client.query<PgConventionToSync>(
      `
        SELECT id, status, process_date, reason
        FROM ${conventionsToSyncTableName}
        WHERE id = $1
    `,
      [conventionId],
    )
  ).rows.at(0);
}
