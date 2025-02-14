import { Pool } from "pg";
import { Notification } from "shared";
import {
  KyselyDb,
  makeKyselyDb,
} from "../../../../config/pg/kysely/kyselyUtils";
import { getTestPgPool } from "../../../../config/pg/pgUtils";
import {
  CreateNewEvent,
  makeCreateNewEvent,
} from "../../events/ports/EventBus";
import { CustomTimeGateway } from "../../time-gateway/adapters/CustomTimeGateway";
import { TestUuidGenerator } from "../../uuid-generator/adapters/UuidGeneratorImplementations";
import { UnitOfWork } from "../ports/UnitOfWork";
import { PgUowPerformer } from "./PgUowPerformer";
import { createPgUow } from "./createPgUow";

describe("PgUowPerformer", () => {
  let pool: Pool;
  let db: KyselyDb;
  let pgUowPerformer: PgUowPerformer;

  const uuidGenerator = new TestUuidGenerator();
  const createNewEvent = makeCreateNewEvent({
    uuidGenerator,
    timeGateway: new CustomTimeGateway(),
  });

  beforeAll(async () => {
    pool = getTestPgPool();
    db = makeKyselyDb(pool);
    pgUowPerformer = new PgUowPerformer(db, createPgUow);
  });

  beforeEach(async () => {
    await db.deleteFrom("outbox_failures").execute();
    await db.deleteFrom("outbox_publications").execute();
    await db.deleteFrom("outbox").execute();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("saves everything when all goes fine", async () => {
    uuidGenerator.setNextUuid("11111111-1111-1111-1111-111111111111");
    await pgUowPerformer.perform(useCaseUnderTest(createNewEvent));
    await expectLengthOfRepos({
      db,
      notificationLength: 1,
      outboxLength: 1,
    });
  });

  it("keeps modifications atomic when something goes wrong", async () => {
    uuidGenerator.setNextUuid("a failing uuid");
    try {
      await pgUowPerformer.perform(useCaseUnderTest(createNewEvent));
      expect("Should not be reached").toBe("");
    } catch (error: any) {
      expect(error.message).toBe(
        'invalid input syntax for type uuid: "a failing uuid"',
      );
    }

    await expectLengthOfRepos({
      db,
      notificationLength: 0,
      outboxLength: 0,
    });
  });
});

const expectLengthOfRepos = async ({
  notificationLength,
  outboxLength,
  db,
}: {
  notificationLength: number;
  outboxLength: number;
  db: KyselyDb;
}) => {
  expect(
    await db.selectFrom("notifications_email").selectAll().execute(),
  ).toHaveLength(notificationLength);

  expect(await db.selectFrom("outbox").selectAll().execute()).toHaveLength(
    outboxLength,
  );
};

const useCaseUnderTest =
  (createNewEvent: CreateNewEvent) => async (uow: UnitOfWork) => {
    const notification: Notification = {
      id: "",
      createdAt: new Date().toISOString(),
      kind: "email",
      templatedContent: {
        kind: "TEST_EMAIL",
        params: { input1: "", input2: "", url: "http://" },
        recipients: ["a@a.com"],
      },
      followedIds: {},
    };

    await uow.notificationRepository.save(notification);

    const event = createNewEvent({
      topic: "NotificationAdded",
      payload: { id: notification.id, kind: notification.kind },
    });
    await uow.outboxRepository.save(event);
  };
