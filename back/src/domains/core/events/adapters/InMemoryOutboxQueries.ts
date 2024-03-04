import { createLogger } from "../../../../utils/logger";
import { DomainEvent, eventsToDebugInfo } from "../events";
import { OutboxQueries } from "../ports/OutboxQueries";
import { InMemoryOutboxRepository } from "./InMemoryOutboxRepository";

const logger = createLogger(__filename);

export class InMemoryOutboxQueries implements OutboxQueries {
  constructor(private readonly outboxRepository: InMemoryOutboxRepository) {}

  public async getFailedEvents(): Promise<DomainEvent[]> {
    const allEvents = this.outboxRepository.events;
    logger.debug(
      { allEvents: eventsToDebugInfo(allEvents) },
      "getAllFailedEvents",
    );

    return allEvents.filter((event) => {
      const lastPublication = event.publications[event.publications.length - 1];
      if (!lastPublication) return false;
      return lastPublication.failures.length > 0;
    });
  }

  public async getAllUnpublishedEvents() {
    const allEvents = this.outboxRepository.events;
    logger.debug(
      { allEvents: eventsToDebugInfo(allEvents) },
      "getAllUnpublishedEvents",
    );
    const unpublishedEvents = allEvents.filter(
      (event) => !event.wasQuarantined && event.publications.length === 0,
    );

    if (unpublishedEvents.length > 0) {
      logger.info(
        { events: eventsToDebugInfo(unpublishedEvents) },
        "getAllUnpublishedEvents: found unpublished events",
      );
    }
    return unpublishedEvents;
  }
}
