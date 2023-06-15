import { addHours, addSeconds } from "date-fns";
import {
  EstablishmentJwtPayload,
  expectPromiseToFailWithError,
  TemplatedEmail,
} from "shared";
import { ContactEntityBuilder } from "../../../_testBuilders/ContactEntityBuilder";
import { EstablishmentAggregateBuilder } from "../../../_testBuilders/EstablishmentAggregateBuilder";
import { makeExpectSavedNotificationsAndEvents } from "../../../_testBuilders/makeExpectSavedNotificationsAndEvents";
import { createInMemoryUow } from "../../../adapters/primary/config/uowConfig";
import { BadRequestError } from "../../../adapters/primary/helpers/httpErrors";
import { CustomTimeGateway } from "../../../adapters/secondary/core/TimeGateway/CustomTimeGateway";
import { UuidV4Generator } from "../../../adapters/secondary/core/UuidGeneratorImplementations";
import { InMemoryUowPerformer } from "../../../adapters/secondary/InMemoryUowPerformer";
import { makeCreateNewEvent } from "../../core/eventBus/EventBus";
import { makeSaveNotificationAndRelatedEvent } from "../../generic/notifications/entities/Notification";
import { EstablishmentAggregateRepository } from "../ports/EstablishmentAggregateRepository";
import { RequestEditFormEstablishment } from "./RequestEditFormEstablishment";

const siret = "12345678912345";
const contactEmail = "jerome@gmail.com";
const copyEmails = ["copy@gmail.com"];

const setMethodGetContactEmailFromSiret = (
  establishmentAggregateRepo: EstablishmentAggregateRepository,
) => {
  establishmentAggregateRepo.getEstablishmentAggregateBySiret =
    //eslint-disable-next-line @typescript-eslint/require-await
    async (_siret: string) =>
      new EstablishmentAggregateBuilder()
        .withContact(
          new ContactEntityBuilder()
            .withEmail(contactEmail)
            .withCopyEmails(copyEmails)
            .build(),
        )
        .build();
};

const prepareUseCase = () => {
  const uow = createInMemoryUow();
  const establishmentAggregateRepository = uow.establishmentAggregateRepository;

  const expectSavedNotificationsAndEvents =
    makeExpectSavedNotificationsAndEvents(
      uow.notificationRepository,
      uow.outboxRepository,
    );

  setMethodGetContactEmailFromSiret(establishmentAggregateRepository); // In most of the tests, we need the contact to be defined

  const timeGateway = new CustomTimeGateway();
  const uuidGenerator = new UuidV4Generator();
  const createNewEvent = makeCreateNewEvent({ uuidGenerator, timeGateway });
  const saveNotificationAndRelatedEvent = makeSaveNotificationAndRelatedEvent(
    uuidGenerator,
    timeGateway,
    createNewEvent,
  );

  const generateEditFormEstablishmentUrl = (payload: EstablishmentJwtPayload) =>
    `www.immersion-facile.fr/edit?jwt=jwtOfSiret[${payload.siret}]`;

  const useCase = new RequestEditFormEstablishment(
    new InMemoryUowPerformer(uow),
    saveNotificationAndRelatedEvent,
    timeGateway,
    generateEditFormEstablishmentUrl,
  );

  return {
    useCase,
    establishmentAggregateRepository,
    notificationRepository: uow.notificationRepository,
    outboxRepository: uow.outboxRepository,
    timeGateway,
    expectSavedNotificationsAndEvents,
  };
};

