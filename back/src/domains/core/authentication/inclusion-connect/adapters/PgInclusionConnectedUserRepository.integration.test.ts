import { Pool } from "pg";
import {
  AgencyDtoBuilder,
  AgencyId,
  AgencyRole,
  AuthenticatedUser,
  AuthenticatedUserId,
  InclusionConnectedUser,
  expectArraysToEqualIgnoringOrder,
  expectToEqual,
} from "shared";
import {
  KyselyDb,
  makeKyselyDb,
} from "../../../../../config/pg/kysely/kyselyUtils";
import { getTestPgPool } from "../../../../../config/pg/pgUtils";
import { PgAgencyRepository } from "../../../../agency/adapters/PgAgencyRepository";
import { PgInclusionConnectedUserRepository } from "./PgInclusionConnectedUserRepository";

const authenticatedUser1: AuthenticatedUser = {
  id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@mail.com",
  externalId: "john-external-id",
};

const authenticatedUser2: AuthenticatedUser = {
  id: "44444444-4444-4444-4444-444444444444",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane.doe@mail.com",
  externalId: "jane-external-id",
};

const agency1 = new AgencyDtoBuilder()
  .withId("11111111-1111-4bbb-1111-111111111111")
  .withName("Agence 1")
  .build();
const agency2 = new AgencyDtoBuilder()
  .withId("22222222-2222-4bbb-2222-222222222222")
  .withName("Agence 2")
  .withKind("cci")
  .build();

