import { SuperTest, Test } from "supertest";
import { expectToEqual } from "shared";
import {
  avenueChampsElysees,
  avenueChampsElyseesDto,
} from "../../../../_testBuilders/addressDtos";
import { buildTestApp } from "../../../../_testBuilders/buildTestApp";
import { EstablishmentAggregateBuilder } from "../../../../_testBuilders/establishmentAggregate.test.helpers";
import {
  defaultNafCode,
  EstablishmentEntityBuilder,
} from "../../../../_testBuilders/EstablishmentEntityBuilder";
import { ImmersionOfferEntityV2Builder } from "../../../../_testBuilders/ImmersionOfferEntityV2Builder";
import { validApiConsumerJwtPayload } from "../../../../_testBuilders/jwtTestHelper";
import { GenerateApiConsumerJwt } from "../../../../domain/auth/jwt";
import { InMemoryUnitOfWork } from "../../config/uowConfig";
import { SearchImmersionResultPublicV1 } from "../DtoAndSchemas/v1/output/SearchImmersionResultPublicV1.dto";

describe("search-immersion route", () => {
  let request: SuperTest<Test>;
  let inMemoryUow: InMemoryUnitOfWork;
  let generateApiConsumerJwt: GenerateApiConsumerJwt;

  beforeEach(async () => {
    ({ request, generateApiConsumerJwt, inMemoryUow } = await buildTestApp());
  });

  describe(`v1 - /v1/immersion-offers`, () => {
    describe("verify consumer is authenticated and authorized", () => {
      it("rejects unauthenticated requests", async () => {
        await request
          .get(
            `/v1/immersion-offers?rome=XXXXX&distance_km=30&longitude=2.34999&latitude=48.8531&sortedBy=distance`,
          )
          .expect(401, { error: "forbidden: unauthenticated" });
      });

      it("rejects unauthorized consumer", async () => {
        await request
          .get(
            `/v1/immersion-offers?rome=XXXXX&distance_km=30&longitude=2.34999&latitude=48.8531&sortedBy=distance`,
          )
          .set(
            "Authorization",
            generateApiConsumerJwt({ id: "my-unauthorized-id" }),
          )
          .expect(403, {
            error: "forbidden: unauthorised consumer Id",
          });
      });
    });

    describe("authenficated consumer", () => {
      it("with given rome and position", async () => {
        const immersionOffer = new ImmersionOfferEntityV2Builder()
          .withRomeCode("A1000")
          .build();
        const establishmentAgg = new EstablishmentAggregateBuilder()
          .withImmersionOffers([immersionOffer])
          .withEstablishment(
            new EstablishmentEntityBuilder()
              .withPosition({
                lat: 48.8531,
                lon: 2.34999,
              })
              .withWebsite("www.jobs.fr")
              .build(),
          )
          .build();

        // Prepare
        await inMemoryUow.establishmentAggregateRepository.insertEstablishmentAggregates(
          [establishmentAgg],
        );

        // Act and assert
        const response = await request
          .get(
            `/v1/immersion-offers?rome=A1000&distance_km=30&longitude=2.34999&latitude=48.8531&sortedBy=distance&address=5%20rue%20des%20champs%20elysees%2044000%20Nantes`,
          )
          .set(
            "Authorization",
            generateApiConsumerJwt(validApiConsumerJwtPayload),
          );
        expectToEqual(response.body, [
          {
            address: avenueChampsElysees,
            naf: defaultNafCode,
            nafLabel: establishmentAgg.establishment.nafDto.nomenclature,
            name: "Company inside repository",
            website: "www.jobs.fr",
            additionalInformation: "",
            rome: "A1000",
            romeLabel: "test_rome_label",
            appellationLabels: [immersionOffer.appellationLabel],
            siret: "78000403200019",
            voluntaryToImmersion: true,
            contactMode: "EMAIL",
            numberOfEmployeeRange: "10-19",
            distance_m: 0,
            position: { lat: 48.8531, lon: 2.34999 },
            city: avenueChampsElyseesDto.city,
          },
        ] satisfies SearchImmersionResultPublicV1[]);
        expect(response.status).toBe(200);
      });

      it("accept address with only city", async () => {
        const response = await request
          .get(
            `/v1/immersion-offers?rome=A1000&distance_km=30&longitude=2.34999&latitude=48.8531&sortedBy=distance&address=Lyon`,
          )
          .set(
            "Authorization",
            generateApiConsumerJwt(validApiConsumerJwtPayload),
          );
        expect(response.status).toBe(200);
      });

      it("with no specified rome", async () => {
        await request
          .get(
            `/v1/immersion-offers?distance_km=30&longitude=2.34999&latitude=48.8531&sortedBy=distance`,
          )
          .set(
            "Authorization",
            generateApiConsumerJwt(validApiConsumerJwtPayload),
          )
          .expect(200, []);
      });

      it("with filter voluntaryToImmersion", async () => {
        await request
          .get(
            `/v1/immersion-offers?distance_km=30&longitude=2.34999&latitude=48.8531&voluntaryToImmersion=true&sortedBy=distance`,
          )
          .set(
            "Authorization",
            generateApiConsumerJwt(validApiConsumerJwtPayload),
          )
          .expect(200, []);
      });
    });

    it("rejects invalid requests with error code 400", async () => {
      await request
        .get(
          `/v1/immersion-offers?rome=XXXXX&distance_km=30&longitude=2.34999&latitude=48.8531&sortedBy=distance`,
        )
        .set(
          "Authorization",
          generateApiConsumerJwt(validApiConsumerJwtPayload),
        )
        .expect(400, /Code ROME incorrect/);
    });
  });
});
