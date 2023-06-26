import { PoolClient } from "pg";
import { ConventionId } from "shared";
import {
  ConventionToSync,
  ConventionToSyncRepository,
} from "../../../domain/convention/ports/ConventionToSyncRepository";

export const conventionToSyncTableName = "convention_to_sync_with_pe";

export class PgConventionToSyncRepository
  implements ConventionToSyncRepository
{
  constructor(private client: PoolClient) {}

  async getNotProcessedAndErrored(limit: number): Promise<ConventionToSync[]> {
    const queryResult = await this.client.query<PgConventionToSync>(
      `
          SELECT id, status, process_date, reason
          FROM ${conventionToSyncTableName}
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
    await this.client.query(
      `
          INSERT INTO ${conventionToSyncTableName} (id,
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
        conventionToSync.status === "ERROR" ||
        conventionToSync.status === "SKIP"
          ? conventionToSync.reason
          : null,
      ],
    );
  }

  async getById(id: ConventionId): Promise<ConventionToSync | undefined> {
    const queryResult = await this.client.query<PgConventionToSync>(
      `
          SELECT id, status, process_date, reason
          FROM ${conventionToSyncTableName}
          WHERE id = $1
      `,
      [id],
    );
    const pgConventionToSync = queryResult.rows.at(0);
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
