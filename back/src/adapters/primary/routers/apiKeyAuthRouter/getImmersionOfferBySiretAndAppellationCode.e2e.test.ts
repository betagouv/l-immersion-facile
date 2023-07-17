import {SuperTest, Test} from "supertest";
import {AppellationAndRomeDto, expectToEqual} from "shared";
import {HttpClient} from "shared-routes";
import {createSupertestSharedClient} from "shared-routes/supertest";
import {rueSaintHonoreDto} from "../../../../_testBuilders/addressDtos";
import {AppConfigBuilder} from "../../../../_testBuilders/AppConfigBuilder";
import {buildTestApp} from "../../../../_testBuilders/buildTestApp";
import {ContactEntityBuilder} from "../../../../_testBuilders/ContactEntityBuilder";
import {EstablishmentAggregateBuilder} from "../../../../_testBuilders/establishmentAggregate.test.helpers";
import {defaultNafCode, EstablishmentEntityBuilder,} from "../../../../_testBuilders/EstablishmentEntityBuilder";
import {ImmersionOfferEntityV2Builder} from "../../../../_testBuilders/ImmersionOfferEntityV2Builder";
import {GenerateApiConsumerJwt} from "../../../../domain/auth/jwt";
import {
  TEST_POSITION,
  TEST_ROME_LABEL,
} from "../../../secondary/immersionOffer/InMemoryEstablishmentAggregateRepository";
import {validAuthorizedApiKeyId} from "../../../secondary/InMemoryApiConsumerRepository";
import {InMemoryUnitOfWork} from "../../config/uowConfig";
import {SearchImmersionResultPublicV2} from "../DtoAndSchemas/v2/output/SearchImmersionResultPublicV2.dto";
import {PublicApiV2Routes, publicApiV2Routes} from "./publicApiV2.routes";

// TODO : A déplacer dans dossier e2e

const styliste: AppellationAndRomeDto = {
  romeCode: "B1805",
  romeLabel: "Stylisme",
  appellationCode: "19540",
  appellationLabel: "Styliste",
};
const immersionOfferSiret = "78000403200019";

describe(`Route to get ImmersionSearchResultDto by siret and rome - /v2/immersion-offers/:siret/:appellationCode`, () => {
  let request: SuperTest<Test>;
  let inMemoryUow: InMemoryUnitOfWork;
  let generateApiConsumerJwt: GenerateApiConsumerJwt;
  let authToken: string;
  let sharedRequest: HttpClient<PublicApiV2Routes>;

  beforeEach(async () => {
    const config = new AppConfigBuilder()
      .withRepositories("IN_MEMORY")
      .withAuthorizedApiKeyIds([validAuthorizedApiKeyId])
      .build();
    ({ request, inMemoryUow, generateApiConsumerJwt } = await buildTestApp(
      config,
    ));
    authToken = generateApiConsumerJwt({
      id: validAuthorizedApiKeyId,
    });

    sharedRequest = createSupertestSharedClient(publicApiV2Routes, request);

    await inMemoryUow.establishmentAggregateRepository.insertEstablishmentAggregates(
      [
        new EstablishmentAggregateBuilder()
          .withEstablishment(
            new EstablishmentEntityBuilder()
              .withSiret(immersionOfferSiret)
              .withPosition(TEST_POSITION)
              .withNumberOfEmployeeRange("10-19")
              .withAddress(rueSaintHonoreDto)
              .build(),
          )
          .withContact(
            new ContactEntityBuilder().withContactMethod("EMAIL").build(),
          )
          .withImmersionOffers([
            new ImmersionOfferEntityV2Builder()
              .withRomeCode(styliste.romeCode)
              .withAppellationCode(styliste.appellationCode)
              .withAppellationLabel(styliste.appellationLabel)
              .build(),
          ])
          .build(),
      ],
    );
  });

  it("rejects unauthenticated requests", async () => {
    const siretNotInDB = "11000403200019";

    const response = await sharedRequest.getOffersBySiretAndAppellationCode({
      headers: {
        authorization: "",
      },
      urlParams: {
        appellationCode: styliste.appellationCode,
        siret: siretNotInDB,
      },
    });

    expectToEqual(response, {
      status: 401,
      body: { error: "forbidden: unauthenticated" },
    });
  });

  it("accepts valid authenticated requests", async () => {
    const response = await request
      .get(
        `/v2/immersion-offers/${immersionOfferSiret}/${styliste.appellationCode}`,
      )
      .set("Authorization", authToken);

    expect(response.body).toEqual({
      rome: styliste.romeCode,
      naf: defaultNafCode,
      siret: "78000403200019",
      name: "Company inside repository",
      voluntaryToImmersion: true,
      position: TEST_POSITION,
      numberOfEmployeeRange: "10-19",
      address: rueSaintHonoreDto,
      contactMode: "EMAIL",
      romeLabel: TEST_ROME_LABEL,
      appellations: [
        {
          appellationLabel: styliste.appellationLabel,
          appellationCode: styliste.appellationCode,
        },
      ],
      nafLabel: "NAFRev2",
      additionalInformation: "",
      website: "www.jobs.fr",
    } satisfies SearchImmersionResultPublicV2);
    expect(response.status).toBe(200);
  });

  it("returns 404 if no offer can be found with such siret & rome", async () => {
    const siretNotInDB = "11000403200019";

    const response = await sharedRequest.getOffersBySiretAndAppellationCode({
      headers: {
        authorization: authToken,
      },
      urlParams: {
        appellationCode: styliste.appellationCode,
        siret: siretNotInDB,
      },
    });

    expectToEqual(response, {
      status: 404,
      body: {
        errors: `No offer found for siret ${siretNotInDB} and appellation code ${styliste.appellationCode}`,
      },
    });
  });

  it("return 403 if forbidden", async () => {
    const authToken = generateApiConsumerJwt({
      id: "my-unauthorized-id",
    });

    const response = await sharedRequest.getOffersBySiretAndAppellationCode({
      headers: {
        authorization: authToken,
      },
      urlParams: {
        appellationCode: styliste.appellationCode,
        siret: immersionOfferSiret,
      },
    });

    expectToEqual(response, {
      status: 403,
      body: { error: "forbidden: unauthorised consumer Id" },
    });
  });
});
