import {
  EstablishmentRoutes,
  FormEstablishmentDtoBuilder,
  defaultValidFormEstablishment,
  displayRouteName,
  establishmentRoutes,
  expectHttpResponseToEqual,
  expectToEqual,
} from "shared";
import { HttpClient } from "shared-routes";
import { createSupertestSharedClient } from "shared-routes/supertest";
import { SuperTest, Test } from "supertest";
import {
  authorizedUnJeuneUneSolutionApiConsumer,
  outdatedApiConsumer,
  unauthorizedApiConsumer,
} from "../../../../domains/core/api-consumer/adapters/InMemoryApiConsumerRepository";
import { BasicEventCrawler } from "../../../../domains/core/events/adapters/EventCrawlerImplementations";
import { TEST_OPEN_ESTABLISHMENT_1 } from "../../../../domains/core/sirene/adapters/InMemorySiretGateway";
import { InMemoryUnitOfWork } from "../../../../domains/core/unit-of-work/adapters/createInMemoryUow";
import { EstablishmentLead } from "../../../../domains/establishment/entities/EstablishmentLeadEntity";
import { InMemoryGateways, buildTestApp } from "../../../../utils/buildTestApp";
import { processEventsForEmailToBeSent } from "../../../../utils/processEventsForEmailToBeSent";

describe("Add form establishment", () => {
  let request: SuperTest<Test>;
  let httpClient: HttpClient<EstablishmentRoutes>;
  let inMemoryUow: InMemoryUnitOfWork;

  let gateways: InMemoryGateways;
  let eventCrawler: BasicEventCrawler;

  beforeEach(async () => {
    ({ request, inMemoryUow, gateways, eventCrawler } = await buildTestApp());
    httpClient = createSupertestSharedClient(establishmentRoutes, request);
    inMemoryUow.apiConsumerRepository.consumers = [
      authorizedUnJeuneUneSolutionApiConsumer,
      unauthorizedApiConsumer,
      outdatedApiConsumer,
    ];
  });

  describe(`${displayRouteName(
    establishmentRoutes.addFormEstablishment,
  )} Route to post form establishments from front (hence, without API key)`, () => {
    beforeEach(() => {
      gateways.addressApi.setAddressAndPosition([
        {
          position: {
            lat: 48.8715,
            lon: 2.3019,
          },
          address: {
            city: "Paris",
            streetNumberAndAddress: "10 avenue des Champs Elysées",
            postcode: "75008",
            departmentCode: "75",
          },
        },
      ]);

      inMemoryUow.romeRepository.appellations =
        defaultValidFormEstablishment.appellations;
    });

    it(`${displayRouteName(
      establishmentRoutes.addFormEstablishment,
    )} 200 Check if email notification has been sent and published after FormEstablishment added`, async () => {
      const email = "tiredofthismess@seriously.com";

      const response = await httpClient.addFormEstablishment({
        body: FormEstablishmentDtoBuilder.valid()
          .withSiret(TEST_OPEN_ESTABLISHMENT_1.siret)
          .withBusinessContactEmail(email)
          .build(),
      });

      expectHttpResponseToEqual(response, {
        body: "",
        status: 200,
      });

      await processEventsForEmailToBeSent(eventCrawler);

      expectToEqual(
        gateways.notification.getSentEmails().map((e) => e.recipients),
        [[email]],
      );
    });

    it(`${displayRouteName(
      establishmentRoutes.addFormEstablishment,
    )} 200 update EstablishmentLead kind`, async () => {
      const email = "tiredofthismess@seriously.com";
      const formEstablishment = FormEstablishmentDtoBuilder.valid()
        .withSiret(TEST_OPEN_ESTABLISHMENT_1.siret)
        .withBusinessContactEmail(email)
        .build();
      const establishmentLead: EstablishmentLead = {
        lastEventKind: "to-be-reminded",
        siret: formEstablishment.siret,
        events: [
          {
            kind: "to-be-reminded",
            occurredAt: gateways.timeGateway.now(),
            conventionId: "11111111-1111-4111-1111-111111111111",
          },
        ],
      };

      inMemoryUow.establishmentLeadRepository.establishmentLeads = [
        establishmentLead,
      ];
      expect(
        (
          await inMemoryUow.establishmentLeadRepository.getBySiret(
            formEstablishment.siret,
          )
        )?.lastEventKind,
      ).toBe("to-be-reminded");

      const response = await httpClient.addFormEstablishment({
        body: formEstablishment,
      });

      expectHttpResponseToEqual(response, {
        body: "",
        status: 200,
      });

      await processEventsForEmailToBeSent(eventCrawler);

      expectToEqual(
        await inMemoryUow.establishmentLeadRepository.getBySiret(
          formEstablishment.siret,
        ),
        {
          lastEventKind: "registration-accepted",
          siret: formEstablishment.siret,
          events: [
            {
              kind: "to-be-reminded",
              occurredAt: gateways.timeGateway.now(),
              conventionId: "11111111-1111-4111-1111-111111111111",
            },
            {
              kind: "registration-accepted",
              occurredAt: gateways.timeGateway.now(),
            },
          ],
        },
      );
    });
  });
});
