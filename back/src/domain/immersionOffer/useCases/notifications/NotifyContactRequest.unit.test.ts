import {
  addressDtoToString,
  ContactEstablishmentEventPayload,
  expectPromiseToFailWithError,
} from "shared";
import { ContactEntityBuilder } from "../../../../_testBuilders/ContactEntityBuilder";
import { EstablishmentAggregateBuilder } from "../../../../_testBuilders/EstablishmentAggregateBuilder";
import { EstablishmentEntityBuilder } from "../../../../_testBuilders/EstablishmentEntityBuilder";
import { ImmersionOfferEntityV2Builder } from "../../../../_testBuilders/ImmersionOfferEntityV2Builder";
import {
  ExpectSavedNotificationsAndEvents,
  makeExpectSavedNotificationsAndEvents,
} from "../../../../_testBuilders/makeExpectSavedNotificationsAndEvents";
import { createInMemoryUow } from "../../../../adapters/primary/config/uowConfig";
import {
  BadRequestError,
  NotFoundError,
} from "../../../../adapters/primary/helpers/httpErrors";
import { CustomTimeGateway } from "../../../../adapters/secondary/core/TimeGateway/CustomTimeGateway";
import { UuidV4Generator } from "../../../../adapters/secondary/core/UuidGeneratorImplementations";
import {
  InMemoryEstablishmentAggregateRepository,
  TEST_APPELLATION_CODE,
  TEST_APPELLATION_LABEL,
} from "../../../../adapters/secondary/immersionOffer/InMemoryEstablishmentAggregateRepository";
import { InMemoryUowPerformer } from "../../../../adapters/secondary/InMemoryUowPerformer";
import { makeSaveNotificationAndRelatedEvent } from "../../../generic/notifications/entities/Notification";
import { NotifyContactRequest } from "./NotifyContactRequest";

const immersionOffer = new ImmersionOfferEntityV2Builder()
  .withAppellationCode(TEST_APPELLATION_CODE)
  .withAppellationLabel(TEST_APPELLATION_LABEL)
  .build();

const siret = "11112222333344";
const contactId = "theContactId";
const discussionId = "discussion-id";

const payload: ContactEstablishmentEventPayload = {
  siret,
  discussionId,
  appellationCode: TEST_APPELLATION_CODE,
  contactMode: "PHONE",
  potentialBeneficiaryFirstName: "potential_beneficiary_name",
  potentialBeneficiaryLastName: "potential_beneficiary_last_name",
  potentialBeneficiaryEmail: "potential_beneficiary@email.fr",
};

const allowedContactEmail = "toto@gmail.com";
const allowedCopyEmail = "copy@gmail.com";

