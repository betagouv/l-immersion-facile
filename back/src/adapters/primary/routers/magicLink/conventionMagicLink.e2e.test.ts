import { addDays } from "date-fns";
import {
  AgencyDtoBuilder,
  BackOfficeJwtPayload,
  ConventionDtoBuilder,
  ConventionId,
  ConventionJwtPayload,
  ConventionMagicLinkRoutes,
  conventionMagicLinkRoutes,
  expectHttpResponseToEqual,
  expectToEqual,
  InclusionConnectedUser,
  InclusionConnectJwt,
  InclusionConnectJwtPayload,
  RenewConventionParams,
  Role,
  ScheduleDtoBuilder,
} from "shared";
import { HttpClient } from "shared-routes";
import { createSupertestSharedClient } from "shared-routes/supertest";
import { buildTestApp } from "../../../../_testBuilders/buildTestApp";
import {
  GenerateBackOfficeJwt,
  GenerateConventionJwt,
  GenerateInclusionConnectJwt,
} from "../../../../domain/auth/jwt";
import { InMemoryUnitOfWork } from "../../config/uowConfig";

const payloadMeta = {
  exp: new Date().getTime() / 1000 + 1000,
  iat: new Date().getTime() / 1000,
  version: 1,
};

const conventionBuilder = new ConventionDtoBuilder().withStatus("DRAFT");

