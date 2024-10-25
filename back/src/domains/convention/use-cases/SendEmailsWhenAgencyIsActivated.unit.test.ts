import {
  AgencyDtoBuilder,
  InclusionConnectedUserBuilder,
  errors,
  expectPromiseToFailWithError,
} from "shared";
import {
  ExpectSavedNotificationsAndEvents,
  makeExpectSavedNotificationsAndEvents,
} from "../../../utils/makeExpectSavedNotificationAndEvent.helpers";
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
const icUser1Email = "jean-dupont@mail.com";
const icUser2Email = "pierre-durand@mail.com";
const icUser3Email = "jeanne-ferrand@mail.com";

const agency = new AgencyDtoBuilder()
  .withCounsellorEmails([icUser2Email])
  .withValidatorEmails([icUser1Email])
  .withName("just-activated-agency")
  .withLogoUrl("https://agency-logo.com")
  .build();

const agencyWithRefersTo = new AgencyDtoBuilder()
  .withCounsellorEmails([icUser3Email])
  .withValidatorEmails([icUser1Email])
  .withId("id-of-agency-refering-to-other")
  .withRefersToAgencyInfo({
    refersToAgencyId: agency.id,
    refersToAgencyName: agency.name,
  })
  .withName("just-activated-agency-refering-to-other-one")
  .withLogoUrl("https://agency-refering-logo.com")
  .build();

const icUser1 = new InclusionConnectedUserBuilder()
  .withId("ic-user-1-id")
  .withFirstName("jean")
  .withLastName("Dupont")
  .withEmail(icUser1Email)
  .withAgencyRights([
    { agency: agency, isNotifiedByEmail: true, roles: ["validator"] },
    {
      agency: agencyWithRefersTo,
      isNotifiedByEmail: true,
      roles: ["validator"],
    },
  ])
  .build();

const icUser2 = new InclusionConnectedUserBuilder()
  .withId("ic-user-2-id")
  .withFirstName("Pierre")
  .withLastName("Durand")
  .withEmail(icUser2Email)
  .withAgencyRights([
    { agency: agency, isNotifiedByEmail: true, roles: ["counsellor"] },
  ])
  .build();

const icUser3 = new InclusionConnectedUserBuilder()
  .withId("ic-user-3-id")
  .withFirstName("Jeanne")
  .withLastName("Ferrand")
  .withEmail(icUser3Email)
  .withAgencyRights([
    {
      agency: agencyWithRefersTo,
      isNotifiedByEmail: true,
      roles: ["counsellor"],
    },
  ])
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
    uow.userRepository.setInclusionConnectedUsers([icUser1, icUser2]);
    uow.agencyRepository.agencies = [agency];
    // Act
    await sendEmailsWhenAencyActivated.execute({ agency });

    // Assert
    expectSavedNotificationsAndEvents({
      emails: [
        {
          kind: "AGENCY_WAS_ACTIVATED",
          recipients: [icUser1.email, icUser2.email],
          params: {
            agencyName: "just-activated-agency",
            agencyLogoUrl: "https://agency-logo.com",
            refersToOtherAgency: false,
            agencyReferdToName: undefined,
            users: [
              {
                firstName: icUser1.firstName,
                lastName: icUser1.lastName,
                email: icUser1.email,
                agencyName: agency.name,
                isNotifiedByEmail: true,
                roles: ["validator"],
              },
              {
                firstName: icUser2.firstName,
                lastName: icUser2.lastName,
                email: icUser2.email,
                agencyName: agency.name,
                isNotifiedByEmail: true,
                roles: ["counsellor"],
              },
            ],
          },
        },
      ],
    });
  });

  it("throw not found error if no agency were found with agency refers to id when agency refering to other activated", async () => {
    uow.userRepository.setInclusionConnectedUsers([icUser1, icUser3]);
    uow.agencyRepository.agencies = [agencyWithRefersTo];
    await expectPromiseToFailWithError(
      sendEmailsWhenAencyActivated.execute({ agency: agencyWithRefersTo }),
      errors.agency.notFound({ agencyId: agency.id }),
    );
  });

  it("send a notification email to validating agency when agency refering to other was activated and one activation email to the counsellors of the agency refering to other", async () => {
    uow.userRepository.setInclusionConnectedUsers([icUser1, icUser2, icUser3]);
    uow.agencyRepository.agencies = [agency, agencyWithRefersTo];

    await sendEmailsWhenAencyActivated.execute({ agency: agencyWithRefersTo });

    expectSavedNotificationsAndEvents({
      emails: [
        {
          kind: "AGENCY_WAS_ACTIVATED",
          recipients: [...agencyWithRefersTo.counsellorEmails],
          params: {
            agencyName: agencyWithRefersTo.name,
            agencyLogoUrl: "https://agency-refering-logo.com",
            refersToOtherAgency: true,
            agencyReferdToName: agency.name,
            users: [
              {
                firstName: icUser3.firstName,
                lastName: icUser3.lastName,
                email: icUser3.email,
                agencyName: agencyWithRefersTo.name,
                isNotifiedByEmail: true,
                roles: ["counsellor"],
              },
            ],
          },
        },
        {
          kind: "AGENCY_WITH_REFERS_TO_ACTIVATED",
          recipients: [...agency.validatorEmails],
          params: {
            agencyLogoUrl: "https://agency-logo.com",
            nameOfAgencyRefering: agencyWithRefersTo.name,
            refersToAgencyName: agency.name,
            validatorEmails: agencyWithRefersTo.validatorEmails,
          },
        },
      ],
    });
  });
});
