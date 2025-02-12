import { addDays, millisecondsToSeconds, subYears } from "date-fns";
import {
  EstablishmentRoutes,
  FormEstablishmentDto,
  FormEstablishmentDtoBuilder,
  InclusionConnectJwtPayload,
  InclusionConnectedUserBuilder,
  createEstablishmentJwtPayload,
  currentJwtVersions,
  errors,
  establishmentRoutes,
  expectHttpResponseToEqual,
  expectToEqual,
  expiredMagicLinkErrorMessage,
} from "shared";
import { HttpClient } from "shared-routes";
import { createSupertestSharedClient } from "shared-routes/supertest";
import supertest from "supertest";
import { AppConfig } from "../../../../config/bootstrap/appConfig";
import {
  GenerateEditFormEstablishmentJwt,
  GenerateInclusionConnectJwt,
  makeGenerateJwtES256,
} from "../../../../domains/core/jwt";
import {
  TEST_OPEN_ESTABLISHMENT_1,
  TEST_OPEN_ESTABLISHMENT_2,
} from "../../../../domains/core/sirene/adapters/InMemorySiretGateway";
import { InMemoryUnitOfWork } from "../../../../domains/core/unit-of-work/adapters/createInMemoryUow";
import { EstablishmentAggregateBuilder } from "../../../../domains/establishment/helpers/EstablishmentBuilders";
import { AppConfigBuilder } from "../../../../utils/AppConfigBuilder";
import { InMemoryGateways, buildTestApp } from "../../../../utils/buildTestApp";

