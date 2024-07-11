import { addDays } from "date-fns";
import {
  DiscussionBuilder,
  DiscussionDto,
  TemplatedEmail,
  cartographeAppellationAndRome,
  createOpaqueEmail,
  expectToEqual,
  immersionFacileNoReplyEmailSender,
} from "shared";
import { v4 as uuid } from "uuid";
import {
  ExpectSavedNotificationsAndEvents,
  makeExpectSavedNotificationsAndEvents,
} from "../../../utils/makeExpectSavedNotificationAndEvent.helpers";
import { makeSaveNotificationAndRelatedEvent } from "../../core/notifications/helpers/Notification";
import { CustomTimeGateway } from "../../core/time-gateway/adapters/CustomTimeGateway";
import { InMemoryUowPerformer } from "../../core/unit-of-work/adapters/InMemoryUowPerformer";
import {
  InMemoryUnitOfWork,
  createInMemoryUow,
} from "../../core/unit-of-work/adapters/createInMemoryUow";
import { TestUuidGenerator } from "../../core/uuid-generator/adapters/UuidGeneratorImplementations";
import {
  ContactRequestReminder,
  ContactRequestReminderMode,
  makeContactRequestReminder,
} from "./ContactRequestReminder";

describe("ContactRequestReminder", () => {
  const now = new Date();
  const domain = "domain.fr";
  const [
    discussionWith2DaysSinceBeneficiairyExchange,
    discussionWith3DaysSinceBeneficiairyExchange,
    discussionWith4DaysSinceBeneficiairyExchange,
    discussionWith6DaysSinceBeneficiairyExchange,
    discussionWith7DaysSinceBeneficiairyExchange,
    discussionWith8DaysSinceBeneficiairyExchange,
  ] = [
    addDays(now, -2),
    addDays(now, -3),
    addDays(now, -4),
    addDays(now, -6),
    addDays(now, -7),
    addDays(now, -8),
  ].map((date, index) =>
    new DiscussionBuilder()
      .withId(uuid())
      .withPotentialBeneficiary({
        email: `benef-${index}@email.com`,
        firstName: `mike-${index}`,
        lastName: `porknoy-${index}`,
        phone: "0677889944",
      })
      .withExchanges([
        {
          sender: "potentialBeneficiary",
          recipient: "establishment",
          subject: "This is a contact request",
          message: "Beneficiary message",
          sentAt: date.toISOString(),
          attachments: [],
        },
      ])
      .build(),
  );

  let contactRequestReminder: ContactRequestReminder;
  let uow: InMemoryUnitOfWork;
  let expectSavedNotificationsAndEvents: ExpectSavedNotificationsAndEvents;

  beforeEach(() => {
    const timeGateway = new CustomTimeGateway(now);
    const uuidGenerator = new TestUuidGenerator();
    uuidGenerator.setNextUuids(["1", "2"]);

    uow = createInMemoryUow();
    contactRequestReminder = makeContactRequestReminder({
      uowPerformer: new InMemoryUowPerformer(uow),
      deps: {
        domain,
        saveNotificationAndRelatedEvent: makeSaveNotificationAndRelatedEvent(
          uuidGenerator,
          timeGateway,
        ),
        timeGateway,
      },
    });
    expectSavedNotificationsAndEvents = makeExpectSavedNotificationsAndEvents(
      uow.notificationRepository,
      uow.outboxRepository,
    );
  });

  describe("wrong paths", () => {
    it("no discussion with missing establishment response since 3 or 7 days", async () => {
      uow.discussionRepository.discussions = [
        discussionWith2DaysSinceBeneficiairyExchange,
        discussionWith6DaysSinceBeneficiairyExchange,
      ];
      const reminderQty3d = await contactRequestReminder.execute(
        "3days",
        undefined,
      );
      const reminderQty7d = await contactRequestReminder.execute(
        "7days",
        undefined,
      );
      expectToEqual(reminderQty3d, { numberOfNotifications: 0 });
      expectToEqual(reminderQty7d, { numberOfNotifications: 0 });
      expectToEqual(uow.outboxRepository.events, []);
    });
  });

  describe("right paths", () => {
    it("when discussion with missing establishment response 3 days after ", async () => {
      uow.discussionRepository.discussions = [
        discussionWith2DaysSinceBeneficiairyExchange,
        discussionWith3DaysSinceBeneficiairyExchange,
        discussionWith4DaysSinceBeneficiairyExchange,
        discussionWith6DaysSinceBeneficiairyExchange,
        discussionWith7DaysSinceBeneficiairyExchange,
        discussionWith8DaysSinceBeneficiairyExchange,
      ];
      const reminderQty = await contactRequestReminder.execute(
        "3days",
        undefined,
      );

      expectToEqual(reminderQty, { numberOfNotifications: 2 });
      expectSavedNotificationsAndEvents({
        emails: [
          makeEstablishmentContactRequestReminder(
            discussionWith3DaysSinceBeneficiairyExchange,
            domain,
            "3days",
          ),
          makeEstablishmentContactRequestReminder(
            discussionWith4DaysSinceBeneficiairyExchange,
            domain,
            "3days",
          ),
        ],
      });
    });

    it("when discussion with missing establishment response 7 days after ", async () => {
      uow.discussionRepository.discussions = [
        discussionWith2DaysSinceBeneficiairyExchange,
        discussionWith3DaysSinceBeneficiairyExchange,
        discussionWith4DaysSinceBeneficiairyExchange,
        discussionWith6DaysSinceBeneficiairyExchange,
        discussionWith7DaysSinceBeneficiairyExchange,
        discussionWith8DaysSinceBeneficiairyExchange,
      ];

      const reminderQty = await contactRequestReminder.execute(
        "7days",
        undefined,
      );

      expectToEqual(reminderQty, { numberOfNotifications: 2 });
      expectSavedNotificationsAndEvents({
        emails: [
          makeEstablishmentContactRequestReminder(
            discussionWith7DaysSinceBeneficiairyExchange,
            domain,
            "7days",
          ),
          makeEstablishmentContactRequestReminder(
            discussionWith8DaysSinceBeneficiairyExchange,
            domain,
            "7days",
          ),
        ],
      });
    });
  });
});

const makeEstablishmentContactRequestReminder = (
  discussion: DiscussionDto,
  domain: string,
  mode: ContactRequestReminderMode,
): TemplatedEmail => {
  const replyEmail = createOpaqueEmail(
    discussion.id,
    "potentialBeneficiary",
    `reply.${domain}`,
  );
  return {
    kind: "ESTABLISHMENT_CONTACT_REQUEST_REMINDER",
    params: {
      appelationLabel: cartographeAppellationAndRome.appellationLabel,
      beneficiaryFirstName: discussion.potentialBeneficiary.firstName,
      beneficiaryLastName: discussion.potentialBeneficiary.lastName,
      beneficiaryReplyToEmail: replyEmail,
      domain,
      mode,
    },
    recipients: [discussion.establishmentContact.email],
    sender: immersionFacileNoReplyEmailSender,
    replyTo: {
      email: replyEmail,
      name: `${discussion.potentialBeneficiary.firstName} ${discussion.potentialBeneficiary.lastName}`,
    },
  };
};
