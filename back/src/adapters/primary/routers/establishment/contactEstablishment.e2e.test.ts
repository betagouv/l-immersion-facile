import {
  ContactEstablishmentRequestDto,
  SearchRoutes,
  expectArraysToMatch,
  expectHttpResponseToEqual,
  expectToEqual,
  searchImmersionRoutes,
} from "shared";
import { HttpClient } from "shared-routes";
import { createSupertestSharedClient } from "shared-routes/supertest";
import { BasicEventCrawler } from "../../../../domain/core/events/adapters/EventCrawlerImplementations";
import { InMemoryGateways, buildTestApp } from "../../../../utils/buildTestApp";
import { processEventsForEmailToBeSent } from "../../../../utils/processEventsForEmailToBeSent";
import {
  ContactEntityBuilder,
  EstablishmentAggregateBuilder,
  EstablishmentEntityBuilder,
  OfferEntityBuilder,
} from "../../../secondary/offer/EstablishmentBuilders";
import { InMemoryUnitOfWork } from "../../config/uowConfig";

const siret = "11112222333344";
const contactId = "theContactId";

const establishment = new EstablishmentEntityBuilder().withSiret(siret).build();

const validRequest: ContactEstablishmentRequestDto = {
  appellationCode: "19540",
  siret,
  contactMode: "EMAIL",
  potentialBeneficiaryFirstName: "potential_beneficiary_first_name",
  potentialBeneficiaryLastName: "potential_beneficiary_last_name",
  potentialBeneficiaryEmail: "potential_beneficiary@email.fr",
  message: "message_to_send",
  immersionObjective: "Confirmer un projet professionnel",
  potentialBeneficiaryPhone: "0654783402",
  locationId: establishment.locations[0].id,
};

describe(`${searchImmersionRoutes.contactEstablishment.method} ${searchImmersionRoutes.contactEstablishment.url} route`, () => {
  let gateways: InMemoryGateways;
  let eventCrawler: BasicEventCrawler;
  let inMemoryUow: InMemoryUnitOfWork;
  let sharedRequest: HttpClient<SearchRoutes>;

  beforeEach(async () => {
    const testAppAndDeps = await buildTestApp();
    ({ gateways, eventCrawler, inMemoryUow } = testAppAndDeps);
    sharedRequest = createSupertestSharedClient(
      searchImmersionRoutes,
      testAppAndDeps.request,
    );
  });

  it("sends email for valid request and save the discussion", async () => {
    const contact = new ContactEntityBuilder()
      .withId(contactId)
      .withContactMethod("EMAIL")
      .build();
    const immersionOffer = new OfferEntityBuilder().build();

    inMemoryUow.romeRepository.appellations = [
      {
        appellationCode: immersionOffer.appellationCode,
        appellationLabel: immersionOffer.appellationLabel,
        romeCode: immersionOffer.romeCode,
        romeLabel: "some label",
      },
    ];

    await inMemoryUow.establishmentAggregateRepository.insertEstablishmentAggregate(
      new EstablishmentAggregateBuilder()
        .withEstablishment(establishment)
        .withContact(contact)
        .withOffers([immersionOffer])
        .build(),
    );

    const result = await sharedRequest.contactEstablishment({
      body: validRequest,
    });

    expectHttpResponseToEqual(result, {
      status: 201,
      body: "",
    });

    const discussions =
      inMemoryUow.discussionAggregateRepository.discussionAggregates;

    expect(discussions).toHaveLength(1);
    const discussionId = discussions[0].id;

    expectArraysToMatch(inMemoryUow.outboxRepository.events, [
      {
        topic: "ContactRequestedByBeneficiary",
        payload: { ...validRequest, discussionId },
      },
    ]);

    await processEventsForEmailToBeSent(eventCrawler);
    expect(gateways.notification.getSentEmails()).toHaveLength(1);
    expect(gateways.notification.getSentEmails()[0].kind).toBe(
      "CONTACT_BY_EMAIL_REQUEST",
    );

    expect(
      inMemoryUow.discussionAggregateRepository.discussionAggregates,
    ).toHaveLength(1);
  });

  it("fails with 404 for unknown siret", async () => {
    const response = await sharedRequest.contactEstablishment({
      body: {
        ...validRequest,
        siret: "40400040000404",
      },
    });

    expectToEqual(response.status, 404);
    expectToEqual(
      JSON.stringify(response.body),
      '{"errors":"No establishment found with siret: 40400040000404"}',
    );
    // TODO exeptToEqual when errors are handled correctly
    // expectToEqual(response.body, {
    //   errors: "No establishment found with siret: 40400040000404",
    // });
  });

  it("fails with 400 for invalid requests", async () => {
    const response = await sharedRequest.contactEstablishment({
      body: {
        ...validRequest,
        siret: undefined,
        appellationCode: undefined,
      } as any,
    });
    expectToEqual(response.body, {
      status: 400,
      message:
        "Shared-route schema 'requestBodySchema' was not respected in adapter 'express'.\nRoute: POST /contact-establishment",
      issues: [
        "appellationCode : Required",
        "siret : Obligatoire",
        'contactMode : Invalid literal value, expected "PHONE"',
        'contactMode : Invalid literal value, expected "IN_PERSON"',
      ],
    });
  });
});
