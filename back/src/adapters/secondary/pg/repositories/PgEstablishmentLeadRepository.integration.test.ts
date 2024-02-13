import { subDays } from "date-fns";
import { Pool, PoolClient } from "pg";
import { expectToEqual } from "shared";
import { EstablishmentLead } from "../../../../domain/offer/entities/EstablishmentLeadEntity";
import { makeKyselyDb } from "../kysely/kyselyUtils";
import { getTestPgPool } from "../pgUtils";
import { PgEstablishmentLeadRepository } from "./PgEstablishmentLeadRepository";

describe("PgEstablishmentLeadRepository", () => {
  let pool: Pool;
  let client: PoolClient;
  let establishmentLeadRepository: PgEstablishmentLeadRepository;

  beforeAll(async () => {
    pool = getTestPgPool();
    client = await pool.connect();
  });

  beforeEach(async () => {
    await client.query("DELETE FROM establishment_lead_events");
    establishmentLeadRepository = new PgEstablishmentLeadRepository(
      makeKyselyDb(pool),
    );
  });

  afterAll(async () => {
    client.release();
    await pool.end();
  });

  describe("save & getBySiret", () => {
    it("Save EstablishmentLead", async () => {
      const noResult =
        await establishmentLeadRepository.getBySiret("40400000000404");
      expect(noResult).toBeUndefined();

      const now = new Date();
      const establishmentLead: EstablishmentLead = {
        siret: "12345678901234",
        lastEventKind: "registration-accepted",
        events: [
          {
            conventionId: "45664444-1234-4000-4444-123456789012",
            occurredAt: subDays(now, 2),
            kind: "to-be-reminded",
          },
          {
            occurredAt: now,
            kind: "registration-accepted",
          },
        ],
      };

      await establishmentLeadRepository.save(establishmentLead);

      const leadInDb = await establishmentLeadRepository.getBySiret(
        establishmentLead.siret,
      );

      expectToEqual(leadInDb, establishmentLead);
    });
  });

  describe("getSiretsByLastEventKind", () => {
    it("returns empty array when no data matches", async () => {
      const result =
        await establishmentLeadRepository.getSiretsByUniqLastEventKind(
          "to-be-reminded",
        );

      expectToEqual(result, []);
    });

    it("return one establishmentLead with kind to-be-reminded", async () => {
      const now = new Date();
      const establishmentLeadAccepted: EstablishmentLead = {
        siret: "12345678901234",
        lastEventKind: "registration-accepted",
        events: [
          {
            conventionId: "45664444-1234-4000-4444-123456789013",
            occurredAt: subDays(now, 2),
            kind: "to-be-reminded",
          },
          {
            occurredAt: now,
            kind: "registration-accepted",
          },
        ],
      };
      const establishmentLeadToBeReminded: EstablishmentLead = {
        siret: "12345678901235",
        lastEventKind: "to-be-reminded",
        events: [
          {
            conventionId: "45664444-1234-4000-4444-123456789012",
            occurredAt: subDays(now, 2),
            kind: "to-be-reminded",
          },
        ],
      };
      await establishmentLeadRepository.save(establishmentLeadAccepted);
      await establishmentLeadRepository.save(establishmentLeadToBeReminded);

      const result =
        await establishmentLeadRepository.getSiretsByUniqLastEventKind(
          "to-be-reminded",
        );

      expectToEqual(result, [establishmentLeadToBeReminded.siret]);
    });

    it("return one establishmentLead with kind reminder-sent", async () => {
      const now = new Date();
      const establishmentLeadToBeReminded: EstablishmentLead = {
        siret: "12345678901235",
        lastEventKind: "to-be-reminded",
        events: [
          {
            conventionId: "45664444-1234-4000-4444-123456789012",
            occurredAt: subDays(now, 2),
            kind: "to-be-reminded",
          },
          {
            occurredAt: subDays(now, 1),
            kind: "reminder-sent",
            notification: {
              id: "33333331-3333-4c90-3333-333333333333",
              kind: "email",
            },
          },
        ],
      };
      const establishmentLeadAlreadyReminded: EstablishmentLead = {
        siret: "33345678901233",
        lastEventKind: "reminder-sent",
        events: [
          {
            conventionId: "55664444-1234-4000-4444-123456789012",
            occurredAt: subDays(now, 5),
            kind: "to-be-reminded",
          },
          {
            occurredAt: subDays(now, 3),
            kind: "reminder-sent",
            notification: {
              id: "33333332-3333-4c90-3333-333333333333",
              kind: "email",
            },
          },
          {
            occurredAt: subDays(now, 2),
            kind: "reminder-sent",
            notification: {
              id: "33333333-3333-4c90-3333-333333333333",
              kind: "email",
            },
          },
        ],
      };
      await establishmentLeadRepository.save(establishmentLeadToBeReminded);
      await establishmentLeadRepository.save(establishmentLeadAlreadyReminded);

      const result =
        await establishmentLeadRepository.getSiretsByUniqLastEventKind(
          "reminder-sent",
        );

      expectToEqual(result, [establishmentLeadToBeReminded.siret]);
    });
  });
});
