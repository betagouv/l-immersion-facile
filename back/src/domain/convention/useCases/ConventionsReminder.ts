import { addBusinessDays, differenceInBusinessDays } from "date-fns";
import { ConventionDto, ConventionId, ConventionStatus } from "shared";
import { z } from "zod";
import { CreateNewEvent } from "../../core/eventBus/EventBus";
import { DomainEvent } from "../../core/eventBus/events";
import { ReminderType } from "../../core/eventsPayloads/ConventionSignReminderPayload";
import { TimeGateway } from "../../core/ports/TimeGateway";
import { UnitOfWork, UnitOfWorkPerformer } from "../../core/ports/UnitOfWork";
import { TransactionalUseCase } from "../../core/UseCase";

const supportedStatuses: ConventionStatus[] = [
  "READY_TO_SIGN",
  "PARTIALLY_SIGNED",
  "IN_REVIEW",
];

const ZERO_DAYS = 0;
const ONE_DAY = 1;
const TWO_DAYS = 2;
const THREE_DAYS = 3;

type ConventionsReminderSummary = {
  success: number;
  failures: {
    id: ConventionId;
    error: Error;
  }[];
};
export class ConventionsReminder extends TransactionalUseCase<
  void,
  ConventionsReminderSummary
> {
  constructor(
    uowPerformer: UnitOfWorkPerformer,
    private timeGateway: TimeGateway,
    private readonly createNewEvent: CreateNewEvent,
  ) {
    super(uowPerformer);
  }

  protected inputSchema = z.void();

  protected async _execute(
    _: void,
    uow: UnitOfWork,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): Promise<ConventionsReminderSummary> {
    const supportedConventions = await this.getSupportedConventions(uow);

    const results: { id: ConventionId; error: Error | null }[] =
      await Promise.all(
        supportedConventions
          .map((convention) =>
            this.prepareReminderEventsByConvention(convention),
          )
          .flat()
          .map((eventWithConvention) =>
            uow.outboxRepository
              .save(eventWithConvention.event)
              .then((_result) => ({ id: eventWithConvention.id, error: null }))
              .catch((error: Error) => ({ id: eventWithConvention.id, error })),
          ),
      );

    return {
      success: results.filter(
        (
          result,
        ): result is {
          id: ConventionId;
          error: null;
        } => result.error === null,
      ).length,
      failures: results.filter(
        (
          result,
        ): result is {
          id: ConventionId;
          error: Error;
        } => result.error instanceof Error,
      ),
    };
  }

  private prepareReminderEventsByConvention(
    convention: ConventionDto,
  ): { id: ConventionId; event: DomainEvent }[] {
    const differenceInDays: number = differenceInBusinessDays(
      new Date(convention.dateStart),
      this.timeGateway.now(),
    );

    return [
      ...this.addReminderTypeForConventionOnMatchCase(
        "FirstReminderForSignatories",
        convention.id,
        IsFirstReminderForSignatories(differenceInDays, convention),
      ),
      ...this.addReminderTypeForConventionOnMatchCase(
        "LastReminderForSignatories",
        convention.id,
        isLastReminderForSignatories(differenceInDays, convention),
      ),
      ...this.addReminderTypeForConventionOnMatchCase(
        "FirstReminderForAgency",
        convention.id,
        isFirstReminderForAgency(differenceInDays, convention),
      ),
      ...this.addReminderTypeForConventionOnMatchCase(
        "LastReminderForAgency",
        convention.id,
        isLastReminderForAgency(differenceInDays, convention),
      ),
    ];
  }

  private addReminderTypeForConventionOnMatchCase(
    reminderType: ReminderType,
    conventionId: ConventionId,
    supportedCondition: boolean,
  ): { id: ConventionId; event: DomainEvent }[] {
    return supportedCondition
      ? [
          {
            id: conventionId,
            event: this.createNewEvent({
              topic: "ConventionSignReminder",
              payload: {
                conventionId,
                type: reminderType,
              },
            }),
          },
        ]
      : [];
  }

  private getSupportedConventions(uow: UnitOfWork): Promise<ConventionDto[]> {
    return uow.conventionQueries.getConventionsByFilters({
      startDateGreater: this.timeGateway.now(),
      startDateLessOrEqual: addBusinessDays(this.timeGateway.now(), 3),
      withStatuses: supportedStatuses,
    });
  }
}

const isLastReminderForAgency = (
  differenceInDays: number,
  convention: ConventionDto,
): boolean =>
  ZERO_DAYS < differenceInDays &&
  differenceInDays <= ONE_DAY &&
  convention.status === "IN_REVIEW";

const isFirstReminderForAgency = (
  differenceInDays: number,
  convention: ConventionDto,
): boolean =>
  TWO_DAYS < differenceInDays &&
  differenceInDays <= THREE_DAYS &&
  convention.status === "IN_REVIEW";

const isLastReminderForSignatories = (
  differenceInDays: number,
  convention: ConventionDto,
): boolean =>
  ZERO_DAYS < differenceInDays &&
  differenceInDays <= TWO_DAYS &&
  (convention.status === "PARTIALLY_SIGNED" ||
    convention.status === "READY_TO_SIGN");

const IsFirstReminderForSignatories = (
  differenceInDays: number,
  convention: ConventionDto,
): boolean =>
  TWO_DAYS < differenceInDays &&
  differenceInDays <= THREE_DAYS &&
  (convention.status === "PARTIALLY_SIGNED" ||
    convention.status === "READY_TO_SIGN");