describe("Magic link router", () => {
  type JwtScenario =
    | {
        kind: "convention";
        payload: ConventionJwtPayload;
      }
    | {
        kind: "backOffice";
        payload: BackOfficeJwtPayload;
      }
    | {
        kind: "inclusionConnect";
        payload: InclusionConnectJwtPayload;
      };

  let sharedRequest: HttpClient<ConventionMagicLinkRoutes>;
  let generateBackOfficeJwt: GenerateBackOfficeJwt;
  let generateConventionJwt: GenerateConventionJwt;
  let generateInclusionConnectJwt: GenerateInclusionConnectJwt;
  let inMemoryUow: InMemoryUnitOfWork;

  beforeEach(async () => {
    const testApp = await buildTestApp();
    ({
      generateBackOfficeJwt,
      generateConventionJwt,
      generateInclusionConnectJwt,
      inMemoryUow,
    } = testApp);
    sharedRequest = createSupertestSharedClient(
      conventionMagicLinkRoutes,
      testApp.request,
    );
    const initialConvention = conventionBuilder.build();
    inMemoryUow.conventionRepository.setConventions({
      [initialConvention.id]: initialConvention,
    });
  });

  describe("POST /auth/demande-immersion/:conventionId", () => {
    const updatedConvention = conventionBuilder
      .withBeneficiaryFirstName("Merguez")
      .withStatus("READY_TO_SIGN")
      .withStatusJustification("justif")
      .build();

    it.each<JwtScenario>([
      {
        kind: "convention",
        payload: {
          ...payloadMeta,
          role: "beneficiary",
          emailHash: "",
          applicationId: updatedConvention.id,
        },
      },
      {
        kind: "backOffice",
        payload: {
          ...payloadMeta,
          role: "backOffice",
          sub: "",
        },
      },
    ])("200 - can update the convention with '$kind' jwt", async (scenario) => {
      const jwtGeneratorByKind = ({ kind, payload }: JwtScenario) => {
        if (kind === "backOffice") return generateBackOfficeJwt(payload);
        if (kind === "convention") return generateConventionJwt(payload);
        return generateInclusionConnectJwt(payload);
      };

      const response = await sharedRequest.updateConvention({
        body: { convention: updatedConvention },
        urlParams: {
          conventionId: updatedConvention.id,
        },
        headers: {
          authorization: jwtGeneratorByKind(scenario),
        },
      });

      expectHttpResponseToEqual(response, {
        body: { id: updatedConvention.id },
        status: 200,
      });
      expectToEqual(inMemoryUow.conventionRepository.conventions, [
        updatedConvention,
      ]);
    });
  });

  describe("POST /renew-convention", () => {
    const existingConvention = new ConventionDtoBuilder().build();

    const renewedConventionStartDate = addDays(
      new Date(existingConvention.dateEnd),
      1,
    );
    const renewedConventionEndDate = addDays(renewedConventionStartDate, 5);
    const renewedConventionParams: RenewConventionParams = {
      id: "11111111-1111-4111-1111-111111111111",
      dateStart: renewedConventionStartDate.toISOString(),
      dateEnd: renewedConventionEndDate.toISOString(),
      schedule: new ScheduleDtoBuilder()
        .withDateInterval({
          start: renewedConventionStartDate,
          end: renewedConventionEndDate,
        })
        .build(),
      renewed: {
        from: existingConvention.id,
        justification: "Il faut bien...",
      },
    };

    const createTokenForRole = ({
      role,
      conventionId,
    }: {
      role: Role;
      conventionId: ConventionId;
    }) =>
      generateConventionJwt({
        applicationId: conventionId,
        role,
        version: 1,
        iat: new Date().getTime() / 1000,
        exp: new Date().getTime() / 1000 + 1000,
        emailHash: "my-hash",
      });

    const agency = new AgencyDtoBuilder().build();
    const inclusionConnectedUser: InclusionConnectedUser = {
      id: "my-user-id",
      email: "my-user@email.com",
      firstName: "John",
      lastName: "Doe",
      agencyRights: [{ role: "validator", agency }],
    };

    it.each<JwtScenario>([
      {
        kind: "convention",
        payload: {
          applicationId: existingConvention.id,
          role: "validator",
          version: 1,
          iat: new Date().getTime() / 1000,
          exp: new Date().getTime() / 1000 + 1000,
          emailHash: "my-hash",
        },
      },
      {
        kind: "backOffice",
        payload: {
          sub: "Rodrigo",
          role: "backOffice",
          version: 1,
          iat: new Date().getTime() / 1000,
          exp: new Date().getTime() / 1000 + 1000,
        },
      },
      {
        kind: "inclusionConnect",
        payload: {
          userId: inclusionConnectedUser.id,
          version: 1,
          iat: new Date().getTime() / 1000,
          exp: new Date().getTime() / 1000 + 1000,
        },
      },
    ])("200 - Renew a convention with '$kind' jwt", async (scenario) => {
      const existingConvention = new ConventionDtoBuilder()
        .withStatus("ACCEPTED_BY_VALIDATOR")
        .build();
      inMemoryUow.conventionRepository.setConventions({
        [existingConvention.id]: existingConvention,
      });

      if (scenario.kind === "inclusionConnect")
        inMemoryUow.inclusionConnectedUserRepository.setInclusionConnectedUsers(
          [inclusionConnectedUser],
        );

      const renewedConventionStartDate = addDays(
        new Date(existingConvention.dateEnd),
        1,
      );
      const renewedConventionEndDate = addDays(renewedConventionStartDate, 5);
      const renewedConventionParams: RenewConventionParams = {
        id: "22222222-2222-4222-2222-222222222222",
        dateStart: renewedConventionStartDate.toISOString(),
        dateEnd: renewedConventionEndDate.toISOString(),
        schedule: new ScheduleDtoBuilder()
          .withReasonableScheduleInInterval({
            start: renewedConventionStartDate,
            end: renewedConventionEndDate,
          })
          .build(),
        renewed: {
          from: existingConvention.id,
          justification: "Il faut bien...",
        },
      };

      const jwtGeneratorByKind = {
        convention: generateConventionJwt,
        backOffice: generateBackOfficeJwt,
        inclusionConnect: generateInclusionConnectJwt,
      };

      const jwtGeneratorByKind = ({ kind, payload }: JwtScenario) => {
        if (kind === "backOffice") return generateBackOfficeJwt(payload);
        if (kind === "convention") return generateConventionJwt(payload);
        return generateInclusionConnectJwt(payload);
      };

      const response = await sharedRequest.renewConvention({
        body: renewedConventionParams,
        headers: {
          // authorization: jwtGeneratorByKind[kind](payload),
          authorization: jwtGeneratorByKind(scenario),
        },
      });

      expectHttpResponseToEqual(response, {
        body: "",
        status: 200,
      });

      expectToEqual(inMemoryUow.conventionRepository.conventions, [
        existingConvention,
        {
          ...existingConvention,
          ...renewedConventionParams,
          signatories: {
            beneficiary: {
              ...existingConvention.signatories.beneficiary,
              signedAt: undefined,
            },
            establishmentRepresentative: {
              ...existingConvention.signatories.establishmentRepresentative,
              signedAt: undefined,
            },
          },
          status: "READY_TO_SIGN",
        },
      ]);
    });

    it("400 - Fails if no convention magic link token is provided", async () => {
      const response = await sharedRequest.renewConvention({
        body: renewedConventionParams,
        headers: {} as { authorization: InclusionConnectJwt },
      });

      expectHttpResponseToEqual(response, {
        body: {
          issues: ["authorization : Required"],
          message:
            "Shared-route schema 'headersSchema' was not respected in adapter 'express'.\nRoute: POST /auth/renew-convention",
          status: 400,
        },
        status: 400,
      });
    });

    it("400 - Fails if original convention is not ACCEPTED_BY_VALIDATOR", async () => {
      const response = await sharedRequest.renewConvention({
        body: renewedConventionParams,
        headers: {
          authorization: createTokenForRole({
            role: "counsellor",
            conventionId: existingConvention.id,
          }),
        },
      });

      expectHttpResponseToEqual(response, {
        body: {
          errors:
            "This convention cannot be renewed, as it has status : 'DRAFT'",
        },
        status: 400,
      });
    });

    it("403 - Fails if provided token does not have enough privileges", async () => {
      const response = await sharedRequest.renewConvention({
        body: renewedConventionParams,
        headers: {
          authorization: createTokenForRole({
            role: "beneficiary",
            conventionId: existingConvention.id,
          }),
        },
      });

      expectHttpResponseToEqual(response, {
        body: {
          errors: "The role 'beneficiary' is not allowed to renew convention",
        },
        status: 403,
      });
    });
  });

  describe("POST /auth/sign-application/:conventionId", () => {
    const convention = new ConventionDtoBuilder()
      .withStatus("READY_TO_SIGN")
      .notSigned()
      .build();

    it("200 - can sign with inclusion connected user (same email as establishement representative in convention)", async () => {
      const icUser: InclusionConnectedUser = {
        agencyRights: [],
        email: convention.signatories.establishmentRepresentative.email,
        firstName: "",
        lastName: "",
        id: "1",
      };

      inMemoryUow.inclusionConnectedUserRepository.setInclusionConnectedUsers([
        icUser,
      ]);
      inMemoryUow.conventionRepository.setConventions({
        [convention.id]: convention,
      });

      const response = await sharedRequest.signConvention({
        urlParams: { conventionId: convention.id },
        headers: {
          authorization: generateInclusionConnectJwt({
            userId: icUser.id,
            version: 1,
          }),
        },
      });
      expectHttpResponseToEqual(response, {
        status: 200,
        body: {
          id: convention.id,
        },
      });
    });

    it("403 - cannot sign with inclusion connected user (icUser email != convention establishment representative email)", async () => {
      const icUser: InclusionConnectedUser = {
        agencyRights: [],
        email: "email@mail.com",
        firstName: "",
        lastName: "",
        id: "1",
      };

      inMemoryUow.inclusionConnectedUserRepository.setInclusionConnectedUsers([
        icUser,
      ]);
      inMemoryUow.conventionRepository.setConventions({
        [convention.id]: convention,
      });

      const response = await sharedRequest.signConvention({
        urlParams: { conventionId: convention.id },
        headers: {
          authorization: generateInclusionConnectJwt({
            userId: icUser.id,
            version: 1,
          }),
        },
      });

      expectHttpResponseToEqual(response, {
        status: 403,
        body: {
          errors:
            "Only Beneficiary, his current employer, his legal representative or the establishment representative are allowed to sign convention",
        },
      });
    });
  });
});
