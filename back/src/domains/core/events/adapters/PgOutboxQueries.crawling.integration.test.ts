import { Pool, PoolClient } from "pg";
import { ConventionDto, ConventionDtoBuilder, expectToEqual } from "shared";
import { makeKyselyDb } from "../../../../config/pg/kysely/kyselyUtils";
import { getTestPgPool } from "../../../../config/pg/pgUtils";
import { CustomTimeGateway } from "../../time-gateway/adapters/CustomTimeGateway";
import { TestUuidGenerator } from "../../uuid-generator/adapters/UuidGeneratorImplementations";
import { DomainEvent, DomainTopic } from "../events";
import { CreateNewEvent, makeCreateNewEvent } from "../ports/EventBus";
import { PgOutboxQueries } from "./PgOutboxQueries";
import { PgOutboxRepository } from "./PgOutboxRepository";

let event1: DomainEvent;
let event2: DomainEvent;
let event3: DomainEvent;
let eventFailedToRerun: DomainEvent;
let withFailureButEventuallySuccessfulEvent: DomainEvent;
let alreadyProcessedEvent: DomainEvent;
let quarantinedEvent: DomainEvent;
let convention: ConventionDto;
let failedButQuarantinedEvent: DomainEvent;

const createEvents = async (
  uuidGenerator: TestUuidGenerator,
  timeGateway: CustomTimeGateway,
  createNewEvent: CreateNewEvent,
) => {
  const quarantinedTopic: DomainTopic = "ConventionRejected";

  uuidGenerator.setNextUuid("aaaaac99-9c0a-aaaa-aa6d-6aa9ad38aaaa");
  timeGateway.setNextDate(new Date("2021-11-15T10:00:00.000Z"));
  convention = new ConventionDtoBuilder().build();
  event1 = createNewEvent({
    topic: "ConventionSubmittedByBeneficiary",
    payload: { convention },
  });

  uuidGenerator.setNextUuid("bbbbbc99-9c0b-bbbb-bb6d-6bb9bd38bbbb");
  timeGateway.setNextDate(new Date("2021-11-15T10:01:00.000Z"));
  event2 = createNewEvent({
    topic: "ConventionSubmittedByBeneficiary",
    payload: { convention },
  });

  uuidGenerator.setNextUuid("cbcbcc99-9c0b-bbbb-bb6d-6bb9bd38cccc");
  timeGateway.setNextDate(new Date("2021-11-15T10:02:00.000Z"));
  event3 = createNewEvent({
    topic: "ConventionSubmittedByBeneficiary",
    payload: { convention },
  });

  timeGateway.setNextDate(new Date("2021-11-15T09:00:00.000Z"));
  uuidGenerator.setNextUuid("cccccc99-9c0c-cccc-cc6d-6cc9cd38cccc");
  alreadyProcessedEvent = createNewEvent({
    topic: "ConventionSubmittedByBeneficiary",
    payload: { convention },
    publications: [{ publishedAt: "2021-11-15T08:30:00.000Z", failures: [] }],
    status: "published",
  });

  timeGateway.setNextDate(new Date("2021-11-15T10:03:00.000Z"));
  uuidGenerator.setNextUuid("dddddd99-9d0d-dddd-dd6d-6dd9dd38dddd");
  quarantinedEvent = createNewEvent({
    topic: quarantinedTopic,
    payload: { convention },
  });

  uuidGenerator.setNextUuid("bbbbbc99-9c0b-bbbb-bb6d-6bb9bd38bbbb");
  timeGateway.setNextDate(new Date("2021-11-15T10:01:00.000Z"));
  eventFailedToRerun = createNewEvent({
    topic: "ConventionSubmittedByBeneficiary",
    payload: { convention },
    publications: [
      {
        publishedAt: "2021-11-15T08:00:00.000Z",
        failures: [
          {
            subscriptionId: "subscription1",
            errorMessage: "some error message",
          },
          {
            subscriptionId: "subscription2",
            errorMessage: "some other error",
          },
        ],
      },
    ],
  });

  timeGateway.setNextDate(new Date("2021-11-15T09:00:00.000Z"));
  uuidGenerator.setNextUuid("cccccc99-9c0c-cccc-cc6d-6cc9cd38cccc");
  withFailureButEventuallySuccessfulEvent = createNewEvent({
    topic: "ConventionSubmittedByBeneficiary",
    payload: { convention },
    status: "published",
    publications: [
      {
        publishedAt: "2021-11-15T06:00:00.000Z",
        failures: [
          { subscriptionId: "subscriptionB", errorMessage: "Some failure" },
        ],
      },
      { publishedAt: "2021-11-15T07:00:00.000Z", failures: [] },
    ],
  });

  timeGateway.setNextDate(new Date("2021-11-15T10:03:00.000Z"));
  uuidGenerator.setNextUuid("dddddd99-9d0d-dddd-dd6d-6dd9dd38dddd");
  failedButQuarantinedEvent = createNewEvent({
    topic: quarantinedTopic,
    payload: { convention },
    status: "failed-but-will-retry",
    publications: [
      {
        publishedAt: "2021-11-15T09:00:00.000Z",
        failures: [
          {
            subscriptionId: "subscription1",
            errorMessage: "some error message",
          },
        ],
      },
    ],
  });
};

