import { SuperTest, Test } from "supertest";
import { expectToEqual, RomeCode, searchImmersionRoute__v0 } from "shared";
import {
  avenueChampsElysees,
  avenueChampsElyseesDto,
} from "../../../../_testBuilders/addressDtos";
import { buildTestApp } from "../../../../_testBuilders/buildTestApp";
import { EstablishmentAggregateBuilder } from "../../../../_testBuilders/establishmentAggregate.test.helpers";
import { EstablishmentEntityBuilder } from "../../../../_testBuilders/EstablishmentEntityBuilder";
import { ImmersionOfferEntityV2Builder } from "../../../../_testBuilders/ImmersionOfferEntityV2Builder";
import { InMemoryUnitOfWork } from "../../config/uowConfig";
import { SearchImmersionResultPublicV0 } from "../DtoAndSchemas/v0/output/SearchImmersionResultPublicV0.dto";

const establishmentAgg = new EstablishmentAggregateBuilder()
  .withImmersionOffers([
    new ImmersionOfferEntityV2Builder().withRomeCode("A1000").build(),
  ])
  .withEstablishment(
    new EstablishmentEntityBuilder()
      .withPosition({
        lat: 48.8531,
        lon: 2.34999,
      })
      .build(),
  )
  .build();

describe("search-immersion route", () => {
  let request: SuperTest<Test>;
  let inMemoryUow: InMemoryUnitOfWork;

  beforeEach(async () => {
    ({ request, inMemoryUow } = await buildTestApp());
  });

  describe(`v0 - /${searchImmersionRoute__v0}`, () => {
    describe("accepts valid requests", () => {
      it("with given rome and location", async () => {
        // Prepare
        await inMemoryUow.establishmentAggregateRepository.insertEstablishmentAggregates(
          [establishmentAgg],
        );

        const romeCode: RomeCode = "A1000";

        // Act and assert

        const response = await request
          .post(`/${searchImmersionRoute__v0}`)
          .send({
            rome: romeCode,
            location: {
              lat: 48.8531,
              lon: 2.34999,
            },
            distance_km: 30,
          });
        expectToEqual(response.body, [
          {
            address: avenueChampsElysees,
            naf: establishmentAgg.establishment.nafDto.code,
            nafLabel: establishmentAgg.establishment.nafDto.nomenclature,
            name: establishmentAgg.establishment.name,
            rome: romeCode,
            romeLabel: "test_rome_label",
            siret: establishmentAgg.establishment.siret,
            voluntaryToImmersion: true,
            contactMode: "EMAIL",
            numberOfEmployeeRange:
              establishmentAgg.establishment.numberEmployeesRange,
            distance_m: 0,
            location: { lat: 48.8531, lon: 2.34999 },
            city: avenueChampsElyseesDto.city,
            id: `${establishmentAgg.establishment.siret}-${romeCode}`,
          },
        ] satisfies SearchImmersionResultPublicV0[]);
        expectToEqual(response.statusCode, 200);
      });
      it("with no specified rome", async () => {
        await request
          .post(`/${searchImmersionRoute__v0}`)
          .send({
            location: {
              lat: 48.8531,
              lon: 2.34999,
            },
            distance_km: 30,
          })
          .expect(200, []);
      });
    });

    // TODO add test which actually recovers data (and one with token, one without)

    it("rejects invalid requests with error code 400", async () => {
      const response = await request.post(`/${searchImmersionRoute__v0}`).send({
        rome: "XXXXX", // not a valid rome code
        location: {
          lat: 48.8531,
          lon: 2.34999,
        },
        distance_km: 30,
      });

      expectToEqual(response.body, {
        errors: [
          {
            code: "invalid_string",
            message: "Code ROME incorrect",
            path: ["rome"],
            validation: "regex",
          },
        ],
      });
      expectToEqual(response.statusCode, 400);
    });
  });
});