describe("PgInclusionConnectedUserRepository", () => {
  let pool: Pool;
  let db: KyselyDb;
  let icUserRepository: PgInclusionConnectedUserRepository;
  let agencyRepository: PgAgencyRepository;

  beforeAll(async () => {
    pool = getTestPgPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    db = makeKyselyDb(pool);

    await db.deleteFrom("users_ongoing_oauths").execute();
    await db.deleteFrom("users").execute();
    await db.deleteFrom("users__agencies").execute();
    await db.deleteFrom("conventions").execute();
    await db.deleteFrom("agency_groups__agencies").execute();
    await db.deleteFrom("agency_groups").execute();
    await db.deleteFrom("agencies").execute();

    icUserRepository = new PgInclusionConnectedUserRepository(db);
    agencyRepository = new PgAgencyRepository(db);
  });

  describe("getById", () => {
    it("gets the Inclusion Connected User from its Id when no agency is connected", async () => {
      await insertAuthenticatedUser(authenticatedUser1);
      const inclusionConnectedUser = await icUserRepository.getById(
        authenticatedUser1.id,
      );
      expectToEqual(inclusionConnectedUser, {
        ...authenticatedUser1,
        agencyRights: [],
        establishmentDashboards: {},
      });
    });

    it("gets the Inclusion Connected User from its Id with the connected agencies", async () => {
      await Promise.all([
        await agencyRepository.insert(agency1),
        await agencyRepository.insert(agency2),
        await insertAuthenticatedUser(authenticatedUser1),
      ]);

      const userId = authenticatedUser1.id;

      // create the link between the user and the agencies

      await insertAgencyRegistrationToUser({
        agencyId: agency1.id,
        userId,
        role: "toReview",
      });
      await insertAgencyRegistrationToUser({
        agencyId: agency2.id,
        userId,
        role: "validator",
      });

      const inclusionConnectedUser = await icUserRepository.getById(
        authenticatedUser1.id,
      );
      expectToEqual(inclusionConnectedUser, {
        ...authenticatedUser1,
        agencyRights: [
          { agency: agency1, role: "toReview" },
          { agency: agency2, role: "validator" },
        ],
        establishmentDashboards: {},
      });
    });

    describe("addAgencyToUser", () => {
      it("adds an element in users__agencies table", async () => {
        await agencyRepository.insert(agency1);
        await insertAuthenticatedUser(authenticatedUser1);
        const icUserToSave: InclusionConnectedUser = {
          ...authenticatedUser1,
          agencyRights: [{ role: "counsellor", agency: agency1 }],
          establishmentDashboards: {},
        };

        await icUserRepository.update(icUserToSave);

        const savedIcUser = await icUserRepository.getById(
          authenticatedUser1.id,
        );
        expectToEqual(savedIcUser, icUserToSave);
      });

      it("Delete an element in users__agencies table when no agency rights are provided", async () => {
        await agencyRepository.insert(agency1);
        await insertAuthenticatedUser(authenticatedUser1);
        const icUserToSave: InclusionConnectedUser = {
          ...authenticatedUser1,
          agencyRights: [],
          establishmentDashboards: {},
        };

        await icUserRepository.update(icUserToSave);

        const savedIcUser = await icUserRepository.getById(
          authenticatedUser1.id,
        );
        expectToEqual(savedIcUser, icUserToSave);
      });

      it("Delete just one element in users__agencies table when two agency rights are provided", async () => {
        await agencyRepository.insert(agency1);
        await agencyRepository.insert(agency2);

        await insertAuthenticatedUser(authenticatedUser1);

        const icUserToSave: InclusionConnectedUser = {
          ...authenticatedUser1,
          agencyRights: [
            { agency: agency1, role: "validator" },
            { agency: agency2, role: "toReview" },
          ],
          establishmentDashboards: {},
        };

        await icUserRepository.update(icUserToSave);

        const savedIcUser = await icUserRepository.getById(
          authenticatedUser1.id,
        );

        expectToEqual(savedIcUser, icUserToSave);

        const updatedIcUserToSave: InclusionConnectedUser = {
          ...authenticatedUser1,
          agencyRights: [{ agency: agency1, role: "validator" }],
          establishmentDashboards: {},
        };

        await icUserRepository.update(updatedIcUserToSave);

        const updatedSavedIcUser = await icUserRepository.getById(
          authenticatedUser1.id,
        );
        expectToEqual(updatedSavedIcUser, updatedIcUserToSave);
      });
    });
  });

  describe("getWithFilters", () => {
    it("returns empty array if no filters are given", async () => {
      await Promise.all([
        agencyRepository.insert(agency1),
        insertAuthenticatedUser(authenticatedUser1),
      ]);

      await insertAgencyRegistrationToUser({
        agencyId: agency1.id,
        userId: authenticatedUser1.id,
        role: "toReview",
      });

      const icUsers = await icUserRepository.getWithFilter({});
      expect(icUsers).toEqual([]);
    });

    it("fetches Inclusion Connected Users with status 'toReview'", async () => {
      await Promise.all([
        agencyRepository.insert(agency1),
        agencyRepository.insert(agency2),
        insertAuthenticatedUser(authenticatedUser1),
        insertAuthenticatedUser(authenticatedUser2),
      ]);

      await Promise.all([
        insertAgencyRegistrationToUser({
          agencyId: agency1.id,
          userId: authenticatedUser1.id,
          role: "toReview",
        }),
        insertAgencyRegistrationToUser({
          agencyId: agency2.id,
          userId: authenticatedUser1.id,
          role: "validator",
        }),
        insertAgencyRegistrationToUser({
          agencyId: agency2.id,
          userId: authenticatedUser2.id,
          role: "toReview",
        }),
      ]);

      const icUsers = await icUserRepository.getWithFilter({
        agencyRole: "toReview",
      });

      expectArraysToEqualIgnoringOrder(icUsers, [
        {
          ...authenticatedUser1,
          agencyRights: [
            { agency: agency1, role: "toReview" },
            { agency: agency2, role: "validator" },
          ],
          establishmentDashboards: {},
        },
        {
          ...authenticatedUser2,
          agencyRights: [{ agency: agency2, role: "toReview" }],
          establishmentDashboards: {},
        },
      ]);
    });
  });

  const insertAuthenticatedUser = async ({
    id,
    email,
    firstName,
    lastName,
    externalId,
  }: AuthenticatedUser) => {
    await db
      .insertInto("users")
      .values({
        id,
        email,
        first_name: firstName,
        last_name: lastName,
        external_id: externalId,
      })
      .execute();
  };

  const insertAgencyRegistrationToUser = async ({
    userId,
    agencyId,
    role,
  }: {
    userId: AuthenticatedUserId;
    agencyId: AgencyId;
    role: AgencyRole;
  }) => {
    await db
      .insertInto("users__agencies")
      .values({
        user_id: userId,
        agency_id: agencyId,
        role,
      })
      .execute();
  };
});
