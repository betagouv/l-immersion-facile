import {
  ConventionDtoBuilder,
  expectObjectsToMatch,
  expectToEqual,
} from "shared";
import { EventBus } from "../../../domain/core/eventBus/EventBus";
import type {
  DomainEvent,
  DomainTopic,
  EventFailure,
} from "../../../domain/core/eventBus/events";
import { createInMemoryUow } from "../../primary/config/uowConfig";
import { InMemoryUowPerformer } from "../InMemoryUowPerformer";
import { CustomTimeGateway } from "./TimeGateway/CustomTimeGateway";
import { InMemoryEventBus } from "./InMemoryEventBus";
import { InMemoryOutboxRepository } from "./InMemoryOutboxRepository";

const domainEvt: DomainEvent = {
  id: "anId",
  topic: "ConventionSubmittedByBeneficiary",
  payload: { convention: new ConventionDtoBuilder().build() },
  occurredAt: "a date",
  wasQuarantined: false,
  status: "never-published",
  publications: [],
};

describe("InMemoryEventBus", () => {
  let anEventBus: InMemoryEventBus;
  let timeGateway: CustomTimeGateway;
  let outboxRepository: InMemoryOutboxRepository;

  beforeEach(() => {
    timeGateway = new CustomTimeGateway();
    const uow = createInMemoryUow();
    outboxRepository = uow.outboxRepository;
    const uowPerformer = new InMemoryUowPerformer(uow);
    anEventBus = new InMemoryEventBus(timeGateway, uowPerformer);
  });

  describe("Publish to an existing topic", () => {
    it("Marks event as published even if no-one was subscribed to it", async () => {
      // Prepare
      const publishDate = new Date("2022-01-01");
      timeGateway.setNextDate(publishDate);

      // Act
      await anEventBus.publish(domainEvt);

      // Assert
      expect(outboxRepository.events).toHaveLength(1);

      expectObjectsToMatch(outboxRepository.events[0], {
        ...domainEvt,
        wasQuarantined: false,
        publications: [
          { publishedAt: publishDate.toISOString(), failures: [] },
        ],
        status: "published",
      });
    });

    it("Publishes to a new topic and check we have only one spyed event", async () => {
      // Prepare
      const publishDate = new Date("2022-01-01");
      timeGateway.setNextDate(publishDate);
      const publishedEvents = spyOnTopic(
        anEventBus,
        "ConventionSubmittedByBeneficiary",
        "subscription1",
      );

      // Act
      await anEventBus.publish(domainEvt);

      // Assert
      expect(publishedEvents).toHaveLength(1);
      expectObjectsToMatch(publishedEvents[0], domainEvt);
      expect(outboxRepository.events).toHaveLength(1);

      expectObjectsToMatch(outboxRepository.events[0], {
        ...domainEvt,
        wasQuarantined: false,
        publications: [
          { publishedAt: publishDate.toISOString(), failures: [] },
        ],
        status: "published",
      });
    });
  });

  it("Publish to the same topic and check that 2 subscribers get the message", async () => {
    // Prepare
    const publishDate = new Date("2022-01-01");
    timeGateway.setNextDate(publishDate);
    const eventsOnFirstHandler = spyOnTopic(
      anEventBus,
      "ConventionSubmittedByBeneficiary",
      "subscription1",
    );
    const eventsOnSecondHandler = spyOnTopic(
      anEventBus,
      "ConventionSubmittedByBeneficiary",
      "subscription2",
    );

    // Act
    await anEventBus.publish(domainEvt);

    // Assert
    expect(eventsOnFirstHandler).toHaveLength(1);
    expect(eventsOnFirstHandler[0]).toEqual(domainEvt);
    expect(eventsOnSecondHandler).toHaveLength(1);
    expect(eventsOnSecondHandler[0]).toEqual(domainEvt);

    expectToEqual(outboxRepository.events[0], {
      ...domainEvt,
      wasQuarantined: false,
      publications: [{ publishedAt: publishDate.toISOString(), failures: [] }],
      status: "published",
    });
  });

  describe("when one of the handlers fails", () => {
    it("catch the error and flags the failing subscriber", async () => {
      // Prepare
      const publishDate = new Date("2022-01-01");
      timeGateway.setNextDate(publishDate);
      const eventsOnFirstHandler = spyOnTopic(
        anEventBus,
        "ConventionSubmittedByBeneficiary",
        "workingSubscription",
      );

      anEventBus.subscribe(
        "ConventionSubmittedByBeneficiary",
        "failingSubscription",
        async (_) => {
          throw new Error("Failed");
        },
      );

      // Act
      await anEventBus.publish(domainEvt);

      // Assert
      const expectedEvent: DomainEvent = {
        ...domainEvt,
        wasQuarantined: false,
        publications: [],
        status: "never-published",
      };

      expectToEqual(eventsOnFirstHandler, [expectedEvent]);

      expectObjectsToMatch(outboxRepository.events[0], {
        ...expectedEvent,
        publications: [
          {
            publishedAt: publishDate.toISOString(),
            failures: [
              { subscriptionId: "failingSubscription", errorMessage: "Failed" },
            ],
          },
        ],
        status: "failed-but-will-retry",
      });
    });
  });

  describe("when republishing an already published event", () => {
    const initialPublishDate = new Date("2022-01-01");
    const failedSubscriptionId = "failedSubscription";
    const eventToRePublish: DomainEvent = {
      ...domainEvt,
      wasQuarantined: false,
      status: "failed-but-will-retry",
      publications: [
        {
          publishedAt: initialPublishDate.toISOString(),
          failures: [
            {
              subscriptionId: failedSubscriptionId,
              errorMessage: "Initially Failed",
            },
          ],
        },
      ],
    };

    it("saves the new publications linked to the event", async () => {
      // Prepare
      const rePublishDate = new Date("2022-01-02");
      timeGateway.setNextDate(rePublishDate);
      const eventsOnInitiallyFailedHandler = spyOnTopic(
        anEventBus,
        "ConventionSubmittedByBeneficiary",
        failedSubscriptionId,
      );

      // Act
      await anEventBus.publish(eventToRePublish);

      // Assert
      const expectedEvent: DomainEvent = {
        ...domainEvt,
        wasQuarantined: false,
        publications: [
          {
            publishedAt: initialPublishDate.toISOString(),
            failures: [
              {
                subscriptionId: failedSubscriptionId,
                errorMessage: "Initially Failed",
              },
            ],
          },
          {
            publishedAt: rePublishDate.toISOString(),
            failures: [],
          },
        ],
        status: "published",
      };

      expect(eventsOnInitiallyFailedHandler).toHaveLength(1);
      expectObjectsToMatch(eventsOnInitiallyFailedHandler[0], eventToRePublish);
      expectObjectsToMatch(outboxRepository.events[0], expectedEvent);
    });

    it("only re-executes the subscriptions that failed", async () => {
      // Prepare
      const rePublishDate = new Date("2022-01-02");
      timeGateway.setNextDate(rePublishDate);
      const eventsOnFirstHandler = spyOnTopic(
        anEventBus,
        "ConventionSubmittedByBeneficiary",
        "workingSubscription",
      );
      const eventsOnInitiallyFailedHandler = spyOnTopic(
        anEventBus,
        "ConventionSubmittedByBeneficiary",
        failedSubscriptionId,
      );

      // Act
      await anEventBus.publish(eventToRePublish);

      // Assert
      const expectedEvent: DomainEvent = {
        ...eventToRePublish,
        wasQuarantined: false,
        publications: [
          ...eventToRePublish.publications,
          { publishedAt: rePublishDate.toISOString(), failures: [] },
        ],
        status: "published",
      };

      expect(eventsOnFirstHandler).toHaveLength(0);
      expect(eventsOnInitiallyFailedHandler).toHaveLength(1);
      expectObjectsToMatch(eventsOnInitiallyFailedHandler[0], eventToRePublish);
      expectObjectsToMatch(outboxRepository.events[0], expectedEvent);
    });

    it("puts the event in quarantine if it fails at the 4th try", async () => {
      const failures: EventFailure[] = [
        {
          subscriptionId: failedSubscriptionId,
          errorMessage: "Failed",
        },
      ];
      const eventPublished3TimesAlready: DomainEvent = {
        ...domainEvt,
        wasQuarantined: false,
        status: "failed-but-will-retry",
        publications: [
          {
            publishedAt: new Date("2022-01-01").toISOString(),
            failures,
          },
          {
            publishedAt: new Date("2022-01-02").toISOString(),
            failures,
          },
          {
            publishedAt: new Date("2022-01-03").toISOString(),
            failures,
          },
        ],
      };

      const rePublishDate = new Date("2022-01-04");
      timeGateway.setNextDate(rePublishDate);
      anEventBus.subscribe(
        "ConventionSubmittedByBeneficiary",
        failedSubscriptionId,
        () => {
          throw new Error("4th failure");
        },
      );

      // Act
      await anEventBus.publish(eventPublished3TimesAlready);

      // Assert
      const expectedEvent: DomainEvent = {
        ...domainEvt,
        wasQuarantined: true,
        status: "failed-to-many-times",
        publications: [
          ...eventPublished3TimesAlready.publications,
          {
            publishedAt: rePublishDate.toISOString(),
            failures: [
              {
                subscriptionId: failedSubscriptionId,
                errorMessage: "4th failure",
              },
            ],
          },
        ],
      };

      expect(outboxRepository.events).toHaveLength(1);
      expectObjectsToMatch(outboxRepository.events[0], expectedEvent);
    });
  });
});

const spyOnTopic = (
  eventBus: EventBus,
  topic: DomainTopic,
  subscriptionId: string,
): DomainEvent[] => {
  const publishedEvents: DomainEvent[] = [];
  //eslint-disable-next-line @typescript-eslint/require-await
  eventBus.subscribe(topic, subscriptionId, async (event) => {
    publishedEvents.push(event);
  });
  return publishedEvents;
};
