import {
  ContactEstablishmentEventPayload,
  ContactMethod,
  addressDtoToString,
  expectPromiseToFailWithError,
  immersionFacileNoReplyEmailSender,
} from "shared";
import {
  BadRequestError,
  NotFoundError,
} from "../../../../adapters/primary/helpers/httpErrors";
import { InMemoryRomeRepository } from "../../../../adapters/secondary/InMemoryRomeRepository";
import {
  TEST_APPELLATION_CODE,
  TEST_APPELLATION_LABEL,
} from "../../../../adapters/secondary/offer/EstablishmentBuilders";
import {
  DiscussionAggregateBuilder,
  InMemoryDiscussionAggregateRepository,
} from "../../../../adapters/secondary/offer/InMemoryDiscussionAggregateRepository";
import {
  ExpectSavedNotificationsAndEvents,
  makeExpectSavedNotificationsAndEvents,
} from "../../../../utils/makeExpectSavedNotificationsAndEvents";
import { makeSaveNotificationAndRelatedEvent } from "../../../core/notifications/helpers/Notification";
import { CustomTimeGateway } from "../../../core/time-gateway/adapters/CustomTimeGateway";
import { InMemoryUowPerformer } from "../../../core/unit-of-work/adapters/InMemoryUowPerformer";
import { createInMemoryUow } from "../../../core/unit-of-work/adapters/createInMemoryUow";
import { UuidV4Generator } from "../../../core/uuid-generator/adapters/UuidGeneratorImplementations";
import { NotifyContactRequest } from "./NotifyContactRequest";

const siret = "11112222333344";
const discussionId = "discussion-id";
const allowedContactEmail = "toto@gmail.com";
const allowedCopyEmail = "copy@gmail.com";

