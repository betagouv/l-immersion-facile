import { SuperTest, Test } from "supertest";
import { rueSaintHonoreDto } from "../../../../_testBuilders/addressDtos";
import { AppConfigBuilder } from "../../../../_testBuilders/AppConfigBuilder";
import { buildTestApp } from "../../../../_testBuilders/buildTestApp";
import { ContactEntityBuilder } from "../../../../_testBuilders/ContactEntityBuilder";
import { EstablishmentAggregateBuilder } from "../../../../_testBuilders/EstablishmentAggregateBuilder";
import { EstablishmentEntityBuilder } from "../../../../_testBuilders/EstablishmentEntityBuilder";
import { ImmersionOfferEntityV2Builder } from "../../../../_testBuilders/ImmersionOfferEntityV2Builder";
import { validApiConsumerJwtPayload } from "../../../../_testBuilders/jwtTestHelper";
import { GenerateApiConsumerJwt } from "../../../../domain/auth/jwt";
import { TEST_POSITION } from "../../../secondary/immersionOffer/InMemoryEstablishmentAggregateRepository";
import { validAuthorizedApiKeyId } from "../../../secondary/InMemoryApiConsumerRepository";
import { InMemoryUnitOfWork } from "../../config/uowConfig";
import { ContactEstablishmentPublicV2Dto } from "../DtoAndSchemas/v2/input/ContactEstablishmentPublicV2.dto";

const contactEstablishment: ContactEstablishmentPublicV2Dto = {
  contactMode: "EMAIL",
  message: "Salut !",
  siret: "11112222333344",
  appellationCode: "11111",
  potentialBeneficiaryEmail: "john.doe@mail.com",
  potentialBeneficiaryFirstName: "John",
  potentialBeneficiaryLastName: "Doe",
  immersionObjective: "Confirmer un projet professionnel",
  potentialBeneficiaryPhone: "0654334567",
};

describe("POST contact-establishment public V2 route", () => {
  let request: SuperTest<Test>;
  let inMemoryUow: InMemoryUnitOfWork;
  let generateApiConsumerJwt: GenerateApiConsumerJwt;

  beforeEach(async () => {
    ({ request, generateApiConsumerJwt, inMemoryUow } = await buildTestApp(
      new AppConfigBuilder()
        .withRepositories("IN_MEMORY")
        .withAuthorizedApiKeyIds([validAuthorizedApiKeyId])
        .build(),
    ));
  });

  it("refuses to contact if no api key is provided", async () => {
    const response = await request.post(`/v2/contact-establishment`).send({});
    expect(response.status).toBe(401);
  });

  it("returns 404 if siret not found", async () => {
    const response = await request
      .post(`/v2/contact-establishment`)
      .set("Authorization", generateApiConsumerJwt(validApiConsumerJwtPayload))
      .send(contactEstablishment);

    expect(response.status).toBe(404);
  });

  it("contacts the establishment when everything goes right", async () => {
    await inMemoryUow.establishmentAggregateRepository.insertEstablishmentAggregates(
      [
        new EstablishmentAggregateBuilder()
          .withEstablishment(
            new EstablishmentEntityBuilder()
              .withSiret(contactEstablishment.siret)
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
              .withAppellationCode(contactEstablishment.appellationCode)
              .build(),
          ])
          .build(),
      ],
    );

    const response = await request
      .post(`/v2/contact-establishment`)
      .set("Authorization", generateApiConsumerJwt(validApiConsumerJwtPayload))
      .send(contactEstablishment);

    expect(response.status).toBe(200);
    expect(response.body).toBe("");
  });
});
