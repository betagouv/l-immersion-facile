import { addDays } from "date-fns";
import subDays from "date-fns/subDays";
import {
  AgencyDtoBuilder,
  ConventionDtoBuilder,
  InclusionConnectedUserBuilder,
  expectObjectInArrayToMatch,
  frontRoutes,
} from "shared";
import { toAgencyWithRights } from "../../../utils/agency";
import { fakeGenerateMagicLinkUrlFn } from "../../../utils/jwtTestHelper";
import {
  SaveNotificationAndRelatedEvent,
  makeSaveNotificationAndRelatedEvent,
} from "../../core/notifications/helpers/Notification";
import { CustomTimeGateway } from "../../core/time-gateway/adapters/CustomTimeGateway";
import { TimeGateway } from "../../core/time-gateway/ports/TimeGateway";
import { InMemoryUowPerformer } from "../../core/unit-of-work/adapters/InMemoryUowPerformer";
import {
  InMemoryUnitOfWork,
  createInMemoryUow,
} from "../../core/unit-of-work/adapters/createInMemoryUow";
import { UuidV4Generator } from "../../core/uuid-generator/adapters/UuidGeneratorImplementations";
import {
  AssessmentReminder,
  makeAssessmentReminder,
} from "./AssessmentReminder";

describe("AssessmentReminder", () => {
  let uow: InMemoryUnitOfWork;
  let assessmentReminder: AssessmentReminder;
  let timeGateway: TimeGateway;
  let saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent;

  beforeEach(() => {
    uow = createInMemoryUow();
    timeGateway = new CustomTimeGateway();
    const uowPerformer = new InMemoryUowPerformer(uow);
    saveNotificationAndRelatedEvent = makeSaveNotificationAndRelatedEvent(
      new UuidV4Generator(),
      timeGateway,
    );
    assessmentReminder = makeAssessmentReminder({
      uowPerformer,
      deps: {
        timeGateway,
        saveNotificationAndRelatedEvent,
        generateConventionMagicLinkUrl: fakeGenerateMagicLinkUrlFn,
      },
    });
  });

  it("send first assessment reminder", async () => {
    const now = timeGateway.now();
    const conventionEndDate = subDays(now, 3);
    const agency = new AgencyDtoBuilder().build();
    const convention = new ConventionDtoBuilder()
      .withStatus("ACCEPTED_BY_VALIDATOR")
      .withDateEnd(conventionEndDate.toISOString())
      .withAgencyId(agency.id)
      .build();
    const validator = new InclusionConnectedUserBuilder()
      .withId("10000000-0000-0000-0000-000000000003")
      .withEmail("validator@agency1.fr")
      .buildUser();
    await uow.userRepository.save(validator);
    uow.agencyRepository.agencies = [
      toAgencyWithRights(agency, {
        [validator.id]: {
          isNotifiedByEmail: true,
          roles: ["validator"],
        },
      }),
    ];
    await uow.conventionRepository.save(convention);

    const { numberOfReminders } = await assessmentReminder.execute({
      mode: "3daysAfterConventionEnd",
    });

    expect(numberOfReminders).toBe(1);
    expectObjectInArrayToMatch(uow.notificationRepository.notifications, [
      {
        templatedContent: {
          kind: "ASSESSMENT_AGENCY_FIRST_REMINDER",
          params: {
            conventionId: convention.id,
            internshipKind: convention.internshipKind,
            businessName: convention.businessName,
            establishmentContactEmail:
              convention.signatories.establishmentRepresentative.email,
            beneficiaryFirstName: convention.signatories.beneficiary.firstName,
            beneficiaryLastName: convention.signatories.beneficiary.lastName,
            assessmentCreationLink: fakeGenerateMagicLinkUrlFn({
              id: convention.id,
              email: validator.email,
              role: "validator",
              targetRoute: frontRoutes.assessment,
              now,
            }),
          },
          recipients: [validator.email],
          sender: {
            email: "ne-pas-ecrire-a-cet-email@immersion-facile.beta.gouv.fr",
            name: "Immersion Facilitée",
          },
        },
      },
    ]);
    expectObjectInArrayToMatch(uow.outboxRepository.events, [
      { topic: "NotificationAdded" },
    ]);
  });

  it("send second assessment reminder", async () => {
    const now = timeGateway.now();
    const conventionEndDate = subDays(now, 10);
    const agency = new AgencyDtoBuilder().build();
    const convention = new ConventionDtoBuilder()
      .withStatus("ACCEPTED_BY_VALIDATOR")
      .withDateEnd(conventionEndDate.toISOString())
      .withAgencyId(agency.id)
      .build();
    const validator = new InclusionConnectedUserBuilder()
      .withId("10000000-0000-0000-0000-000000000003")
      .withEmail("validator@agency1.fr")
      .buildUser();
    await uow.userRepository.save(validator);
    uow.agencyRepository.agencies = [
      toAgencyWithRights(agency, {
        [validator.id]: {
          isNotifiedByEmail: true,
          roles: ["validator"],
        },
      }),
    ];
    await uow.conventionRepository.save(convention);

    const { numberOfReminders } = await assessmentReminder.execute({
      mode: "10daysAfterConventionEnd",
    });

    expect(numberOfReminders).toBe(1);
    expectObjectInArrayToMatch(uow.notificationRepository.notifications, [
      {
        templatedContent: {
          kind: "ASSESSMENT_AGENCY_SECOND_REMINDER",
          params: {
            conventionId: convention.id,
            internshipKind: convention.internshipKind,
            businessName: convention.businessName,
            establishmentContactEmail:
              convention.signatories.establishmentRepresentative.email,
            beneficiaryFirstName: convention.signatories.beneficiary.firstName,
            beneficiaryLastName: convention.signatories.beneficiary.lastName,
            assessmentCreationLink: fakeGenerateMagicLinkUrlFn({
              id: convention.id,
              email: validator.email,
              role: "validator",
              targetRoute: frontRoutes.assessment,
              now,
            }),
          },
          recipients: [validator.email],
          sender: {
            email: "ne-pas-ecrire-a-cet-email@immersion-facile.beta.gouv.fr",
            name: "Immersion Facilitée",
          },
        },
      },
    ]);
    expectObjectInArrayToMatch(uow.outboxRepository.events, [
      { topic: "NotificationAdded" },
    ]);
  });

  it("do not send first reminder if it is already sent", async () => {
    const now = timeGateway.now();
    const conventionEndDate = subDays(now, 3);
    const agency = new AgencyDtoBuilder().build();
    const convention = new ConventionDtoBuilder()
      .withStatus("ACCEPTED_BY_VALIDATOR")
      .withDateEnd(conventionEndDate.toISOString())
      .withAgencyId(agency.id)
      .build();
    const validator = new InclusionConnectedUserBuilder()
      .withId("10000000-0000-0000-0000-000000000003")
      .withEmail("validator@agency1.fr")
      .buildUser();
    await uow.userRepository.save(validator);
    uow.agencyRepository.agencies = [
      toAgencyWithRights(agency, {
        [validator.id]: {
          isNotifiedByEmail: true,
          roles: ["validator"],
        },
      }),
    ];
    await uow.conventionRepository.save(convention);
    uow.notificationRepository.notifications = [
      {
        kind: "email",
        id: "111111111111-1111-4000-1111-111111111111",
        createdAt: addDays(conventionEndDate, 3).toISOString(),
        followedIds: { conventionId: convention.id },
        templatedContent: {
          kind: "ASSESSMENT_AGENCY_FIRST_REMINDER",
          recipients: [validator.email],
          params: {
            conventionId: convention.id,
            internshipKind: convention.internshipKind,
            businessName: convention.businessName,
            establishmentContactEmail:
              convention.signatories.establishmentRepresentative.email,
            beneficiaryFirstName: convention.signatories.beneficiary.firstName,
            beneficiaryLastName: convention.signatories.beneficiary.lastName,
            assessmentCreationLink: fakeGenerateMagicLinkUrlFn({
              id: convention.id,
              email: validator.email,
              role: "validator",
              targetRoute: frontRoutes.assessment,
              now,
            }),
          },
        },
      },
    ];

    const { numberOfReminders } = await assessmentReminder.execute({
      mode: "3daysAfterConventionEnd",
    });

    expect(numberOfReminders).toBe(0);
  });

  it("do not send second reminder if it is already sent", async () => {
    const now = timeGateway.now();
    const conventionEndDate = subDays(now, 10);
    const agency = new AgencyDtoBuilder().build();
    const convention = new ConventionDtoBuilder()
      .withStatus("ACCEPTED_BY_VALIDATOR")
      .withDateEnd(conventionEndDate.toISOString())
      .withAgencyId(agency.id)
      .build();
    const validator = new InclusionConnectedUserBuilder()
      .withId("10000000-0000-0000-0000-000000000003")
      .withEmail("validator@agency1.fr")
      .buildUser();
    await uow.userRepository.save(validator);
    uow.agencyRepository.agencies = [
      toAgencyWithRights(agency, {
        [validator.id]: {
          isNotifiedByEmail: true,
          roles: ["validator"],
        },
      }),
    ];
    await uow.conventionRepository.save(convention);
    uow.notificationRepository.notifications = [
      {
        kind: "email",
        id: "111111111111-1111-4000-1111-111111111111",
        createdAt: addDays(conventionEndDate, 3).toISOString(),
        followedIds: { conventionId: convention.id },
        templatedContent: {
          kind: "ASSESSMENT_AGENCY_FIRST_REMINDER",
          recipients: [validator.email],
          params: {
            conventionId: convention.id,
            internshipKind: convention.internshipKind,
            businessName: convention.businessName,
            establishmentContactEmail:
              convention.signatories.establishmentRepresentative.email,
            beneficiaryFirstName: convention.signatories.beneficiary.firstName,
            beneficiaryLastName: convention.signatories.beneficiary.lastName,
            assessmentCreationLink: fakeGenerateMagicLinkUrlFn({
              id: convention.id,
              email: validator.email,
              role: "validator",
              targetRoute: frontRoutes.assessment,
              now,
            }),
          },
        },
      },
      {
        kind: "email",
        id: "111111111111-1111-4000-1111-111111111112",
        createdAt: addDays(conventionEndDate, 3).toISOString(),
        followedIds: { conventionId: convention.id },
        templatedContent: {
          kind: "ASSESSMENT_AGENCY_SECOND_REMINDER",
          recipients: [validator.email],
          params: {
            conventionId: convention.id,
            internshipKind: convention.internshipKind,
            businessName: convention.businessName,
            establishmentContactEmail:
              convention.signatories.establishmentRepresentative.email,
            beneficiaryFirstName: convention.signatories.beneficiary.firstName,
            beneficiaryLastName: convention.signatories.beneficiary.lastName,
            assessmentCreationLink: fakeGenerateMagicLinkUrlFn({
              id: convention.id,
              email: validator.email,
              role: "validator",
              targetRoute: frontRoutes.assessment,
              now,
            }),
          },
        },
      },
    ];

    const { numberOfReminders } = await assessmentReminder.execute({
      mode: "10daysAfterConventionEnd",
    });

    expect(numberOfReminders).toBe(0);
  });
});
