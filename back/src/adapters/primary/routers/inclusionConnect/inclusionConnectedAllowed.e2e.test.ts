import { SuperTest, Test } from "supertest";
import {
  AgencyDtoBuilder,
  allowedStartInclusionConnectLoginPages,
  ConventionDtoBuilder,
  currentJwtVersions,
  displayRouteName,
  expectHttpResponseToEqual,
  expectToEqual,
  frontRoutes,
  InclusionConnectedAllowedRoutes,
  inclusionConnectedAllowedRoutes,
} from "shared";
import { InclusionConnectedUser } from "shared";
import { HttpClient } from "shared-routes";
import { createSupertestSharedClient } from "shared-routes/supertest";
import { buildTestApp } from "../../../../_testBuilders/buildTestApp";
import { GenerateInclusionConnectJwt } from "../../../../domain/auth/jwt";
import { broadcastToPeServiceName } from "../../../../domain/core/ports/ErrorRepository";
import { InMemoryUnitOfWork } from "../../config/uowConfig";

describe("InclusionConnectedAllowedRoutes", () => {
  const userId = "123";
  const agency = new AgencyDtoBuilder().build();
  const inclusionConnectedUserWithoutRights: InclusionConnectedUser = {
    id: userId,
    email: "joe@mail.com",
    firstName: "Joe",
    lastName: "Doe",
    agencyRights: [],
  };
  const inclusionConnectedUserWithRights: InclusionConnectedUser = {
    ...inclusionConnectedUserWithoutRights,
    agencyRights: [{ agency, role: "validator" }],
  };

  let httpClient: HttpClient<InclusionConnectedAllowedRoutes>;
  let generateInclusionConnectJwt: GenerateInclusionConnectJwt;
  let inMemoryUow: InMemoryUnitOfWork;

  beforeEach(async () => {
    let request: SuperTest<Test>;
    ({ request, generateInclusionConnectJwt, inMemoryUow } =
      await buildTestApp());
    httpClient = createSupertestSharedClient(
      inclusionConnectedAllowedRoutes,
      request,
    );
  });

  describe("/inclusion-connected/user", () => {
    it(`${displayRouteName(
      inclusionConnectedAllowedRoutes.getInclusionConnectedUser,
    )} 200 with agency dashboard url on response body`, async () => {
      const convention = new ConventionDtoBuilder()
        .withEstablishmentRepresentativeEmail(
          inclusionConnectedUserWithRights.email,
        )
        .build();

      inMemoryUow.conventionRepository.setConventions({
        [convention.id]: convention,
      });

      inMemoryUow.inclusionConnectedUserRepository.setInclusionConnectedUsers([
        inclusionConnectedUserWithRights,
      ]);

      const token = generateInclusionConnectJwt({
        userId,
        version: currentJwtVersions.inclusion,
      });

      const response = await httpClient.getInclusionConnectedUser({
        headers: { authorization: token },
      });

      expectHttpResponseToEqual(response, {
        body: {
          ...inclusionConnectedUserWithRights,
          agencyDashboardUrl: `http://stubAgencyDashboard/${agency.id}`,
          establishmentRepresentativeDashboardUrl: `http://stubEstablishmentRepresentativeConventionsDashboardUrl/${inclusionConnectedUserWithRights.email}/Wed Sep 01 2021 12:10:00 GMT+0200 (Central European Summer Time)`,
        },
        status: 200,
      });
    });

    it(`${displayRouteName(
      inclusionConnectedAllowedRoutes.getInclusionConnectedUser,
    )} 400 without headers`, async () => {
      const response = await httpClient.getInclusionConnectedUser({
        headers: {} as any,
      });
      expectHttpResponseToEqual(response, {
        body: {
          issues: ["authorization : Required"],
          message:
            "Shared-route schema 'headersSchema' was not respected in adapter 'express'.\nRoute: GET /inclusion-connected/user",
          status: 400,
        },
        status: 400,
      });
    });

    it(`${displayRouteName(
      inclusionConnectedAllowedRoutes.getInclusionConnectedUser,
    )} 403 with bad token`, async () => {
      const response = await httpClient.getInclusionConnectedUser({
        headers: { authorization: "wrong-token" },
      });

      expect(response.body).toEqual({ error: "jwt malformed" });
      expect(response.status).toBe(403);
    });

    it(`${displayRouteName(
      inclusionConnectedAllowedRoutes.getInclusionConnectedUser,
    )} 403 with expired token`, async () => {
      const userId = "123";
      const token = generateInclusionConnectJwt(
        { userId, version: currentJwtVersions.inclusion },
        0,
      );

      const response = await httpClient.getInclusionConnectedUser({
        headers: { authorization: token },
      });

      expect(response.body).toEqual({ error: "jwt expired" });
      expect(response.status).toBe(403);
    });
  });

  describe(`/inclusion-connected/register-agency`, () => {
    it(`${displayRouteName(
      inclusionConnectedAllowedRoutes.registerAgenciesToUser,
    )} 200 add an agency as registered to an Inclusion Connected user`, async () => {
      inMemoryUow.inclusionConnectedUserRepository.setInclusionConnectedUsers([
        inclusionConnectedUserWithoutRights,
      ]);
      inMemoryUow.agencyRepository.setAgencies([agency]);

      const response = await httpClient.registerAgenciesToUser({
        headers: {
          authorization: generateInclusionConnectJwt({
            userId,
            version: currentJwtVersions.inclusion,
          }),
        },
        body: [agency.id],
      });

      expectHttpResponseToEqual(response, {
        body: "",
        status: 200,
      });
      expectToEqual(
        await inMemoryUow.inclusionConnectedUserRepository.getById(userId),
        {
          ...inclusionConnectedUserWithRights,
          agencyRights: [{ agency, role: "toReview" }],
        },
      );
    });

    it(`${displayRouteName(
      inclusionConnectedAllowedRoutes.registerAgenciesToUser,
    )} 400 without headers`, async () => {
      const response = await httpClient.registerAgenciesToUser({
        body: ["1"],
        headers: {} as any,
      });
      expectHttpResponseToEqual(response, {
        body: {
          issues: ["authorization : Required"],
          message:
            "Shared-route schema 'headersSchema' was not respected in adapter 'express'.\nRoute: POST /inclusion-connected/register-agency",
          status: 400,
        },
        status: 400,
      });
    });
  });

  describe("Mark partners errored convention as handled", () => {
    it(`${displayRouteName(
      inclusionConnectedAllowedRoutes.markPartnersErroredConventionAsHandled,
    )} 400 without headers`, async () => {
      const response = await httpClient.markPartnersErroredConventionAsHandled({
        headers: {} as any,
        body: { conventionId: "11111111-1111-4111-1111-111111111111" },
      });
      expectHttpResponseToEqual(response, {
        body: {
          issues: ["authorization : Required"],
          message:
            "Shared-route schema 'headersSchema' was not respected in adapter 'express'.\nRoute: POST /inclusion-connected/mark-errored-convention-as-handled",
          status: 400,
        },
        status: 400,
      });
    });

    it(`${displayRouteName(
      inclusionConnectedAllowedRoutes.markPartnersErroredConventionAsHandled,
    )} 403 with bad token`, async () => {
      const response = await httpClient.markPartnersErroredConventionAsHandled({
        headers: { authorization: "wrong-token" },
        body: { conventionId: "11111111-1111-4111-1111-111111111111" },
      });
      expect(response.body).toEqual({ error: "jwt malformed" });
      expect(response.status).toBe(403);
    });

    it(`${displayRouteName(
      inclusionConnectedAllowedRoutes.markPartnersErroredConventionAsHandled,
    )} 403 with expired token`, async () => {
      const userId = "123";
      const token = generateInclusionConnectJwt(
        { userId, version: currentJwtVersions.inclusion },
        0,
      );
      const response = await httpClient.markPartnersErroredConventionAsHandled({
        headers: { authorization: token },
        body: { conventionId: "11111111-1111-4111-1111-111111111111" },
      });
      expect(response.body).toEqual({ error: "jwt expired" });
      expect(response.status).toBe(403);
    });

    it("mark partners errored convention as handled", async () => {
      const userId = "123456ab";
      const conventionId = "11111111-1111-4111-1111-111111111111";
      const agency = new AgencyDtoBuilder().build();
      const user: InclusionConnectedUser = {
        id: userId,
        email: "joe@mail.com",
        firstName: "Joe",
        lastName: "Doe",
        agencyRights: [{ agency, role: "validator" }],
      };
      const convention = new ConventionDtoBuilder()
        .withId(conventionId)
        .withAgencyId(agency.id)
        .build();
      inMemoryUow.inclusionConnectedUserRepository.setInclusionConnectedUsers([
        user,
      ]);
      inMemoryUow.agencyRepository.setAgencies([agency]);
      inMemoryUow.conventionRepository.setConventions({
        [convention.id]: convention,
      });
      await inMemoryUow.errorRepository.save({
        serviceName: broadcastToPeServiceName,
        message: "Some message",
        params: { conventionId, httpStatus: 500 },
        occurredAt: new Date("2023-10-26T12:00:00.000"),
        handledByAgency: false,
      });
      const token = generateInclusionConnectJwt({
        userId,
        version: currentJwtVersions.inclusion,
      });

      const response = await httpClient.markPartnersErroredConventionAsHandled({
        headers: { authorization: token },
        body: { conventionId: convention.id },
      });
      expect(response.body).toBe("");
      expect(response.status).toBe(200);
      expectToEqual(inMemoryUow.errorRepository.savedErrors, [
        {
          serviceName: broadcastToPeServiceName,
          message: "Some message",
          params: { conventionId, httpStatus: 500 },
          occurredAt: new Date("2023-10-26T12:00:00.000"),
          handledByAgency: true,
        },
      ]);
    });

    describe(`${displayRouteName(
      inclusionConnectedAllowedRoutes.getInclusionConnectLogoutUrl,
    )} returns the logout url`, () => {
      it.each(allowedStartInclusionConnectLoginPages)(
        "returns a correct logout url with status 200 from %s",
        async (page) => {
          const response = await httpClient.getInclusionConnectLogoutUrl({
            queryParams: { page },
          });
          expectHttpResponseToEqual(response, {
            body: `https://fake-inclusion.com/logout/?client_id=inclusion-client-id&post_logout_redirect_uri=https://my-domain/${frontRoutes[page]}`,
            status: 200,
          });
        },
      );
    });
  });
});
