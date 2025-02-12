import { addDays, subDays } from "date-fns";
import {
  EstablishmentRoutes,
  InclusionConnectJwtPayload,
  InclusionConnectedUserBuilder,
  UserBuilder,
  currentJwtVersions,
  displayRouteName,
  errors,
  establishmentRoutes,
  expectHttpResponseToEqual,
  expectToEqual,
  inclusionConnectTokenExpiredMessage,
} from "shared";
import { HttpClient } from "shared-routes";
import { createSupertestSharedClient } from "shared-routes/supertest";
import {
  GenerateEditFormEstablishmentJwt,
  GenerateInclusionConnectJwt,
} from "../../../../domains/core/jwt";
import { CustomTimeGateway } from "../../../../domains/core/time-gateway/adapters/CustomTimeGateway";
import { InMemoryUnitOfWork } from "../../../../domains/core/unit-of-work/adapters/createInMemoryUow";
import { EstablishmentAggregateBuilder } from "../../../../domains/establishment/helpers/EstablishmentBuilders";
import { buildTestApp } from "../../../../utils/buildTestApp";

describe("Delete form establishment", () => {
  const backofficeAdminUser = new InclusionConnectedUserBuilder()
    .withId("backoffice-admin-user")
    .withIsAdmin(true)
    .buildUser();

  const backofficeAdminJwtPayload: InclusionConnectJwtPayload = {
    version: currentJwtVersions.inclusion,
    iat: new Date().getTime(),
    exp: addDays(new Date(), 30).getTime(),
    userId: backofficeAdminUser.id,
  };

  const user = new UserBuilder().build();

  const establishmentAggregate = new EstablishmentAggregateBuilder()
    .withUserRights([
      {
        role: "establishment-admin",
        job: "fsd",
        phone: "+66",
        userId: user.id,
      },
    ])
    .build();

  let httpClient: HttpClient<EstablishmentRoutes>;
  let uow: InMemoryUnitOfWork;
  let generateEditEstablishmentJwt: GenerateEditFormEstablishmentJwt;
  let generateInclusionConnectJwt: GenerateInclusionConnectJwt;
  let timeGateway: CustomTimeGateway;

  beforeEach(async () => {
    const testAppAndDeps = await buildTestApp();
    ({
      inMemoryUow: uow,
      generateEditEstablishmentJwt,
      generateInclusionConnectJwt,
    } = testAppAndDeps);
    const request = testAppAndDeps.request;
    timeGateway = testAppAndDeps.gateways.timeGateway;
    httpClient = createSupertestSharedClient(establishmentRoutes, request);
    uow.userRepository.users = [backofficeAdminUser, user];
  });

  it(`${displayRouteName(
    establishmentRoutes.deleteEstablishment,
  )} 204 - Establishment Aggregate & Form deleted with back office JWT`, async () => {
    uow.establishmentAggregateRepository.establishmentAggregates = [
      establishmentAggregate,
    ];

    const response = await httpClient.deleteEstablishment({
      urlParams: {
        siret: establishmentAggregate.establishment.siret,
      },
      headers: {
        authorization: generateInclusionConnectJwt(backofficeAdminJwtPayload),
      },
    });

    expectHttpResponseToEqual(response, {
      body: {},
      status: 204,
    });
    expectToEqual(
      uow.establishmentAggregateRepository.establishmentAggregates,
      [],
    );
  });

  it(`${displayRouteName(
    establishmentRoutes.deleteEstablishment,
  )} 400 - Unauthenticated`, async () => {
    const response = await httpClient.deleteEstablishment({
      urlParams: {
        siret: establishmentAggregate.establishment.siret,
      },
      headers: {} as any,
    });

    expectHttpResponseToEqual(response, {
      body: {
        issues: ["authorization : Required"],
        message:
          "Shared-route schema 'headersSchema' was not respected in adapter 'express'.\nRoute: DELETE /form-establishments/:siret",
        status: 400,
      },
      status: 400,
    });
  });

  it(`${displayRouteName(
    establishmentRoutes.deleteEstablishment,
  )} 401 - Jwt expired`, async () => {
    const now = new Date("2024-01-30T00:00:00Z");
    timeGateway.setNextDate(now);
    const response = await httpClient.deleteEstablishment({
      urlParams: {
        siret: establishmentAggregate.establishment.siret,
      },
      headers: {
        authorization: generateInclusionConnectJwt({
          ...backofficeAdminJwtPayload,
          iat: Math.round(now.getTime() / 1000),
          exp: Math.round(subDays(now, 10).getTime() / 1000),
        }),
      },
    });

    expectHttpResponseToEqual(response, {
      body: { message: inclusionConnectTokenExpiredMessage, status: 401 },
      status: 401,
    });
  });

  it(`${displayRouteName(
    establishmentRoutes.deleteEstablishment,
  )} 401 - Access refused with edit establishment JWT`, async () => {
    const response = await httpClient.deleteEstablishment({
      urlParams: {
        siret: establishmentAggregate.establishment.siret,
      },
      headers: {
        authorization: generateEditEstablishmentJwt({
          siret: establishmentAggregate.establishment.siret,
          version: currentJwtVersions.establishment,
        }),
      },
    });

    expectHttpResponseToEqual(response, {
      body: {
        message: "Veuillez vous authentifier",
        status: 401,
      },
      status: 401,
    });
  });

  it(`${displayRouteName(
    establishmentRoutes.deleteEstablishment,
  )} 404 - Establishment Aggregate not found`, async () => {
    const response = await httpClient.deleteEstablishment({
      urlParams: {
        siret: establishmentAggregate.establishment.siret,
      },
      headers: {
        authorization: generateInclusionConnectJwt(backofficeAdminJwtPayload),
      },
    });

    expectHttpResponseToEqual(response, {
      body: {
        status: 404,
        message: errors.establishment.notFound({
          siret: establishmentAggregate.establishment.siret,
        }).message,
      },
      status: 404,
    });
  });

  it(`${displayRouteName(
    establishmentRoutes.deleteEstablishment,
  )} 404 - Establishment Form not found`, async () => {
    uow.establishmentAggregateRepository.establishmentAggregates = [
      establishmentAggregate,
    ];

    const response = await httpClient.deleteEstablishment({
      urlParams: {
        siret: establishmentAggregate.establishment.siret,
      },
      headers: {
        authorization: generateInclusionConnectJwt(backofficeAdminJwtPayload),
      },
    });

    expectHttpResponseToEqual(response, {
      body: {
        status: 404,
        message: errors.establishment.notFound({
          siret: establishmentAggregate.establishment.siret,
        }).message,
      },
      status: 404,
    });
  });
});
