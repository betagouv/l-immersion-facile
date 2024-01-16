import { Pool, PoolClient } from "pg";
import {
  expectToEqual,
  FeatureFlags,
  makeBooleanFeatureFlag,
  makeTextFeatureFlag,
} from "shared";
import { getTestPgPool } from "../../../../_testBuilders/getTestPgPool";
import { FeatureFlagRepository } from "../../../../domain/core/ports/FeatureFlagRepository";
import { makeKyselyDb } from "../kysely/kyselyUtils";
import { PgFeatureFlagRepository } from "./PgFeatureFlagRepository";

describe("PG getFeatureFlags", () => {
  let pool: Pool;
  let client: PoolClient;
  let featureFlagRepository: FeatureFlagRepository;

  beforeEach(async () => {
    pool = getTestPgPool();
    client = await pool.connect();
    await client.query("DELETE FROM feature_flags");
    featureFlagRepository = new PgFeatureFlagRepository(makeKyselyDb(pool));
  });

  afterEach(async () => {
    client.release();
    await pool.end();
  });

  it("gets all the Feature Flags of the app", async () => {
    const expectedFeatureFlags: FeatureFlags = {
      enableTemporaryOperation: makeBooleanFeatureFlag(false),
      enableMaintenance: makeTextFeatureFlag(false, {
        message: "Maintenance message",
      }),
    };

    await featureFlagRepository.insert(expectedFeatureFlags);

    const featureFlags = await featureFlagRepository.getAll();

    expectToEqual(featureFlags, {
      enableTemporaryOperation: makeBooleanFeatureFlag(false),
      enableMaintenance: makeTextFeatureFlag(false, {
        message: "Maintenance message",
      }),
    });
  });

  it("inserts featureFlags than updates a Feature Flag to the given value", async () => {
    const initialFeatureFlags: FeatureFlags = {
      enableTemporaryOperation: makeBooleanFeatureFlag(false),
      enableMaintenance: makeTextFeatureFlag(false, {
        message: "Maintenance message",
      }),
    };

    await featureFlagRepository.insert(initialFeatureFlags);

    const featureFlagsInitiallyInserted = await featureFlagRepository.getAll();
    expectToEqual(initialFeatureFlags, featureFlagsInitiallyInserted);

    await featureFlagRepository.update({
      flagName: "enableTemporaryOperation",
      flagContent: {
        isActive: true,
      },
    });

    const featureFlags = await featureFlagRepository.getAll();
    expectToEqual(featureFlags, {
      enableTemporaryOperation: makeBooleanFeatureFlag(true),
      enableMaintenance: makeTextFeatureFlag(false, {
        message: "Maintenance message",
      }),
    });
  });
});
