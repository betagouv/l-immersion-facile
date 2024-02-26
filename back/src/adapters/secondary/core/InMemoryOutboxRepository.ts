import { values } from "ramda";
import { DomainEvent } from "../../../domain/core/eventBus/events";
import { OutboxRepository } from "../../../domain/core/ports/OutboxRepository";
import { createLogger } from "../../../utils/logger";

const logger = createLogger(__filename);

export class InMemoryOutboxRepository implements OutboxRepository {
  constructor(private readonly _events: Record<string, DomainEvent> = {}) {}

  //test purposes
  public get events(): DomainEvent[] {
    return values(this._events);
  }

  public async save(event: DomainEvent): Promise<void> {
    this._events[event.id] = event;
    logger.info(
      { newEvent: event, newOutboxSize: this._events.length },
      "save",
    );
  }

  public async markEventsAsInProcess(events: DomainEvent[]): Promise<void> {
    events.forEach((event) => {
      this._events[event.id] = {
        ...event,
        status: "in-process",
      };
    });
  }
}
