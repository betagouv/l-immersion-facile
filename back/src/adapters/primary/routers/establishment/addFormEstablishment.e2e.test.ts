import { SuperTest, Test } from "supertest";
import {
  defaultValidFormEstablishment,
  establishmentTargets,
  expectToEqual,
  FormEstablishmentDtoBuilder,
} from "shared";
import { avenueChampsElysees } from "../../../../_testBuilders/addressDtos";
import {
  buildTestApp,
  InMemoryGateways,
} from "../../../../_testBuilders/buildTestApp";
import { validApiConsumerJwtPayload } from "../../../../_testBuilders/jwtTestHelper";
import { processEventsForEmailToBeSent } from "../../../../_testBuilders/processEventsForEmailToBeSent";
import { GenerateApiConsumerJwt } from "../../../../domain/auth/jwt";
import { BasicEventCrawler } from "../../../secondary/core/EventCrawlerImplementations";
import { TEST_OPEN_ESTABLISHMENT_1 } from "../../../secondary/siret/InMemorySiretGateway";
import { InMemoryUnitOfWork } from "../../config/uowConfig";
import { FormEstablishmentDtoPublicV0 } from "../DtoAndSchemas/v0/input/FormEstablishmentPublicV0.dto";
import { FormEstablishmentDtoPublicV1 } from "../DtoAndSchemas/v1/input/FormEstablishmentPublicV1.dto";

describe("Add form establishment", () => {
  let request: SuperTest<Test>;
  let inMemoryUow: InMemoryUnitOfWork;
  let generateApiConsumerJwt: GenerateApiConsumerJwt;
  let gateways: InMemoryGateways;
  let eventCrawler: BasicEventCrawler;

  beforeEach(async () => {
    ({ request, inMemoryUow, generateApiConsumerJwt, gateways, eventCrawler } =
      await buildTestApp());
  });

  describe("Route to post form establishments from front (hence, without API key)", () => {
    // from front
    it("support posting valid establishment from front", async () => {
      inMemoryUow.romeRepository.appellations =
        defaultValidFormEstablishment.appellations;

      const formEstablishment = FormEstablishmentDtoBuilder.valid()
        .withSiret(TEST_OPEN_ESTABLISHMENT_1.siret)
        .build();

      const response = await request
        .post(establishmentTargets.addFormEstablishment.url)
        .send(formEstablishment);

      expectToEqual(response.status, 200);
      expectToEqual(response.body, "");
      expectToEqual(await inMemoryUow.formEstablishmentRepository.getAll(), [
        formEstablishment,
      ]);
    });

    it("Check if email notification has been sent and published after FormEstablishment added", async () => {
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

      const email = "tiredofthismess@seriously.com";

      const response = await request
        .post(establishmentTargets.addFormEstablishment.url)
        .send(
          FormEstablishmentDtoBuilder.valid()
            .withSiret(TEST_OPEN_ESTABLISHMENT_1.siret)
            .withBusinessContactEmail(email)
            .build(),
        );

      expect(response.status).toBe(200);

      await processEventsForEmailToBeSent(eventCrawler);

      expectToEqual(
        gateways.notification.getSentEmails().map((e) => e.recipients),
        [[email]],
      );
    });
  });

  describe("Route to add an establishment form with API key (for exemple for un-jeune-une-solution)", () => {
    // from external
    describe("v0", () => {
      // we don't want to use variables from src/routes.ts so that we can check if contract breaks
      it("forbids access to route if no api consumer", async () => {
        const response = await request.post(`/immersion-offers`).send({});

        expect(response.status).toBe(403);
      });

      it("support adding establishment from known api consumer", async () => {
        const response = await request
          .post(`/immersion-offers`)
          .set(
            "Authorization",
            generateApiConsumerJwt(validApiConsumerJwtPayload),
          )
          .send({
            businessAddress: "1 Rue du Moulin 12345 Quelque Part",
            businessContacts: [
              {
                email: "amil@mail.com",
                firstName: "Esteban",
                lastName: "Ocon",
                phone: "+33012345678",
                job: "a job",
              },
            ],
            preferredContactMethods: ["EMAIL"],
            naf: { code: "A", nomenclature: "nomenclature code A" },
            businessName: "Mon entreprise",
            businessNameCustomized: "Ma belle enseigne du quartier",
            isEngagedEnterprise: false,
            siret: TEST_OPEN_ESTABLISHMENT_1.siret,
            professions: [
              {
                romeCodeMetier: "A1111",
                romeCodeAppellation: "11111",
                description: "Boulangerie",
              },
              {
                romeCodeMetier: "B9112",
                romeCodeAppellation: "22222",
                description: "Patissier",
              },
              {
                romeCodeMetier: "D1103",
                romeCodeAppellation: undefined,
                description: "Boucherie",
              },
            ],
          } satisfies FormEstablishmentDtoPublicV0);

        expect(response.body).toBe("");
        expect(response.status).toBe(200);
      });
    });

    describe("v1", () => {
      const consumerv1FormEstablishmentsRoute = `/v1/form-establishments`;

      it("forbids access to route if no api consumer", async () => {
        const response = await request
          .post(consumerv1FormEstablishmentsRoute)
          .send({});
        expect(response.body).toEqual({ error: "forbidden: unauthenticated" });
        expect(response.status).toBe(401);
      });

      it("forbids access to route if invalid jwt", async () => {
        const response = await request
          .post(consumerv1FormEstablishmentsRoute)
          .set("Authorization", "jwt-invalid")
          .send({});

        expect(response.body).toEqual({ error: "forbidden: incorrect Jwt" });
        expect(response.status).toBe(401);
      });

      it("forbids adding establishment from unauthorized api consumer", async () => {
        const response = await request
          .post(consumerv1FormEstablishmentsRoute)
          .set("Authorization", generateApiConsumerJwt({ id: "my-unknown-id" }))
          .send({});

        expect(response.body).toEqual({
          error: "forbidden: consumer not found",
        });
        expect(response.status).toBe(403);
      });

      it("forbids access to route if id is unauthorized", async () => {
        const response = await request
          .post(consumerv1FormEstablishmentsRoute)
          .set(
            "Authorization",
            generateApiConsumerJwt({ id: "my-unauthorized-id" }),
          )
          .send({});

        expect(response.body).toEqual({
          error: "forbidden: unauthorised consumer Id",
        });
        expect(response.status).toBe(403);
      });

      it("forbids access to route if token has expired", async () => {
        gateways.timeGateway.setNextDate(new Date());

        const response = await request
          .post(consumerv1FormEstablishmentsRoute)
          .set(
            "Authorization",
            generateApiConsumerJwt({ id: "my-outdated-id" }),
          )
          .send({});

        expectToEqual(response.body, {
          error: "forbidden: expired token",
        });
        expect(response.status).toBe(403);
      });

      it("support adding establishment from known api consumer (for exemple Un Jeune Une Solution)", async () => {
        const response = await request
          .post(consumerv1FormEstablishmentsRoute)
          .set(
            "Authorization",
            generateApiConsumerJwt(validApiConsumerJwtPayload),
          )
          .send({
            ...FormEstablishmentDtoBuilder.valid()
              .withSiret(TEST_OPEN_ESTABLISHMENT_1.siret)
              .build(),
            isSearchable: true,
            businessAddress: avenueChampsElysees,
          } satisfies FormEstablishmentDtoPublicV1);

        expect(response.status).toBe(200);
      });
    });
  });
});