describe("NotifyContactRequest", () => {
  let establishmentAggregateRepository: InMemoryEstablishmentAggregateRepository;
  let notifyContactRequest: NotifyContactRequest;
  let expectSavedNotificationsAndEvents: ExpectSavedNotificationsAndEvents;

  beforeEach(() => {
    const uow = createInMemoryUow();
    establishmentAggregateRepository = uow.establishmentAggregateRepository;

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

  describe("Right paths", () => {
    it("Sends ContactByEmailRequest email to establishment", async () => {
      const validEmailPayload: ContactEstablishmentEventPayload = {
        ...payload,
        contactMode: "EMAIL",
        message: "message_to_send",
        immersionObjective: "Confirmer un projet professionnel",
        potentialBeneficiaryPhone: "0654783402",
      };
      const establishment = new EstablishmentEntityBuilder()
        .withSiret(siret)
        .build();
      const contact = new ContactEntityBuilder()
        .withId(contactId)
        .withContactMethod("EMAIL")
        .withEmail(allowedContactEmail)
        .withCopyEmails([allowedCopyEmail])
        .build();
      await establishmentAggregateRepository.insertEstablishmentAggregates([
        new EstablishmentAggregateBuilder()
          .withEstablishment(establishment)
          .withContact(contact)
          .withImmersionOffers([immersionOffer])
          .build(),
      ]);

      await notifyContactRequest.execute(validEmailPayload);

      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "CONTACT_BY_EMAIL_REQUEST",
            recipients: [contact.email],
            replyTo: {
              email: "discussion-id_b@reply.reply.domain.com",
              name: "potential_beneficiary_name potential_beneficiary_last_name - via Immersion Facilitée",
            },
            params: {
              businessName: establishment.name,
              contactFirstName: contact.firstName,
              contactLastName: contact.lastName,
              appellationLabel: TEST_APPELLATION_LABEL,
              potentialBeneficiaryFirstName:
                payload.potentialBeneficiaryFirstName,
              potentialBeneficiaryLastName:
                payload.potentialBeneficiaryLastName,
              potentialBeneficiaryEmail: payload.potentialBeneficiaryEmail,
              immersionObjective: validEmailPayload.immersionObjective,
              potentialBeneficiaryPhone:
                validEmailPayload.potentialBeneficiaryPhone,
              potentialBeneficiaryResumeLink:
                validEmailPayload.potentialBeneficiaryResumeLink,
              message: validEmailPayload.message,
              businessAddress: addressDtoToString(establishment.address),
            },
            cc: contact.copyEmails,
          },
        ],
      });
    });

    it("Sends ContactByPhoneRequest email to potential beneficiary", async () => {
      const validPhonePayload: ContactEstablishmentEventPayload = {
        ...payload,
        contactMode: "PHONE",
      };
      const establishment = new EstablishmentEntityBuilder()
        .withSiret(siret)
        .build();
      const contact = new ContactEntityBuilder()
        .withId(contactId)
        .withContactMethod("PHONE")
        .build();
      await establishmentAggregateRepository.insertEstablishmentAggregates([
        new EstablishmentAggregateBuilder()
          .withEstablishment(establishment)
          .withContact(contact)
          .withImmersionOffers([immersionOffer])
          .build(),
      ]);

      await notifyContactRequest.execute(validPhonePayload);

      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "CONTACT_BY_PHONE_INSTRUCTIONS",
            recipients: [payload.potentialBeneficiaryEmail],
            params: {
              businessName: establishment.name,
              contactFirstName: contact.firstName,
              contactLastName: contact.lastName,
              contactPhone: contact.phone,
              potentialBeneficiaryFirstName:
                payload.potentialBeneficiaryFirstName,
              potentialBeneficiaryLastName:
                payload.potentialBeneficiaryLastName,
            },
          },
        ],
      });
    });

    it("Sends ContactInPersonRequest email to potential beneficiary", async () => {
      const validInPersonPayload: ContactEstablishmentEventPayload = {
        ...payload,
        contactMode: "IN_PERSON",
      };
      const establishment = new EstablishmentEntityBuilder()
        .withSiret(siret)
        .build();
      const contact = new ContactEntityBuilder()
        .withId(contactId)
        .withContactMethod("IN_PERSON")
        .build();
      await establishmentAggregateRepository.insertEstablishmentAggregates([
        new EstablishmentAggregateBuilder()
          .withEstablishment(establishment)
          .withContact(contact)
          .withImmersionOffers([immersionOffer])
          .build(),
      ]);

      await notifyContactRequest.execute(validInPersonPayload);

      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "CONTACT_IN_PERSON_INSTRUCTIONS",
            recipients: [payload.potentialBeneficiaryEmail],
            params: {
              businessName: establishment.name,
              contactFirstName: contact.firstName,
              contactLastName: contact.lastName,
              businessAddress: addressDtoToString(establishment.address),
              potentialBeneficiaryFirstName:
                payload.potentialBeneficiaryFirstName,
              potentialBeneficiaryLastName:
                payload.potentialBeneficiaryLastName,
            },
          },
        ],
      });
    });
  });

  describe("wrong paths", () => {
    it("Missing establishment", async () => {
      const validInPersonPayload: ContactEstablishmentEventPayload = {
        ...payload,
        contactMode: "IN_PERSON",
      };

      await expectPromiseToFailWithError(
        notifyContactRequest.execute(validInPersonPayload),
        new NotFoundError(`Missing establishment: siret=${payload.siret}`),
      );
    });

    it("Missing establishment contact details", async () => {
      const validInPersonPayload: ContactEstablishmentEventPayload = {
        ...payload,
        contactMode: "IN_PERSON",
      };

      const establishment = new EstablishmentEntityBuilder()
        .withSiret(siret)
        .build();

      await establishmentAggregateRepository.insertEstablishmentAggregates([
        new EstablishmentAggregateBuilder()
          .withEstablishment(establishment)
          .withContact(undefined)
          .withImmersionOffers([])
          .build(),
      ]);

      await expectPromiseToFailWithError(
        notifyContactRequest.execute(validInPersonPayload),
        new NotFoundError(`Missing contact details for siret=${payload.siret}`),
      );
    });

    it("Bad contact method", async () => {
      const validInPersonPayload: ContactEstablishmentEventPayload = {
        ...payload,
        contactMode: "IN_PERSON",
      };

      const establishment = new EstablishmentEntityBuilder()
        .withSiret(siret)
        .build();
      const contact = new ContactEntityBuilder()
        .withId(contactId)
        .withContactMethod("EMAIL")
        .build();

      await establishmentAggregateRepository.insertEstablishmentAggregates([
        new EstablishmentAggregateBuilder()
          .withEstablishment(establishment)
          .withContact(contact)
          .withImmersionOffers([])
          .build(),
      ]);

      await expectPromiseToFailWithError(
        notifyContactRequest.execute(validInPersonPayload),
        new BadRequestError(
          `Contact mode mismatch: establishment.contactMethod=${contact.contactMethod}, payload.contactMode=${validInPersonPayload.contactMode}`,
        ),
      );
    });

    it.each<ContactEstablishmentEventPayload>([
      {
        ...payload,
        contactMode: "IN_PERSON",
      },
      {
        ...payload,
        contactMode: "EMAIL",
        message: "message_to_send",
        immersionObjective: "Confirmer un projet professionnel",
        potentialBeneficiaryPhone: "0654783402",
      },
      {
        ...payload,
        contactMode: "PHONE",
      },
    ])("Bad immersion offer with contactMode $contactMode", async (payload) => {
      const establishment = new EstablishmentEntityBuilder()
        .withSiret(siret)
        .build();
      const contact = new ContactEntityBuilder()
        .withId(contactId)
        .withContactMethod(payload.contactMode)
        .build();
      await establishmentAggregateRepository.insertEstablishmentAggregates([
        new EstablishmentAggregateBuilder()
          .withEstablishment(establishment)
          .withContact(contact)
          .withImmersionOffers([])
          .build(),
      ]);

      await expectPromiseToFailWithError(
        notifyContactRequest.execute(payload),
        new BadRequestError(
          `Establishment with siret '${payload.siret}' doesn't have an immersion offer with appellation code '${payload.appellationCode}'.`,
        ),
      );
    });
  });
});
