import * as Sentry from "@sentry/node";
import { keys, prop } from "ramda";
import { DateString } from "shared";
import {
  EventBus,
  EventCallback,
} from "../../../domain/core/eventBus/EventBus";
import {
  DomainEvent,
  DomainTopic,
  EventFailure,
  EventPublication,
  SubscriptionId,
} from "../../../domain/core/eventBus/events";
import { UnitOfWorkPerformer } from "../../../domain/core/ports/UnitOfWork";
import { TimeGateway } from "../../../domain/core/time-gateway/ports/TimeGateway";
import {
  counterPublishedEventsError,
  counterPublishedEventsSuccess,
  counterPublishedEventsTotal,
} from "../../../utils/counters";
import { createLogger } from "../../../utils/logger";
import { notifyObjectDiscord } from "../../../utils/notifyDiscord";

const logger = createLogger(__filename);

type SubscriptionsForTopic = Record<string, EventCallback<DomainTopic>>;

export class InMemoryEventBus implements EventBus {
  public subscriptions: Partial<Record<DomainTopic, SubscriptionsForTopic>>;

  constructor(
    private timeGateway: TimeGateway,
    private uowPerformer: UnitOfWorkPerformer,
    private throwOnPublishFailure = false,
  ) {
    this.subscriptions = {};
  }

  public async publish(event: DomainEvent) {
    const publishedAt = this.timeGateway.now().toISOString();
    const publishedEvent = await this.#publish(event, publishedAt);
    logger.info(
      {
        eventId: publishedEvent.id,
        topic: publishedEvent.topic,
        occurredAt: publishedEvent.occurredAt,
        publicationsBefore: event.publications,
        publicationsAfter: publishedEvent.publications,
      },
      "Saving published event",
    );
    await this.uowPerformer.perform((uow) =>
      uow.outboxRepository.save(publishedEvent),
    );
  }

  public subscribe<T extends DomainTopic>(
    domainTopic: T,
    subscriptionId: SubscriptionId,
    callback: EventCallback<T>,
  ) {
    logger.info({ domainTopic }, "subscribe");
    if (!this.subscriptions[domainTopic]) {
      this.subscriptions[domainTopic] = {};
    }

    const subscriptionsForTopic: SubscriptionsForTopic =
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      this.subscriptions[domainTopic]!;

    if (subscriptionsForTopic[subscriptionId]) {
      logger.warn(
        { domainTopic, subscriptionId },
        "Subscription with this id already exists. It will be override",
      );
    }

    if (callback) {
      subscriptionsForTopic[subscriptionId] = callback as any;
    }
  }

  async #publish(
    event: DomainEvent,
    publishedAt: DateString,
  ): Promise<DomainEvent> {
    // the publication happens here, an event is expected in return,
    // with the publication added to the event
    logger.info({ event }, "publish");

    const topic = event.topic;
    counterPublishedEventsTotal.inc({ topic });
    logger.info({ topic }, "publishedEventsTotal");

    const callbacksById: SubscriptionsForTopic | undefined =
      this.subscriptions[topic];

    if (isUndefined(callbacksById))
      return publishEventWithNoCallbacks(event, publishedAt);

    const failuresOrUndefined: (EventFailure | void)[] = await Promise.all(
      getSubscriptionIdsToPublish(event, callbacksById).map(
        makeExecuteCbMatchingSubscriptionId(
          event,
          callbacksById,
          this.throwOnPublishFailure,
        ),
      ),
    );

    const failures: EventFailure[] = failuresOrUndefined.filter(isEventFailure);

    const publications: EventPublication[] = [
      ...event.publications,
      {
        publishedAt,
        failures,
      },
    ];

    if (failures.length === 0) {
      counterPublishedEventsSuccess.inc({ topic });
      logger.info({ topic }, "publishedEventsSuccess");
      return {
        ...event,
        publications,
        status: "published",
      };
    }

    // Some subscribers have failed :
    const wasMaxNumberOfErrorsReached = event.publications.length >= 3;
    if (wasMaxNumberOfErrorsReached) {
      const message = "Failed too many times, event will be Quarantined";
      logger.error({ event }, message);
      const { payload: _, publications, ...restEvent } = event;
      notifyObjectDiscord({
        event: {
          ...restEvent,
          lastPublication: publications.at(-1),
        },
        message,
      });
    }

    return {
      ...event,
      status: wasMaxNumberOfErrorsReached
        ? "failed-to-many-times"
        : "failed-but-will-retry",
      publications,
      wasQuarantined: wasMaxNumberOfErrorsReached,
    };
  }
}

const isUndefined = (
  callbacksById: SubscriptionsForTopic | undefined,
): callbacksById is undefined => callbacksById === undefined;

const publishEventWithNoCallbacks = (
  event: DomainEvent,
  publishedAt: DateString,
): DomainEvent => {
  monitorAbsenceOfCallback(event);

  return {
    ...event,
    publications: [...event.publications, { publishedAt, failures: [] }],
    status: "published",
  };
};

const makeExecuteCbMatchingSubscriptionId =
  (
    event: DomainEvent,
    callbacksById: SubscriptionsForTopic,
    throwOnPublishFailure: boolean,
  ) =>
  async (subscriptionId: SubscriptionId): Promise<void | EventFailure> => {
    const cb = callbacksById[subscriptionId];
    logger.info(
      { eventId: event.id, topic: event.topic },
      `Sending an event for ${subscriptionId}`,
    );

    try {
      await cb(event);
    } catch (error: any) {
      Sentry.captureException(error);
      monitorErrorInCallback(error, event);
      if (throwOnPublishFailure) {
        throw new Error(
          [
            `Could not process event with id : ${event.id}.`,
            `Subscription ${subscriptionId} failed on topic ${event.topic}.`,
            `Error was : ${error.message}`,
          ].join("\n"),
          { cause: error },
        );
      }
      return { subscriptionId, errorMessage: error.message };
    }
  };

const isEventFailure = (
  failure: EventFailure | void,
): failure is EventFailure => !!failure;

const getSubscriptionIdsToPublish = (
  event: DomainEvent,
  callbacksById: SubscriptionsForTopic,
): SubscriptionId[] => {
  const lastPublication = event.publications.at(-1);
  return lastPublication
    ? lastPublication.failures.map(prop("subscriptionId"))
    : keys(callbacksById);
};

const monitorAbsenceOfCallback = (event: DomainEvent) => {
  logger.warn({ eventTopic: event.topic }, "No Callbacks exist for topic.");
};

const monitorErrorInCallback = (error: any, event: DomainEvent) => {
  counterPublishedEventsError.inc({
    topic: event.topic,
    errorType: "callback_failed",
  });
  logger.error(
    {
      topic: event.topic,
      event,
      error: error.message || JSON.stringify(error),
    },
    "publishedEventsError",
  );
};
