import {AgencyDtoBuilder, AgencyToReview, expectPromiseToFailWithError} from "shared";
import {
  createInMemoryUow,
  InMemoryUnitOfWork,
} from "../../../../adapters/primary/config/uowConfig";
import {
  ConflictError,
  NotFoundError,
} from "../../../../adapters/primary/helpers/httpErrors";
import { CustomTimeGateway } from "../../../../adapters/secondary/core/TimeGateway/CustomTimeGateway";
import { TestUuidGenerator } from "../../../../adapters/secondary/core/UuidGeneratorImplementations";
import { InMemoryUowPerformer } from "../../../../adapters/secondary/InMemoryUowPerformer";
import { makeCreateNewEvent } from "../../../core/eventBus/EventBus";
import { UpdateAgencyStatus } from "./UpdateAgencyStatus";

const nextDate = new Date("2022-01-01T10:00:00.000");
const nextUuid = "event-uuid";

describe("Update agency status", () => {
  let updateAgencyStatus: UpdateAgencyStatus;
  let uow: InMemoryUnitOfWork;

  beforeEach(() => {
    uow = createInMemoryUow();
    const uuidGenerator = new TestUuidGenerator();
    const timeGateway = new CustomTimeGateway();
    timeGateway.setNextDate(nextDate);
    uuidGenerator.setNextUuid(nextUuid);

    const createNewEvent = makeCreateNewEvent({
      uuidGenerator,
      timeGateway,
    });

    updateAgencyStatus = new UpdateAgencyStatus(
      new InMemoryUowPerformer(uow),
      createNewEvent,
    );
  });

  describe("right path", () => {
    const existingAgency = AgencyDtoBuilder.create("agency-123")
      .withStatus("needsReview")
      .build();

    it.each([{ status: "active" as const }, { status: "rejected" as const }])(
    "Updates an agency status in repository and publishes an event to notify if status becomes $status",
    async ({ status }) => {
      // Prepare
      uow.
      agencyRepository.setAgencies([existingAgency]);

      // Act
      await updateAgencyStatus.execute({
        id: existingAgency.id,
        status: "active",
        rejectionJustification:
          status === "rejected" ? "justification" : undefined,
      } as AgencyToReview);

      // Assert
      expect(uow.agencyRepository.agencies[0].status).toBe(status);
      expect(uow.outboxRepository.events[0]).toMatchObject({
        id: nextUuid,
        topic: status === "active" ? "AgencyActivated" : "AgencyRejected",
        payload: { agency: { ...existingAgency, status } },
      });
      },
    );
  });

  describe("wrong paths", () => {
    const existingAgency = AgencyDtoBuilder.create("agency-123")
      .withStatus("active")
      .build();

    it("returns 404 if agency not found", async () => {
      const agencyId = "not-found-id";
      await expectPromiseToFailWithError(
        updateAgencyStatus.execute({ id: agencyId, status: "active" }),
        new NotFoundError(`No agency found with id ${agencyId}`),
      );
    });

    it("returns HTTP 409 if attempt to update to another existing agency (with same address and kind, and a status 'active' or 'from-api-PE'", async () => {
      const agencyToUpdate = new AgencyDtoBuilder()
        .withId("agency-to-update-id")
        .withStatus("needsReview")
        .withAddress(existingAgency.address)
        .withKind(existingAgency.kind)
        .build();

      uow.agencyRepository.setAgencies([agencyToUpdate, existingAgency]);

      await expectPromiseToFailWithError(
        updateAgencyStatus.execute({ id: agencyToUpdate.id, status: "active" }),
        new ConflictError(
          "An other agency exists with the same address and kind",
        ),
      );
    });
  });
});