describe("PgOutboxQueries for crawling purposes", () => {
  let pool: Pool;
  let client: PoolClient;
  let outboxQueries: PgOutboxQueries;
  const uuidGenerator = new TestUuidGenerator();
  const timeGateway = new CustomTimeGateway();
  const quarantinedTopic: DomainTopic = "ConventionRejected";

  const createNewEvent = makeCreateNewEvent({
    uuidGenerator,
    timeGateway,
    quarantinedTopics: [quarantinedTopic],
  });

  beforeAll(async () => {
    pool = getTestPgPool();
    client = await pool.connect();
  });

  afterAll(async () => {
    client.release();
    await pool.end();
  });

  beforeEach(async () => {
    await client.query("DELETE FROM outbox_failures");
    await client.query("DELETE FROM outbox_publications");
    await client.query("DELETE FROM outbox");

    outboxQueries = new PgOutboxQueries(makeKyselyDb(pool));

    await createEvents(uuidGenerator, timeGateway, createNewEvent);
  });

  it("finds all events to be processed", async () => {
    await storeInOutbox([
      event2,
      event1,
      event3,
      alreadyProcessedEvent,
      quarantinedEvent,
    ]);

    // act
    const events = await outboxQueries.getAllUnpublishedEvents({ limit: 2 });

    // assert
    expect(events.length).toBe(2);
    const expectedEventIds = [event1.id, event2.id, event3.id];
    const unexpectedEventIds = events.filter(
      (event) => !expectedEventIds.includes(event.id),
    );
    expect(unexpectedEventIds.length).toBe(0);
  });

  it("finds all events that have failed and should be reprocessed", async () => {
    await storeInOutbox([
      eventFailedToRerun,
      event1,
      withFailureButEventuallySuccessfulEvent,
      failedButQuarantinedEvent,
    ]);

    // act
    const eventsToRerun = await outboxQueries.getAllFailedEvents({ limit: 10 });

    // assert
    expectToEqual(eventsToRerun, [eventFailedToRerun]);
  });

  it("finds all events that have failed and should be reprocessed with limit", async () => {
    // prepare
    uuidGenerator.setNextUuid("aaaaac99-9c0a-aaaa-aa6d-6aa9ad38cccc");
    timeGateway.setNextDate(new Date("2021-11-15T10:02:00.000Z"));
    const anotherEventFailedToRerun = createNewEvent({
      topic: "ConventionSubmittedByBeneficiary",
      payload: { convention },
      publications: [
        {
          publishedAt: "2021-11-10T08:00:00.000Z",
          failures: [
            {
              subscriptionId: "subscription3",
              errorMessage: "some error message 3",
            },
          ],
        },
      ],
    });

    await storeInOutbox([
      eventFailedToRerun,
      event1,
      withFailureButEventuallySuccessfulEvent,
      failedButQuarantinedEvent,
      anotherEventFailedToRerun,
    ]);

    // act
    const eventsToRerun = await outboxQueries.getAllFailedEvents({ limit: 1 });

    // assert
    expectToEqual(eventsToRerun, [
      {
        ...eventFailedToRerun,
        publications: [
          {
            ...eventFailedToRerun.publications[0],
            failures: [eventFailedToRerun.publications[0].failures[0]],
          },
        ],
      },
    ]);
  });

  const storeInOutbox = async (events: DomainEvent[]) => {
    await Promise.all(
      events.map((event) =>
        new PgOutboxRepository(makeKyselyDb(pool)).save(event),
      ),
    );
  };
});
