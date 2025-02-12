import {
  GroupOptions,
  InclusionConnectedUserBuilder,
  UserBuilder,
  addressDtoToString,
  errors,
  expectPromiseToFailWithError,
  expectToEqual,
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
import { TestUuidGenerator } from "../../core/uuid-generator/adapters/UuidGeneratorImplementations";
import { EstablishmentAggregateBuilder } from "../helpers/EstablishmentBuilders";
import { DeleteEstablishment } from "./DeleteEstablishment";

describe("Delete Establishment", () => {
  const backofficeAdminBuilder =
    new InclusionConnectedUserBuilder().withIsAdmin(true);
  const icBackofficeAdminUser = backofficeAdminBuilder.build();
  const backofficeAdminUser = backofficeAdminBuilder.buildUser();

  const groupOptions: GroupOptions = {
    heroHeader: {
      title: "My hero header title",
      description: "My hero header description",
      logoUrl: "https://my-logo-url.com",
      backgroundColor: "blue",
    },
    tintColor: "red",
  };

  const establishmentAdmin = new UserBuilder()
    .withId("boss")
    .withEmail("boss@mail.com")
    .build();
  const establishmentContact1 = new UserBuilder()
    .withId("billy1")
    .withEmail("billy1@mail.com")
    .build();
  const establishmentContact2 = new UserBuilder()
    .withId("billy2")
    .withEmail("billy2@mail.com")
    .build();

  const establishmentAggregate = new EstablishmentAggregateBuilder()
    .withUserRights([
      {
        role: "establishment-admin",
        job: "boss",
        phone: "+33655447788",
        userId: establishmentAdmin.id,
      },
      {
        role: "establishment-contact",
        userId: establishmentContact1.id,
      },
      {
        role: "establishment-contact",
        userId: establishmentContact2.id,
      },
    ])
    .build();

  let deleteEstablishment: DeleteEstablishment;
  let uow: InMemoryUnitOfWork;
  let timeGateway: TimeGateway;
  let expectSavedNotificationsAndEvents: ExpectSavedNotificationsAndEvents;

  beforeEach(() => {
    uow = createInMemoryUow();
    timeGateway = new CustomTimeGateway();
    deleteEstablishment = new DeleteEstablishment(
      new InMemoryUowPerformer(uow),
      timeGateway,
      makeSaveNotificationAndRelatedEvent(new TestUuidGenerator(), timeGateway),
    );
    uow.userRepository.users = [
      backofficeAdminUser,
      establishmentAdmin,
      establishmentContact1,
      establishmentContact2,
    ];
    expectSavedNotificationsAndEvents = makeExpectSavedNotificationsAndEvents(
      uow.notificationRepository,
      uow.outboxRepository,
    );
  });

  describe("Wrong paths", () => {
    it("Throws forbidden error on missing backoffice jwt", async () => {
      await expectPromiseToFailWithError(
        deleteEstablishment.execute({
          siret: establishmentAggregate.establishment.siret,
        }),
        errors.user.unauthorized(),
      );
    });

    it("Throws not found error on missing establishment aggregate", async () => {
      await expectPromiseToFailWithError(
        deleteEstablishment.execute(
          {
            siret: establishmentAggregate.establishment.siret,
          },
          icBackofficeAdminUser,
        ),
        errors.establishment.notFound({
          siret: establishmentAggregate.establishment.siret,
        }),
      );
    });

    it("Throws not found error on missing form establishment", async () => {
      uow.establishmentAggregateRepository.establishmentAggregates = [
        establishmentAggregate,
      ];
      await expectPromiseToFailWithError(
        deleteEstablishment.execute(
          {
            siret: establishmentAggregate.establishment.siret,
          },
          icBackofficeAdminUser,
        ),
        errors.establishment.notFound({
          siret: establishmentAggregate.establishment.siret,
        }),
      );
    });
  });

  describe("Right paths", () => {
    it("Establishment aggregate and form establishment are deleted, establishment group with siret have siret removed", async () => {
      uow.establishmentAggregateRepository.establishmentAggregates = [
        establishmentAggregate,
      ];

      uow.groupRepository.groupEntities = [
        {
          name: "group",
          sirets: [establishmentAggregate.establishment.siret, "siret2"],
          slug: "group",
          options: groupOptions,
        },
      ];

      await deleteEstablishment.execute(
        {
          siret: establishmentAggregate.establishment.siret,
        },
        icBackofficeAdminUser,
      );

      expectToEqual(
        uow.establishmentAggregateRepository.establishmentAggregates,
        [],
      );

      expectToEqual(uow.groupRepository.groupEntities, [
        {
          name: "group",
          sirets: ["siret2"],
          slug: "group",
          options: groupOptions,
        },
      ]);
      expectToEqual(uow.deletedEstablishmentRepository.deletedEstablishments, [
        {
          siret: establishmentAggregate.establishment.siret,
          createdAt: establishmentAggregate.establishment.createdAt,
          deletedAt: timeGateway.now(),
        },
      ]);
      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "ESTABLISHMENT_DELETED",
            recipients: [establishmentAdmin.email],
            params: {
              businessName: establishmentAggregate.establishment.name,
              siret: establishmentAggregate.establishment.siret,
              businessAddresses:
                establishmentAggregate.establishment.locations.map(
                  (addressAndPosition) =>
                    addressDtoToString(addressAndPosition.address),
                ),
            },
            cc: [establishmentContact1.email, establishmentContact2.email],
          },
        ],
      });
    });
  });
});
