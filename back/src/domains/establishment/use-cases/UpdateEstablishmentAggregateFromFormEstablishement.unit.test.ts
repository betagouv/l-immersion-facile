import {
  AppellationAndRomeDto,
  FormEstablishmentDtoBuilder,
  LocationId,
  SiretDto,
  UserBuilder,
  addressDtoToString,
  errors,
  expectObjectInArrayToMatch,
  expectPromiseToFailWithError,
  expectToEqual,
} from "shared";
import { v4 as uuid } from "uuid";
import {
  InMemoryAddressGateway,
  rueGuillaumeTellDto,
} from "../../core/address/adapters/InMemoryAddressGateway";
import { makeCreateNewEvent } from "../../core/events/ports/EventBus";
import { InMemorySiretGateway } from "../../core/sirene/adapters/InMemorySiretGateway";
import { CustomTimeGateway } from "../../core/time-gateway/adapters/CustomTimeGateway";
import { InMemoryUowPerformer } from "../../core/unit-of-work/adapters/InMemoryUowPerformer";
import {
  InMemoryUnitOfWork,
  createInMemoryUow,
} from "../../core/unit-of-work/adapters/createInMemoryUow";
import { TestUuidGenerator } from "../../core/uuid-generator/adapters/UuidGeneratorImplementations";
import {
  EstablishmentAggregateBuilder,
  EstablishmentEntityBuilder,
  OfferEntityBuilder,
} from "../helpers/EstablishmentBuilders";
import { UpdateEstablishmentAggregateFromForm } from "./UpdateEstablishmentAggregateFromFormEstablishement";

