import { AgencyDtoBuilder, expectPromiseToFailWith } from "shared";
import {
  ExpectSavedNotificationsAndEvents,
  makeExpectSavedNotificationsAndEvents,
} from "../../../utils/makeExpectSavedNotificationsAndEvents";
import { makeSaveNotificationAndRelatedEvent } from "../../core/notifications/helpers/Notification";
import { CustomTimeGateway } from "../../core/time-gateway/adapters/CustomTimeGateway";
import { TimeGateway } from "../../core/time-gateway/ports/TimeGateway";
import { InMemoryUowPerformer } from "../../core/unit-of-work/adapters/InMemoryUowPerformer";
import {
  InMemoryUnitOfWork,
  createInMemoryUow,
} from "../../core/unit-of-work/adapters/createInMemoryUow";
import { UuidV4Generator } from "../../core/uuid-generator/adapters/UuidGeneratorImplementations";
import { SendEmailsWhenAgencyIsActivated } from "./SendEmailsWhenAgencyIsActivated";

const emailPresentInBoth = "in-both@mail.com";
const counsellorEmails = ["councellor@email.com"];
const validatorEmails = ["toto-valide@email.com"];

const agency = new AgencyDtoBuilder()
  .withCounsellorEmails([...counsellorEmails, emailPresentInBoth])
  .withValidatorEmails([...validatorEmails, emailPresentInBoth])
  .withName("just-activated-agency")
  .withLogoUrl("https://agency-logo.com")
  .build();

const agencyWithRefersTo = new AgencyDtoBuilder()
  .withId("accompanying-agency-id")
  .withRefersToAgencyId(agency.id)
  .withCounsellorEmails(["accompanying-councellor@email.com"])
  .withValidatorEmails(agency.validatorEmails)
  .withName("just-activated-accompanying-agency")
  .withLogoUrl("https://accompanying-logo.com")
  .build();

describe("SendEmailWhenAgencyIsActivated", () => {
  let uow: InMemoryUnitOfWork;
  let sendEmailsWhenAencyActivated: SendEmailsWhenAgencyIsActivated;
  let expectSavedNotificationsAndEvents: ExpectSavedNotificationsAndEvents;
  let timeGateway: TimeGateway;

  beforeEach(() => {
    uow = createInMemoryUow();
    const uowPerformer = new InMemoryUowPerformer(uow);
    expectSavedNotificationsAndEvents = makeExpectSavedNotificationsAndEvents(
      uow.notificationRepository,
      uow.outboxRepository,
    );
    timeGateway = new CustomTimeGateway();
    const uuidGenerator = new UuidV4Generator();
    const saveNotificationAndRelatedEvent = makeSaveNotificationAndRelatedEvent(
      uuidGenerator,
      timeGateway,
    );
    sendEmailsWhenAencyActivated = new SendEmailsWhenAgencyIsActivated(
      uowPerformer,
      saveNotificationAndRelatedEvent,
    );
  });

  it("Sends activation email to counsellors and validators when agency without refers to id got activated", async () => {
    // Act
    await sendEmailsWhenAencyActivated.execute({ agency });

    // Assert
    expectSavedNotificationsAndEvents({
      emails: [
        {
          kind: "AGENCY_WAS_ACTIVATED",
          recipients: [
            ...validatorEmails,
            emailPresentInBoth,
            ...counsellorEmails,
          ],
          params: {
            agencyName: "just-activated-agency",
            agencyLogoUrl: "https://agency-logo.com",
            refersToOtherAgency: false,
          },
        },
      ],
    });
  });

  it("throw not found error if no agency were found with agency refers to id when accompanying agency activated", async () => {
    await expectPromiseToFailWith(
      sendEmailsWhenAencyActivated.execute({ agency: agencyWithRefersTo }),
      `No agency were found with id : ${agency.id}`,
    );
  });

  it("send a notification email to validating agency when accompagnying agency was activated and one activation email to the counsellors of the acompanying agency", async () => {
    uow.agencyRepository.agencies = [agency];

    await sendEmailsWhenAencyActivated.execute({ agency: agencyWithRefersTo });

    expectSavedNotificationsAndEvents({
      emails: [
        {
          kind: "AGENCY_WAS_ACTIVATED",
          recipients: [...agencyWithRefersTo.counsellorEmails],
          params: {
            agencyName: agencyWithRefersTo.name,
            agencyLogoUrl: "https://accompanying-logo.com",
            refersToOtherAgency: true,
            validatorEmails: agencyWithRefersTo.validatorEmails,
          },
        },
        {
          kind: "ACCOMPANYING_AGENCY_WITH_AGENCY_REFERS_TO_NOTIFICATION",
          recipients: [...agency.validatorEmails],
          params: {
            agencyLogoUrl: "https://agency-logo.com",
            accompanyingAgencyName: agencyWithRefersTo.name,
            refersToAgencyName: agency.name,
            validatorEmails: agencyWithRefersTo.validatorEmails,
          },
        },
      ],
    });
  });
});
