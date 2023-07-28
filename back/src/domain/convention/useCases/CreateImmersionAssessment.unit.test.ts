import {
  ConventionDtoBuilder,
  ConventionJwtPayload,
  conventionStatuses,
  currentJwtVersions,
  expectArraysToEqual,
  expectObjectsToMatch,
  expectPromiseToFailWithError,
  ImmersionAssessmentDto,
  splitCasesBetweenPassingAndFailing,
} from "shared";
import { createInMemoryUow } from "../../../adapters/primary/config/uowConfig";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../../adapters/primary/helpers/httpErrors";
import { InMemoryOutboxRepository } from "../../../adapters/secondary/core/InMemoryOutboxRepository";
import { CustomTimeGateway } from "../../../adapters/secondary/core/TimeGateway/CustomTimeGateway";
import { TestUuidGenerator } from "../../../adapters/secondary/core/UuidGeneratorImplementations";
import { InMemoryConventionRepository } from "../../../adapters/secondary/InMemoryConventionRepository";
import { InMemoryImmersionAssessmentRepository } from "../../../adapters/secondary/InMemoryImmersionAssessmentRepository";
import { InMemoryUowPerformer } from "../../../adapters/secondary/InMemoryUowPerformer";
import { makeCreateNewEvent } from "../../core/eventBus/EventBus";
import { ImmersionAssessmentEntity } from "../entities/ImmersionAssessmentEntity";
import { CreateImmersionAssessment } from "./CreateImmersionAssessment";

const conventionId = "conventionId";

const immersionAssessment: ImmersionAssessmentDto = {
  conventionId,
  status: "FINISHED",
  establishmentFeedback: "Ca c'est bien passé",
};

const ConventionDtoBuilderWithId = new ConventionDtoBuilder().withId(
  conventionId,
);

const validPayload: ConventionJwtPayload = {
  applicationId: conventionId,
  role: "establishment",
  emailHash: "",
  version: currentJwtVersions.convention,
};

describe("CreateImmersionAssessment", () => {
  let outboxRepository: InMemoryOutboxRepository;
  let conventionRepository: InMemoryConventionRepository;
  let createImmersionAssessment: CreateImmersionAssessment;
  let uowPerformer: InMemoryUowPerformer;
  let immersionAssessmentRepository: InMemoryImmersionAssessmentRepository;

  beforeEach(() => {
    const uow = createInMemoryUow();
    immersionAssessmentRepository = uow.immersionAssessmentRepository;
    conventionRepository = uow.conventionRepository;
    outboxRepository = uow.outboxRepository;
    uowPerformer = new InMemoryUowPerformer(uow);
    const convention = ConventionDtoBuilderWithId.withStatus(
      "ACCEPTED_BY_VALIDATOR",
    )
      .withId(conventionId)
      .build();
    conventionRepository.setConventions({
      [convention.id]: convention,
    });
    createImmersionAssessment = new CreateImmersionAssessment(
      uowPerformer,
      makeCreateNewEvent({
        timeGateway: new CustomTimeGateway(),
        uuidGenerator: new TestUuidGenerator(),
      }),
    );
  });

  it("throws forbidden if no magicLink payload is provided", async () => {
    await expectPromiseToFailWithError(
      createImmersionAssessment.execute(immersionAssessment),
      new ForbiddenError("No magic link provided"),
    );
  });

  it("throws forbidden if magicLink payload has a different applicationId linked", async () => {
    await expectPromiseToFailWithError(
      createImmersionAssessment.execute(immersionAssessment, {
        applicationId: "otherId",
        role: "establishment",
      } as ConventionJwtPayload),
      new ForbiddenError(
        "Convention provided in DTO is not the same as application linked to it",
      ),
    );
  });

  it("throws forbidden if magicLink role is not establishment", async () => {
    await expectPromiseToFailWithError(
      createImmersionAssessment.execute(immersionAssessment, {
        applicationId: conventionId,
        role: "beneficiary",
      } as ConventionJwtPayload),
      new ForbiddenError("Only an establishment can create an assessment"),
    );
  });

  it("throws not found if provided conventionId does not match any in DB", async () => {
    const notFoundId = "not-found-id";
    await expectPromiseToFailWithError(
      createImmersionAssessment.execute(
        { ...immersionAssessment, conventionId: notFoundId },
        { ...validPayload, applicationId: notFoundId },
      ),
      new NotFoundError(`Did not found convention with id: ${notFoundId}`),
    );
  });

  it("throws ConflictError if the assessment already exists for the Convention", async () => {
    immersionAssessmentRepository.setAssessments([
      { ...immersionAssessment, _entityName: "ImmersionAssessment" },
    ]);
    await expectPromiseToFailWithError(
      createImmersionAssessment.execute(immersionAssessment, validPayload),
      new ConflictError(
        `Cannot create an assessment as one already exists for convention with id : ${conventionId}`,
      ),
    );
  });

  const [passingStatuses, failingStatuses] = splitCasesBetweenPassingAndFailing(
    conventionStatuses,
    ["ACCEPTED_BY_VALIDATOR"],
  );

  it.each(failingStatuses.map((status) => ({ status })))(
    "throws bad request if the Convention status is $status",
    async ({ status }) => {
      const convention = ConventionDtoBuilderWithId.withStatus(status).build();
      conventionRepository.setConventions({
        [convention.id]: convention,
      });

      await expectPromiseToFailWithError(
        createImmersionAssessment.execute(immersionAssessment, validPayload),
        new BadRequestError(
          `Cannot create an assessment for which the convention has not been validated, status was ${status}`,
        ),
      );
    },
  );

  it.each(passingStatuses.map((status) => ({ status })))(
    "should save the ImmersionAssessment if Convention has status $status",
    async ({ status }) => {
      const convention = ConventionDtoBuilderWithId.withStatus(status).build();
      conventionRepository.setConventions({
        [convention.id]: convention,
      });

      await createImmersionAssessment.execute(
        immersionAssessment,
        validPayload,
      );

      const expectedImmersionEntity: ImmersionAssessmentEntity = {
        ...immersionAssessment,
        _entityName: "ImmersionAssessment",
      };
      expectArraysToEqual(immersionAssessmentRepository.assessments, [
        expectedImmersionEntity,
      ]);
    },
  );

  it("should dispatch an ImmersionAssessmentCreated event", async () => {
    await createImmersionAssessment.execute(immersionAssessment, validPayload);
    expect(outboxRepository.events).toHaveLength(1);
    expectObjectsToMatch(outboxRepository.events[0], {
      topic: "ImmersionAssessmentCreated",
      payload: immersionAssessment,
    });
  });
});