describe("Update Establishment aggregate from form data", () => {
  let siretGateway: InMemorySiretGateway;
  let addressGateway: InMemoryAddressGateway;
  let uuidGenerator: TestUuidGenerator;
  let timeGateway: CustomTimeGateway;
  let uow: InMemoryUnitOfWork;
  let updateEstablishmentAggregateFromFormUseCase: UpdateEstablishmentAggregateFromForm;
  const now = new Date();

  beforeEach(() => {
    siretGateway = new InMemorySiretGateway();
    addressGateway = new InMemoryAddressGateway();
    uow = createInMemoryUow();
    uuidGenerator = new TestUuidGenerator();
    timeGateway = new CustomTimeGateway(now);
    updateEstablishmentAggregateFromFormUseCase =
      new UpdateEstablishmentAggregateFromForm(
        new InMemoryUowPerformer(uow),
        addressGateway,
        uuidGenerator,
        timeGateway,
        makeCreateNewEvent({ timeGateway, uuidGenerator }),
      );
  });

  it("Fails if establishment does not exists amongst establishments from form", async () => {
    const establishment = FormEstablishmentDtoBuilder.valid().build();
    await expectPromiseToFailWithError(
      updateEstablishmentAggregateFromFormUseCase.execute(
        {
          formEstablishment: FormEstablishmentDtoBuilder.valid().build(),
        },
        {
          userId: "",
        },
      ),
      errors.establishment.notFound({
        siret: establishment.siret,
      }),
    );
  });

  describe("Replaces establishment and offers with same siret, and apply users rights", () => {
    const siret: SiretDto = "12345678911234";
    const locationId: LocationId = "364efc5a-db4f-452c-8d20-95c6a23f21fe";
    const previousEstablishmentAdmin = new UserBuilder()
      .withEmail("previous.admin@mail.com")
      .build();
    const previousAggregate = new EstablishmentAggregateBuilder()
      .withEstablishment(
        new EstablishmentEntityBuilder()
          .withSiret(siret)
          .withMaxContactsPerMonth(6)
          .withScore(25)
          .build(),
      )
      .withOffers([
        new OfferEntityBuilder().build(),
        new OfferEntityBuilder().build(),
      ])
      .withSearchableBy({
        jobSeekers: false,
        students: true,
      })
      .withUserRights([
        {
          userId: previousEstablishmentAdmin.id,
          role: "establishment-admin",
          job: "job",
          phone: "+336558464365",
        },
      ])
      .build();

    beforeEach(() => {
      uow.establishmentAggregateRepository.establishmentAggregates = [
        previousAggregate,
      ];

      siretGateway.setSirenEstablishment({
        siret,
        businessAddress: "1 rue Guillaume Tell, 75017 Paris",
        businessName: "My establishment",
        nafDto: { code: "1234Z", nomenclature: "Ref2" },
        isOpen: true,
        numberEmployeesRange: "10-19",
      });

      addressGateway.setAddressAndPosition([
        {
          address: rueGuillaumeTellDto,
          position: { lon: 1, lat: 2 },
        },
      ]);
    });

    const updatedAdmin = new UserBuilder()
      .withId(uuid())
      .withEmail("new.admin@gmail.com")
      .withCreatedAt(now)
      .build();
    const updatedContact = new UserBuilder()
      .withId(uuid())
      .withEmail("new.contact@gmail.com")
      .withCreatedAt(now)
      .build();

    const updatedAppellation: AppellationAndRomeDto = {
      romeLabel: "Boulangerie",
      appellationLabel: "Boulanger",
      romeCode: "A1101",
      appellationCode: "22222",
    };
    const nextAvailabilityDate = new Date();
    const updatedFormEstablishment = FormEstablishmentDtoBuilder.valid()
      .withSiret(siret)
      .withAppellations([updatedAppellation])
      .withBusinessAddresses([
        {
          id: locationId,
          rawAddress: addressDtoToString(rueGuillaumeTellDto),
        },
      ])
      .withBusinessContactEmail(updatedAdmin.email)
      .withBusinessContactCopyEmails([updatedContact.email])
      .withNextAvailabilityDate(nextAvailabilityDate)
      .withMaxContactsPerMonth(10)
      .withSearchableBy({
        jobSeekers: true,
        students: false,
      })
      .build();

    it("When users already existed", async () => {
      uow.userRepository.users = [updatedAdmin, updatedContact];

      await updateEstablishmentAggregateFromFormUseCase.execute({
        formEstablishment: updatedFormEstablishment,
      });

      expectToEqual(uow.userRepository.users, [updatedAdmin, updatedContact]);

      expectToEqual(
        uow.establishmentAggregateRepository.establishmentAggregates,
        [
          new EstablishmentAggregateBuilder(previousAggregate)
            .withEstablishment(
              new EstablishmentEntityBuilder(previousAggregate.establishment)

                .withCreatedAt(timeGateway.now())
                .withCustomizedName(
                  updatedFormEstablishment.businessNameCustomized,
                )
                .withFitForDisabledWorkers(
                  updatedFormEstablishment.fitForDisabledWorkers,
                )
                .withIsCommited(updatedFormEstablishment.isEngagedEnterprise)
                .withIsOpen(true)
                .withName(updatedFormEstablishment.businessName)
                .withMaxContactsPerMonth(
                  updatedFormEstablishment.maxContactsPerMonth,
                )
                .withLocations([
                  {
                    address: rueGuillaumeTellDto,
                    position: { lon: 1, lat: 2 },
                    id: locationId,
                  },
                ])
                .withUpdatedAt(timeGateway.now())
                .withWebsite(updatedFormEstablishment.website)
                .withNextAvailabilityDate(nextAvailabilityDate)
                .withSearchableBy(updatedFormEstablishment.searchableBy)
                .build(),
            )
            .withOffers([
              new OfferEntityBuilder()
                .withRomeLabel(updatedAppellation.romeLabel)
                .withRomeCode(updatedAppellation.romeCode)
                .withAppellationCode(updatedAppellation.appellationCode)
                .withAppellationLabel(updatedAppellation.appellationLabel)
                .withCreatedAt(timeGateway.now())
                .build(),
            ])
            .withUserRights([
              {
                role: "establishment-admin",
                job: updatedFormEstablishment.businessContact.job,
                phone: updatedFormEstablishment.businessContact.phone,
                userId: updatedAdmin.id,
              },
              {
                role: "establishment-contact",
                userId: updatedContact.id,
              },
            ])
            .build(),
        ],
      );

      expectObjectInArrayToMatch(uow.outboxRepository.events, [
        {
          topic: "UpdatedEstablishmentAggregateInsertedFromForm",
          payload: { siret, triggeredBy: null },
        },
      ]);
    });

    it("When users not exist, create user additionnaly", async () => {
      uuidGenerator.setNextUuids([updatedAdmin.id, updatedContact.id]);
      uow.userRepository.users = [];

      await updateEstablishmentAggregateFromFormUseCase.execute({
        formEstablishment: updatedFormEstablishment,
      });

      expectToEqual(uow.userRepository.users, [
        new UserBuilder(updatedAdmin)
          .withFirstName(updatedFormEstablishment.businessContact.firstName)
          .withLastName(updatedFormEstablishment.businessContact.lastName)
          .build(),
        new UserBuilder(updatedContact)
          .withFirstName("")
          .withLastName("")
          .build(),
      ]);

      expectToEqual(
        uow.establishmentAggregateRepository.establishmentAggregates,
        [
          new EstablishmentAggregateBuilder(previousAggregate)
            .withEstablishment(
              new EstablishmentEntityBuilder(previousAggregate.establishment)
                .withCreatedAt(timeGateway.now())
                .withCustomizedName(
                  updatedFormEstablishment.businessNameCustomized,
                )
                .withFitForDisabledWorkers(
                  updatedFormEstablishment.fitForDisabledWorkers,
                )
                .withIsCommited(updatedFormEstablishment.isEngagedEnterprise)
                .withIsOpen(true)
                .withName(updatedFormEstablishment.businessName)
                .withMaxContactsPerMonth(
                  updatedFormEstablishment.maxContactsPerMonth,
                )
                .withLocations([
                  {
                    address: rueGuillaumeTellDto,
                    position: { lon: 1, lat: 2 },
                    id: locationId,
                  },
                ])
                .withUpdatedAt(timeGateway.now())
                .withWebsite(updatedFormEstablishment.website)
                .withNextAvailabilityDate(nextAvailabilityDate)
                .withSearchableBy(updatedFormEstablishment.searchableBy)
                .build(),
            )
            .withOffers([
              new OfferEntityBuilder()
                .withRomeLabel(updatedAppellation.romeLabel)
                .withRomeCode(updatedAppellation.romeCode)
                .withAppellationCode(updatedAppellation.appellationCode)
                .withAppellationLabel(updatedAppellation.appellationLabel)
                .withCreatedAt(timeGateway.now())
                .build(),
            ])
            .withUserRights([
              {
                role: "establishment-admin",
                job: updatedFormEstablishment.businessContact.job,
                phone: updatedFormEstablishment.businessContact.phone,
                userId: updatedAdmin.id,
              },
              {
                role: "establishment-contact",
                userId: updatedContact.id,
              },
            ])
            .build(),
        ],
      );

      expectObjectInArrayToMatch(uow.outboxRepository.events, [
        {
          topic: "UpdatedEstablishmentAggregateInsertedFromForm",
          payload: { siret, triggeredBy: null },
        },
      ]);
    });
  });
});
