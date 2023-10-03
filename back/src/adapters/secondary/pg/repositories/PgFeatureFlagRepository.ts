import { keys } from "ramda";
import { FeatureFlags, hasFeatureFlagValue, SetFeatureFlagParam } from "shared";
import { FeatureFlagRepository } from "../../../../domain/core/ports/FeatureFlagRepository";
import { executeKyselyRawSqlQuery, KyselyDb } from "../kysely/kyselyUtils";

const rawPgToFeatureFlags = (raw: any[]): FeatureFlags =>
  raw.reduce(
    (acc, row) => ({
      ...acc,
      [row.flag_name]: {
        isActive: row.is_active,
        kind: row.kind,
        ...(row.kind === "text" && { value: row.value }),
      },
    }),
    {} as FeatureFlags,
  );

export class PgFeatureFlagRepository implements FeatureFlagRepository {
  constructor(private transaction: KyselyDb) {}

  public async getAll(): Promise<FeatureFlags> {
    const result = await executeKyselyRawSqlQuery(
      this.transaction,
      "SELECT * FROM feature_flags",
    );
    return rawPgToFeatureFlags(result.rows);
  }

  public async insert(featureFlags: FeatureFlags): Promise<void> {
    await Promise.all(
      keys(featureFlags).map(async (flagName) => {
        const flag = featureFlags[flagName];
        await executeKyselyRawSqlQuery(
          this.transaction,
          "INSERT INTO feature_flags (flag_name, is_active, kind, value) VALUES ($1, $2, $3, $4)",
          [
            flagName,
            flag.isActive,
            flag.kind,
            hasFeatureFlagValue(flag) ? JSON.stringify(flag.value) : null,
          ],
        );
      }),
    );
  }

  public async update(params: SetFeatureFlagParam): Promise<void> {
    await executeKyselyRawSqlQuery(
      this.transaction,
      "UPDATE feature_flags SET is_active = $1, value = $2 WHERE flag_name = $3",
      [
        params.flagContent.isActive,
        hasFeatureFlagValue(params.flagContent)
          ? JSON.stringify(params.flagContent.value)
          : null,
        params.flagName,
      ],
    );
  }
}