describe("NotifyContactRequest", () => {
  let discussionAggregateRepository: InMemoryDiscussionAggregateRepository;
  let romeRepository: InMemoryRomeRepository;
  let notifyContactRequest: NotifyContactRequest;
  let expectSavedNotificationsAndEvents: ExpectSavedNotificationsAndEvents;

  beforeEach(() => {
    const uow = createInMemoryUow();
    discussionAggregateRepository = uow.discussionAggregateRepository;
    romeRepository = uow.romeRepository;

    expectSavedNotificationsAndEvents = makeExpectSavedNotificationsAndEvents(
      uow.notificationRepository,
      uow.outboxRepository,
    );

    const uuidGenerator = new UuidV4Generator();
    const timeGateway = new CustomTimeGateway();
    const saveNotificationAndRelatedEvent = makeSaveNotificationAndRelatedEvent(
      uuidGenerator,
      timeGateway,
    );

    notifyContactRequest = new NotifyContactRequest(
      new InMemoryUowPerformer(uow),
      saveNotificationAndRelatedEvent,
      "reply.domain.com",
    );
  });

  const prepareDiscussionInRepository = (contactMethod: ContactMethod) => {
    romeRepository.appellations = [
      {
        appellationCode: TEST_APPELLATION_CODE,
        appellationLabel: TEST_APPELLATION_LABEL,
        romeCode: "A0000",
        romeLabel: "Rome de test",
      },
    ];

    const discussion = new DiscussionAggregateBuilder()
      .withId(discussionId)
      .withSiret(siret)
      .withEstablishmentContact({
        email: allowedContactEmail,
        copyEmails: [allowedCopyEmail],
        contactMethod,
      })
      .withAppellationCode(TEST_APPELLATION_CODE)
      .build();

    discussionAggregateRepository.discussionAggregates = [discussion];
    return discussion;
  };

  describe("Right paths", () => {
    it("Sends ContactByEmailRequest email to establishment", async () => {
      const discussion = await prepareDiscussionInRepository("EMAIL");
      const validEmailPayload: ContactEstablishmentEventPayload = {
        discussionId: discussion.id,
      };

      await notifyContactRequest.execute(validEmailPayload);

      const { establishmentContact } = discussion;

      const expectedReplyToEmail = "discussion-id_b@reply.reply.domain.com";

      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "CONTACT_BY_EMAIL_REQUEST",
            recipients: [establishmentContact.email],
            sender: immersionFacileNoReplyEmailSender,
            replyTo: {
              email: expectedReplyToEmail,
              name: `${discussion.potentialBeneficiary.firstName} ${discussion.potentialBeneficiary.lastName} - via Immersion Facilitée`,
            },
            params: {
              replyToEmail: expectedReplyToEmail,
              businessName: discussion.businessName,
              contactFirstName: establishmentContact.firstName,
              contactLastName: establishmentContact.lastName,
              appellationLabel: TEST_APPELLATION_LABEL,
              potentialBeneficiaryFirstName:
                discussion.potentialBeneficiary.firstName,
              potentialBeneficiaryLastName:
                discussion.potentialBeneficiary.lastName,
              immersionObjective: discussion.immersionObjective,
              potentialBeneficiaryPhone:
                discussion.potentialBeneficiary.phone ??
                "pas de téléphone fourni",
              potentialBeneficiaryResumeLink:
                discussion.potentialBeneficiary.resumeLink,
              message: discussion.exchanges[0].message,
              businessAddress: addressDtoToString(discussion.address),
            },
            cc: establishmentContact.copyEmails,
          },
        ],
      });
    });

    it("Sends ContactByPhoneRequest email to potential beneficiary", async () => {
      const discussion = await prepareDiscussionInRepository("PHONE");
      const validPhonePayload: ContactEstablishmentEventPayload = {
        discussionId: discussion.id,
      };

      await notifyContactRequest.execute(validPhonePayload);

      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "CONTACT_BY_PHONE_INSTRUCTIONS",
            recipients: [discussion.potentialBeneficiary.email],
            sender: immersionFacileNoReplyEmailSender,
            params: {
              businessName: discussion.businessName,
              contactFirstName: discussion.establishmentContact.firstName,
              contactLastName: discussion.establishmentContact.lastName,
              contactPhone: discussion.establishmentContact.phone,
              potentialBeneficiaryFirstName:
                discussion.potentialBeneficiary.firstName,
              potentialBeneficiaryLastName:
                discussion.potentialBeneficiary.lastName,
            },
          },
        ],
      });
    });

    it("Sends ContactInPersonRequest email to potential beneficiary", async () => {
      const discussion = await prepareDiscussionInRepository("IN_PERSON");
      const validInPersonPayload: ContactEstablishmentEventPayload = {
        discussionId: discussion.id,
      };

      await notifyContactRequest.execute(validInPersonPayload);

      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "CONTACT_IN_PERSON_INSTRUCTIONS",
            recipients: [discussion.potentialBeneficiary.email],
            sender: immersionFacileNoReplyEmailSender,
            params: {
              businessName: discussion.businessName,
              contactFirstName: discussion.establishmentContact.firstName,
              contactLastName: discussion.establishmentContact.lastName,
              businessAddress: addressDtoToString(discussion.address),
              potentialBeneficiaryFirstName:
                discussion.potentialBeneficiary.firstName,
              potentialBeneficiaryLastName:
                discussion.potentialBeneficiary.lastName,
            },
          },
        ],
      });
    });
  });

  describe("wrong paths", () => {
    it("Missing discussion", async () => {
      const validInPersonPayload: ContactEstablishmentEventPayload = {
        discussionId,
      };

      await expectPromiseToFailWithError(
        notifyContactRequest.execute(validInPersonPayload),
        new NotFoundError(
          `No discussion found with id: ${validInPersonPayload.discussionId}`,
        ),
      );
    });

    it("Bad immersion offer with contactMode $contactMode", async () => {
      const discussion = await prepareDiscussionInRepository("EMAIL");
      const validContactRequestByMail: ContactEstablishmentEventPayload = {
        discussionId: discussion.id,
      };

      romeRepository.appellations = [];

      await expectPromiseToFailWithError(
        notifyContactRequest.execute(validContactRequestByMail),
        new BadRequestError(
          `No appellationLabel found for appellationCode: ${discussion.appellationCode}`,
        ),
      );
    });
  });
});