describe("Edit form establishments", () => {
  let httpClient: HttpClient<EstablishmentRoutes>;
  let appConfig: AppConfig;
  let gateways: InMemoryGateways;
  let inMemoryUow: InMemoryUnitOfWork;
  let generateEditEstablishmentJwt: GenerateEditFormEstablishmentJwt;
  let generateInclusionConnectJwt: GenerateInclusionConnectJwt;

  const formEstablishment = FormEstablishmentDtoBuilder.valid()
    .withSiret(TEST_OPEN_ESTABLISHMENT_1.siret)
    .build();

  beforeEach(async () => {
    let request: supertest.SuperTest<supertest.Test>;
    ({
      request,
      appConfig,
      gateways,
      inMemoryUow,
      generateEditEstablishmentJwt,
      generateInclusionConnectJwt,
    } = await buildTestApp(
      new AppConfigBuilder().withTestPresetPreviousKeys().build(),
    ));
    httpClient = createSupertestSharedClient(establishmentRoutes, request);
  });

  it("200 - Supports posting already existing form establisment when authenticated with establishment JWT", async () => {
    const response = await httpClient.updateFormEstablishment({
      body: formEstablishment,
      headers: {
        authorization: generateEditEstablishmentJwt(
          createEstablishmentJwtPayload({
            siret: TEST_OPEN_ESTABLISHMENT_1.siret,
            durationDays: 1,
            now: new Date(),
          }),
        ),
      },
    });

    expectHttpResponseToEqual(response, {
      body: "",
      status: 200,
    });
    expect(inMemoryUow.outboxRepository.events).toHaveLength(1);
    expectToEqual(
      inMemoryUow.establishmentAggregateRepository.establishmentAggregates,
      [
        new EstablishmentAggregateBuilder()
          .fromFormEstablishment(formEstablishment, gateways.timeGateway.now())
          .build(),
      ],
    );
  });

  it("200 - Updates establishment with new data", async () => {
    const updatedFormEstablishment: FormEstablishmentDto = {
      ...formEstablishment,
      maxContactsPerMonth: 20,
      searchableBy: {
        jobSeekers: false,
        students: true,
      },
      appellations: [
        {
          romeCode: "D1103",
          appellationCode: "33333",
          romeLabel: "Boucherie",
          appellationLabel: "Boucher / Bouchère",
        },
      ],
    };
    const response = await httpClient.updateFormEstablishment({
      body: updatedFormEstablishment,
      headers: {
        authorization: generateEditEstablishmentJwt(
          createEstablishmentJwtPayload({
            siret: TEST_OPEN_ESTABLISHMENT_1.siret,
            durationDays: 1,
            now: new Date(),
          }),
        ),
      },
    });

    expectHttpResponseToEqual(response, {
      body: "",
      status: 200,
    });
    expect(inMemoryUow.outboxRepository.events).toHaveLength(1);
    expectToEqual(
      inMemoryUow.establishmentAggregateRepository.establishmentAggregates,
      [
        new EstablishmentAggregateBuilder()
          .fromFormEstablishment(
            updatedFormEstablishment,
            gateways.timeGateway.now(),
          )
          .build(),
      ],
    );
  });

  it("200 - Supports posting already existing form establisment when authenticated with backoffice JWT", async () => {
    const backofficeAdminUser = new InclusionConnectedUserBuilder()
      .withId("backoffice-admin-user")
      .withIsAdmin(true)
      .buildUser();

    const backofficeAdminICJwtPayload: InclusionConnectJwtPayload = {
      version: currentJwtVersions.inclusion,
      iat: millisecondsToSeconds(new Date().getTime()),
      exp: millisecondsToSeconds(addDays(new Date(), 30).getTime()),
      userId: backofficeAdminUser.id,
    };

    inMemoryUow.userRepository.users = [backofficeAdminUser];

    const response = await httpClient.updateFormEstablishment({
      body: formEstablishment,
      headers: {
        authorization: generateInclusionConnectJwt(backofficeAdminICJwtPayload),
      },
    });

    expectHttpResponseToEqual(response, {
      body: "",
      status: 200,
    });
    expect(inMemoryUow.outboxRepository.events).toHaveLength(1);
    expectToEqual(
      inMemoryUow.establishmentAggregateRepository.establishmentAggregates,
      [
        new EstablishmentAggregateBuilder()
          .fromFormEstablishment(formEstablishment, gateways.timeGateway.now())
          .build(),
      ],
    );
  });

  it("400 - not authenticated", async () => {
    const response = await httpClient.updateFormEstablishment({
      body: formEstablishment,
      headers: {} as any,
    });

    expectHttpResponseToEqual(response, {
      body: {
        issues: ["authorization : Required"],
        message:
          "Shared-route schema 'headersSchema' was not respected in adapter 'express'.\nRoute: PUT /form-establishments",
        status: 400,
      },
      status: 400,
    });
  });

  it("401 - Jwt is generated from wrong private key", async () => {
    const generateJwtWithWrongKey = makeGenerateJwtES256<"establishment">(
      appConfig.apiJwtPrivateKey, // Private Key is the wrong one !
      undefined,
    );

    const response = await httpClient.updateFormEstablishment({
      body: formEstablishment,
      headers: {
        authorization: generateJwtWithWrongKey(
          createEstablishmentJwtPayload({
            siret: "12345678901234",
            durationDays: 1,
            now: new Date(),
          }),
        ),
      },
    });

    expectHttpResponseToEqual(response, {
      status: 401,
      body: { status: 401, message: "Provided token is invalid" },
    });
  });

  it("401 - Jwt is malformed", async () => {
    const response = await httpClient.updateFormEstablishment({
      body: formEstablishment,
      headers: {
        authorization: "bad-jwt",
      },
    });

    expectHttpResponseToEqual(response, {
      body: { status: 401, message: "Provided token is invalid" },
      status: 401,
    });
  });

  it("403 - Jwt is expired", async () => {
    const response = await httpClient.updateFormEstablishment({
      body: formEstablishment,
      headers: {
        authorization: generateEditEstablishmentJwt(
          createEstablishmentJwtPayload({
            siret: "12345678901234",
            durationDays: 1,
            now: subYears(gateways.timeGateway.now(), 1),
          }),
        ),
      },
    });

    expectHttpResponseToEqual(response, {
      body: {
        message: expiredMagicLinkErrorMessage,
        needsNewMagicLink: true,
      },
      status: 403,
    });
  });

  it("409 - Missing establishment form", async () => {
    const establishment = FormEstablishmentDtoBuilder.valid()
      .withSiret(TEST_OPEN_ESTABLISHMENT_2.siret)
      .build();
    const response = await httpClient.updateFormEstablishment({
      body: establishment,
      headers: {
        authorization: generateEditEstablishmentJwt(
          createEstablishmentJwtPayload({
            siret: TEST_OPEN_ESTABLISHMENT_2.siret,
            durationDays: 1,
            now: new Date(),
          }),
        ),
      },
    });

    expectHttpResponseToEqual(response, {
      body: {
        status: 409,
        message: errors.establishment.conflictError({
          siret: establishment.siret,
        }).message,
      },
      status: 409,
    });
    expect(inMemoryUow.outboxRepository.events).toHaveLength(1);
  });
});
