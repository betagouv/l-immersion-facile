import { addDays } from "date-fns";
import subDays from "date-fns/subDays";
import { Pool } from "pg";
import { expectToEqual } from "shared";
import { KyselyDb, makeKyselyDb } from "../../../config/pg/kysely/kyselyUtils";
import { getTestPgPool } from "../../../config/pg/pgUtils";
import { PgOutboxRepository } from "../../core/events/adapters/PgOutboxRepository";
import { PgNotificationRepository } from "../../core/notifications/adapters/PgNotificationRepository";
import { EstablishmentAggregateBuilder } from "../helpers/EstablishmentBuilders";
import {
  PgEstablishmentAggregateRepository,
  createGetAppellationsByCode,
} from "./PgEstablishmentAggregateRepository";

describe("PgScriptsQueries", () => {
  let pool: Pool;
  let db: KyselyDb;
  let pgEstablishmentAggregateRepository: PgEstablishmentAggregateRepository;
  let pgOutboxRepository: PgOutboxRepository;
  let pgNotificationRepository: PgNotificationRepository;

  beforeAll(async () => {
    pool = getTestPgPool();
    db = makeKyselyDb(pool);
    pgOutboxRepository = new PgOutboxRepository(db);
    pgNotificationRepository = new PgNotificationRepository(db);
    pgEstablishmentAggregateRepository = new PgEstablishmentAggregateRepository(
      db,
      createGetAppellationsByCode(db),
    );
  });

  beforeEach(async () => {
    await db.deleteFrom("establishments_contacts").execute();
    await db.deleteFrom("establishments_location_infos").execute();
    await db.deleteFrom("establishments_location_positions").execute();
    await db.deleteFrom("establishments").execute();
    await db.deleteFrom("outbox_failures").execute();
    await db.deleteFrom("outbox_publications").execute();
    await db.deleteFrom("outbox").execute();
    await db.deleteFrom("notifications_email_recipients").execute();
    await db.deleteFrom("notifications_email").execute();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("getSiretOfEstablishmentsToSuggestUpdate", () => {
    it("gets only the establishment that before since and that have not received the suggest email recently", async () => {
      const before = new Date("2023-07-01");
      const toUpdateDate = subDays(before, 5);
      const establishmentToUpdate = new EstablishmentAggregateBuilder()
        .withEstablishmentSiret("11110000111100")
        .withEstablishmentUpdatedAt(toUpdateDate)
        .withContactId("11111111-1111-4000-1111-111111111111")
        .withLocationId("aaaaaaaa-aaaa-4000-aaaa-aaaaaaaaaaaa")
        .build();

      // <<<<<----------- this is the legacy behavior, we keep it until we reach the 6 months.
      // We can remove this part of the code, and the FormEstablishmentEditLinkSent events in january 2024

      const establishmentWithLinkSentEvent = new EstablishmentAggregateBuilder()
        .withEstablishmentSiret("22220000222200")
        .withEstablishmentUpdatedAt(toUpdateDate)
        .withContactId("22222222-2222-4000-2222-222222222222")
        .withLocationId("aaaaaaaa-aaaa-4000-bbbb-bbbbbbbbbbbb")
        .build();

      await pgOutboxRepository.save({
        id: "22222222-2222-4000-2222-000000000000",
        topic: "FormEstablishmentEditLinkSent",
        payload: {
          siret: establishmentWithLinkSentEvent.establishment.siret,
          version: 1,
          triggeredBy: {
            kind: "establishment-magic-link",
            siret: establishmentWithLinkSentEvent.establishment.siret,
          },
        },
        occurredAt: addDays(before, 1).toISOString(),
        publications: [],
        status: "never-published",
        wasQuarantined: false,
      });

      // end of legacy ----------->>>>>>

      const eventWithNotificationSavedButLongAgo =
        new EstablishmentAggregateBuilder()
          .withEstablishmentSiret("33330000333300")
          .withEstablishmentUpdatedAt(toUpdateDate)
          .withContactId("33333333-3333-4000-3333-333333333333")
          .build();

      await pgNotificationRepository.save({
        id: "33333333-3333-4000-3333-000000000000",
        followedIds: {
          establishmentSiret:
            eventWithNotificationSavedButLongAgo.establishment.siret,
        },
        kind: "email",
        templatedContent: {
          kind: "SUGGEST_EDIT_FORM_ESTABLISHMENT",
          recipients: ["joe@mail.com"],
          params: {
            editFrontUrl: "http://edit-front.com",
            businessAddresses: ["24 rue des boucher 67000 strasbourg"],
            businessName: "SAS FRANCE MERGUEZ DISTRIBUTION",
          },
        },
        createdAt: subDays(before, 1).toISOString(),
      });

      const eventWithRecentNotificationSaved =
        new EstablishmentAggregateBuilder()
          .withEstablishmentSiret("44440000444400")
          .withEstablishmentUpdatedAt(toUpdateDate)
          .withContactId("44444444-4444-4000-4444-444444444444")
          .withLocationId("aaaaaaaa-aaaa-4000-cccc-cccccccccccc")
          .build();

      await pgNotificationRepository.save({
        id: "44444444-4444-4000-4444-000000000000",
        followedIds: {
          establishmentSiret:
            eventWithRecentNotificationSaved.establishment.siret,
        },
        kind: "email",
        templatedContent: {
          kind: "SUGGEST_EDIT_FORM_ESTABLISHMENT",
          recipients: ["jack@mail.com"],
          params: {
            editFrontUrl: "http://edit-jack-front.com",
            businessAddresses: ["24 rue des boucher 67000 strasbourg"],
            businessName: "SAS FRANCE MERGUEZ DISTRIBUTION",
          },
        },
        createdAt: addDays(before, 1).toISOString(),
      });

      const recentlyUpdatedEstablishment = new EstablishmentAggregateBuilder()
        .withEstablishmentSiret("99990000999900")
        .withEstablishmentUpdatedAt(addDays(before, 1))
        .withContactId("99999999-9999-4000-9999-999999999999")
        .withLocationId("aaaaaaaa-aaaa-4000-dddd-dddddddddddd")
        .build();

      await Promise.all(
        [
          establishmentToUpdate,
          eventWithNotificationSavedButLongAgo,
          eventWithRecentNotificationSaved,
          establishmentWithLinkSentEvent,
          recentlyUpdatedEstablishment,
        ].map((aggregate) =>
          pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
            aggregate,
          ),
        ),
      );

      // Act
      const sirets =
        await pgEstablishmentAggregateRepository.getSiretOfEstablishmentsToSuggestUpdate(
          before,
        );

      // Assert
      expectToEqual(sirets, [
        establishmentToUpdate.establishment.siret,
        eventWithNotificationSavedButLongAgo.establishment.siret,
      ]);
    });
  });
});
