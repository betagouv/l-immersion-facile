import { SuperTest, Test } from "supertest";
import {
  expectToEqual,
  immersionOffersRoute,
  SearchImmersionResultDto,
  searchTargets,
} from "shared";
import { avenueChampsElyseesDto } from "../../../../_testBuilders/addressDtos";
import { buildTestApp } from "../../../../_testBuilders/buildTestApp";
import { EstablishmentAggregateBuilder } from "../../../../_testBuilders/EstablishmentAggregateBuilder";
import { EstablishmentEntityBuilder } from "../../../../_testBuilders/EstablishmentEntityBuilder";
import { ImmersionOfferEntityV2Builder } from "../../../../_testBuilders/ImmersionOfferEntityV2Builder";
import { InMemoryEstablishmentAggregateRepository } from "../../../secondary/immersionOffer/InMemoryEstablishmentAggregateRepository";
import { stubSearchResult } from "../../../secondary/immersionOffer/inMemoryEstablishmentGroupRepository";

describe("search-immersion route", () => {
  let request: SuperTest<Test>;
  let establishmentAggregateRepository: InMemoryEstablishmentAggregateRepository;

  beforeEach(async () => {
    const { request: testAppRequest, inMemoryUow } = await buildTestApp();
    request = testAppRequest;
    establishmentAggregateRepository =
      inMemoryUow.establishmentAggregateRepository;
  });

  describe(`from front - /${immersionOffersRoute}`, () => {
    describe("accepts valid requests", () => {
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
        await establishmentAggregateRepository.insertEstablishmentAggregates([
          establishmentAgg,
        ]);

        // Act and assert
        const expectedResult: SearchImmersionResultDto[] = [
          {
            address: avenueChampsElyseesDto,
            naf: establishmentAgg.establishment.nafDto.code,
            nafLabel: establishmentAgg.establishment.nafDto.nomenclature,
            name: "Company inside repository",
            rome: "A1000",
            romeLabel: "test_rome_label",
            appellations: [
              {
                appellationLabel: immersionOffer.appellationLabel,
                appellationCode: immersionOffer.appellationCode,
              },
            ],
            siret: "78000403200019",
            voluntaryToImmersion: true,
            contactMode: "EMAIL",
            numberOfEmployeeRange: "10-19",
            distance_m: 719436,
            position: { lat: 43.8666, lon: 8.3333 },
            website: "www.jobs.fr",
            additionalInformation: "",
          },
        ];
        await request
          .get(
            `/${immersionOffersRoute}?rome=A1000&distanceKm=30&longitude=2.34999&latitude=48.8531&sortedBy=distance`,
          )
          .expect(200, expectedResult);
      });
      it("with no specified rome", async () => {
        await request
          .get(
            `/${immersionOffersRoute}?distanceKm=30&longitude=2.34999&latitude=48.8531&sortedBy=distance`,
          )
          .expect(200, []);
      });
      it("with filter voluntaryToImmersion", async () => {
        await request
          .get(
            `/${immersionOffersRoute}?distanceKm=30&longitude=2.34999&latitude=48.8531&voluntaryToImmersion=true&sortedBy=distance`,
          )
          .expect(200, []);
      });
    });

    // TODO add test which actually recovers data (and one with token, one without)

    it("rejects invalid requests with error code 400", async () => {
      await request
        .get(
          `/${immersionOffersRoute}?appellationCode=XXXXX&distanceKm=30&longitude=2.34999&latitude=48.8531&sortedBy=distance`,
        )
        .expect(400, /Code ROME incorrect/);
    });
  });

  describe("GET getOffersByGroupSlug", () => {
    it("should get the stubbed data", async () => {
      const response = await request.get(
        searchTargets.getOffersByGroupSlug.url.replace(
          ":slug",
          "some-group-slug",
        ),
      );
      expect(response.status).toBe(200);
      expectToEqual(response.body, [stubSearchResult]);
    });
  });
});