describe("RequestUpdateFormEstablishment", () => {
  it("Throws an error if contact email is unknown", async () => {
    // Prepare
    const { useCase, establishmentAggregateRepository } = prepareUseCase();

    establishmentAggregateRepository.getEstablishmentAggregateBySiret =
      //eslint-disable-next-line @typescript-eslint/require-await
      async (_siret: string) =>
        new EstablishmentAggregateBuilder().withoutContact().build();

    // Act and assert
    await expectPromiseToFailWithError(
      useCase.execute(siret),
      Error("Email du contact introuvable."),
    );
  });

  describe("If no email has been sent yet.", () => {
    it("Sends an email to the contact of the establishment with eventually email in CC", async () => {
      // Prepare
      const { useCase, expectSavedNotificationsAndEvents } = prepareUseCase();

      // Act
      await useCase.execute(siret);

      // Assert
      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "EDIT_FORM_ESTABLISHMENT_LINK",
            recipients: [contactEmail],
            cc: copyEmails,
            params: {
              editFrontUrl: `www.immersion-facile.fr/edit?jwt=jwtOfSiret[${siret}]`,
            },
          },
        ],
      });
    });
  });

  describe("If an email has already been sent for this establishment.", () => {
    it("Throws an error if an email has already been sent to this contact less than 24h ago", async () => {
      // Prepare
      const { useCase, notificationRepository, timeGateway } = prepareUseCase();

      const initialMailDate = new Date("2021-01-01T13:00:00.000");

      notificationRepository.notifications = [
        {
          kind: "email",
          id: "111111111111-1111-4000-1111-111111111111",
          createdAt: initialMailDate.toISOString(),
          followedIds: {},
          templatedContent: {
            type: "EDIT_FORM_ESTABLISHMENT_LINK",
            recipients: [contactEmail],
            params: { editFrontUrl: "my-edit-link.com" },
          },
        },
      ];

      const newModificationAskedDateLessThan24hAfterInitial = addHours(
        initialMailDate,
        23,
      );

      timeGateway.setNextDate(newModificationAskedDateLessThan24hAfterInitial);

      // Act and assert
      await expectPromiseToFailWithError(
        useCase.execute(siret),
        new BadRequestError(
          "Un email a déjà été envoyé au contact référent de l'établissement le 01/01/2021",
        ),
      );
    });
  });

  it("Sends a new email if the edit link in last email has expired", async () => {
    // Prepare
    const {
      useCase,
      outboxRepository,
      notificationRepository,
      timeGateway,
      expectSavedNotificationsAndEvents,
    } = prepareUseCase();

    const initialMailDate = new Date("2021-01-01T13:00:00.000");

    const alreadySentEmail: TemplatedEmail = {
      type: "EDIT_FORM_ESTABLISHMENT_LINK",
      recipients: [contactEmail],
      params: { editFrontUrl: "my-edit-link.com" },
    };

    const alreadySentNotification = {
      kind: "email",
      id: "111111111111-1111-4000-1111-111111111111",
      createdAt: initialMailDate.toISOString(),
      followedIds: {},
      templatedContent: alreadySentEmail,
    };

    notificationRepository.notifications = [
      {
        kind: "email",
        id: "111111111111-1111-4000-1111-111111111111",
        createdAt: initialMailDate.toISOString(),
        followedIds: {},
        templatedContent: alreadySentEmail,
      },
    ];
    await outboxRepository.save({
      id: "123",
      topic: "NotificationAdded",
      occurredAt: initialMailDate.toISOString(),
      publications: [
        {
          publishedAt: addSeconds(initialMailDate, 1).toISOString(),
          failures: [],
        },
      ],
      payload: { id: alreadySentNotification.id, kind: "email" },
      wasQuarantined: false,
    });

    const newModificationAskedDateMoreThan24hAfterInitial = addHours(
      initialMailDate,
      25,
    );

    timeGateway.setNextDate(newModificationAskedDateMoreThan24hAfterInitial);

    // Act
    await useCase.execute(siret);

    // Assert
    expectSavedNotificationsAndEvents({
      emails: [
        alreadySentEmail,
        {
          kind: "EDIT_FORM_ESTABLISHMENT_LINK",
          recipients: ["jerome@gmail.com"],
          cc: ["copy@gmail.com"],
          params: {
            editFrontUrl:
              "www.immersion-facile.fr/edit?jwt=jwtOfSiret[12345678912345]",
          },
        },
      ],
    });
  });
});
