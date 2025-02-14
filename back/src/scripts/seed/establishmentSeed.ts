import { DiscussionBuilder } from "shared";
import { UnitOfWork } from "../../domains/core/unit-of-work/ports/UnitOfWork";
import { UuidV4Generator } from "../../domains/core/uuid-generator/adapters/UuidGeneratorImplementations";
import {
  EstablishmentAggregateBuilder,
  EstablishmentEntityBuilder,
  OfferEntityBuilder,
} from "../../domains/establishment/helpers/EstablishmentBuilders";
import { seedUsers } from "./userSeed";

export const franceMerguez = new EstablishmentAggregateBuilder()
  .withEstablishment(
    new EstablishmentEntityBuilder()
      .withLocations([
        {
          id: new UuidV4Generator().new(),
          address: {
            city: "Villetaneuse",
            postcode: "93430",
            streetNumberAndAddress: "6 RUE RAYMOND BROSSE",
            departmentCode: "93",
          },
          position: { lat: 48.956, lon: 2.345 },
        },
        {
          id: new UuidV4Generator().new(),
          address: {
            city: "Paris",
            postcode: "75001",
            streetNumberAndAddress: "1 rue de Rivoli",
            departmentCode: "75",
          },
          position: { lat: 48.8566, lon: 2.3522 },
        },
      ])
      .withSiret("34493368400021")
      .withName("France Merguez Distribution")
      .withNafDto({ code: "1013A", nomenclature: "rev2" }) // NAF Section :Industrie manufacturière
      .build(),
  )
  .withOffers([
    new OfferEntityBuilder()
      .withAppellationCode("11569")
      .withAppellationLabel("Boucher-charcutier / Bouchère-charcutière")
      .withRomeCode("D1101")
      .build(),
  ])
  .withUserRights([
    {
      userId: seedUsers.franceMerguezUser.id,
      role: "establishment-admin",
      phone: "+33600110011",
      job: "Le Boss des merguez",
    },
    {
      userId: seedUsers.adminUser.id,
      role: "establishment-contact",
      job: "la compta",
      phone: "+33672787844",
    },
  ])
  .build();

export const decathlon = new EstablishmentAggregateBuilder()
  .withEstablishment(
    new EstablishmentEntityBuilder()
      .withSiret("50056940501696")
      .withName("Decathlon france")
      .withNafDto({ code: "4764Z", nomenclature: "rev2" }) // NAF Section : Commerce ; réparation d'automobiles et de motocycles
      .build(),
  )
  .withOffers([
    new OfferEntityBuilder()
      .withAppellationCode("20552")
      .withAppellationLabel("Vendeur / Vendeuse en articles de sport")
      .withRomeCode("D1211")
      .build(),
  ])
  .withUserRights([
    {
      userId: seedUsers.decathlonUser.id,
      role: "establishment-admin",
      phone: "+33600110011",
      job: "The Big Boss @Decathlon",
    },
  ])
  .build();

export const establishmentSeed = async (uow: UnitOfWork) => {
  // biome-ignore lint/suspicious/noConsoleLog: <explanation>
  console.log("establishmentSeed start ...");

  await uow.establishmentAggregateRepository.insertEstablishmentAggregate(
    franceMerguez,
  );
  await uow.establishmentAggregateRepository.insertEstablishmentAggregate(
    decathlon,
  );

  await uow.groupRepository.save({
    slug: "decathlon",
    sirets: [decathlon.establishment.siret],
    options: {
      heroHeader: {
        title: "Bienvenue chez Decathlon",
        description: "À fond la forme !",
      },
      tintColor: "#007DBC",
    },
    name: "Decathlon",
  });

  const discussionId = "aaaaaaaa-9c0a-1aaa-aa6d-aaaaaaaaaaaa";
  await uow.discussionRepository.insert(
    new DiscussionBuilder()
      .withId(discussionId)
      .withSiret(franceMerguez.establishment.siret)
      .withEstablishmentContact({
        email: "recette+playwright@immersion-facile.beta.gouv.fr",
      })
      .withPotentialBeneficiary({
        resumeLink: "https://www.docdroid.net/WyjIuyO/fake-resume-pdf",
      })
      .withExchanges([
        {
          sender: "potentialBeneficiary",
          recipient: "establishment",
          sentAt: new Date("2024-02-02").toISOString(),
          subject: "Présentation",
          message: "Bonjour, je me présente!",
          attachments: [],
        },
        {
          sender: "establishment",
          recipient: "potentialBeneficiary",
          sentAt: new Date("2024-02-03").toISOString(),
          subject: "Réponse entreprise",
          message: "Allez viens on est bien.",
          attachments: [],
        },
      ])
      .build(),
  );

  // biome-ignore lint/suspicious/noConsoleLog: <explanation>
  console.log("establishmentSeed done");
};
