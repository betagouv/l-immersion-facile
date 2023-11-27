import { addDays } from "date-fns";
import { SuperTest, Test } from "supertest";
import {
  AgencyDtoBuilder,
  ConventionDtoBuilder,
  ConventionId,
  conventionMagicLinkRoutes,
  expectToEqual,
  InclusionConnectedUser,
  RenewConventionParams,
  Role,
  ScheduleDtoBuilder,
} from "shared";
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
  let request: SuperTest<Test>;
  let generateBackOfficeJwt: GenerateBackOfficeJwt;
  let generateConventionJwt: GenerateConventionJwt;
  let generateInclusionConnectJwt: GenerateInclusionConnectJwt;
  let inMemoryUow: InMemoryUnitOfWork;

  beforeEach(async () => {
    ({
      request,
      generateBackOfficeJwt,
      generateConventionJwt,
      generateInclusionConnectJwt,
      inMemoryUow,
    } = await buildTestApp());
    const sharedRequest = createSupertestSharedClient(agencyRoutes, request);
    const initialConvention = conventionBuilder.build();
    inMemoryUow.conventionRepository.setConventions({
      [initialConvention.id]: initialConvention,
    });
  });

  describe("POST /auth/demande-immersion/:conventionId", () => {
    describe("when beneficiary asks for modification", () => {
      it("can update the convention", async () => {
        const updatedConvention = conventionBuilder
          .withBeneficiaryFirstName("Merguez")
          .withStatus("READY_TO_SIGN")
          .withStatusJustification("justif")
          .build();

        const backOfficeJwt = generateConventionJwt({
          ...payloadMeta,
          role: "beneficiary",
          emailHash: "my-hash",
          applicationId: updatedConvention.id,
        });
        const response = await request
          .post(
            conventionMagicLinkRoutes.updateConvention.url.replace(
              ":conventionId",
              updatedConvention.id,
            ),
          )
          .send({
            convention: updatedConvention,
          })
          .set({
            authorization: backOfficeJwt,
          });

        expectToEqual(response.body, { id: updatedConvention.id });
        expectToEqual(response.status, 200);
        expectToEqual(inMemoryUow.conventionRepository.conventions, [
          updatedConvention,
        ]);
      });
    });

    describe("when admin sends modification requests", () => {
      it("works fine", async () => {
        const updatedConvention = conventionBuilder
          .withBeneficiaryFirstName("Merguez")
          .withStatus("READY_TO_SIGN")
          .withStatusJustification("Justif")
          .build();

        const backOfficeJwt = generateBackOfficeJwt({
          ...payloadMeta,
          role: "backOffice",
          sub: "admin",
        });
        const response = await request
          .post(
            conventionMagicLinkRoutes.updateConvention.url.replace(
              ":conventionId",
              updatedConvention.id,
            ),
          )
          .send({
            convention: updatedConvention,
          })
          .set({
            authorization: backOfficeJwt,
          });

        expectToEqual(response.body, { id: updatedConvention.id });
        expectToEqual(response.status, 200);
        expectToEqual(inMemoryUow.conventionRepository.conventions, [
          updatedConvention,
        ]);
      });
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

    it("200 - Creates a convention with provided data and convention jwt", async () => {
      const existingConvention = new ConventionDtoBuilder()
        .withStatus("ACCEPTED_BY_VALIDATOR")
        .build();
      inMemoryUow.conventionRepository.setConventions({
        [existingConvention.id]: existingConvention,
      });
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
      const response = await request
        .post(conventionMagicLinkRoutes.renewConvention.url)
        .send(renewedConventionParams)
        .set({
          authorization: generateConventionJwt({
            applicationId: existingConvention.id,
            role: "validator",
            version: 1,
            iat: new Date().getTime() / 1000,
            exp: new Date().getTime() / 1000 + 1000,
            emailHash: "my-hash",
          }),
        });

      expectToEqual(response.body, "");
      expectToEqual(response.status, 200);
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

    it("200 - Creates a convention with provided data and backoffice jwt", async () => {
      const existingConvention = new ConventionDtoBuilder()
        .withStatus("ACCEPTED_BY_VALIDATOR")
        .build();
      inMemoryUow.conventionRepository.setConventions({
        [existingConvention.id]: existingConvention,
      });
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
      const response = await request
        .post(conventionMagicLinkRoutes.renewConvention.url)
        .send(renewedConventionParams)
        .set({
          authorization: generateBackOfficeJwt({
            sub: "Rodrigo",
            role: "backOffice",
            version: 1,
            iat: new Date().getTime() / 1000,
            exp: new Date().getTime() / 1000 + 1000,
          }),
        });

      expectToEqual(response.body, "");
      expectToEqual(response.status, 200);
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

    it("200 - Creates a convention with provided data and inclusion connected JWT", async () => {
      const agency = new AgencyDtoBuilder().build();
      const existingConvention = new ConventionDtoBuilder()
        .withStatus("ACCEPTED_BY_VALIDATOR")
        .withAgencyId(agency.id)
        .build();
      inMemoryUow.conventionRepository.setConventions({
        [existingConvention.id]: existingConvention,
      });

      const inclusionConnectedUser: InclusionConnectedUser = {
        id: "my-user-id",
        email: "my-user@email.com",
        firstName: "John",
        lastName: "Doe",
        agencyRights: [{ role: "validator", agency }],
      };

      inMemoryUow.inclusionConnectedUserRepository.setInclusionConnectedUsers([
        inclusionConnectedUser,
      ]);
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
      const response = await request
        .post(conventionMagicLinkRoutes.renewConvention.url)
        .send(renewedConventionParams)
        .set({
          authorization: generateInclusionConnectJwt({
            userId: inclusionConnectedUser.id,
            version: 1,
            iat: new Date().getTime() / 1000,
            exp: new Date().getTime() / 1000 + 1000,
          }),
        });

      expectToEqual(response.body, "");
      expectToEqual(response.status, 200);
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
      const response = await request
        .post(conventionMagicLinkRoutes.renewConvention.url)
        .send(renewedConventionParams);

      expectToEqual(response.body, {
        issues: ["authorization : Required"],
        message:
          "Shared-route schema 'headersSchema' was not respected in adapter 'express'.\nRoute: POST /auth/renew-convention",
        status: 400,
      });
      expectToEqual(response.status, 400);
    });

    it("400 - Fails if original convention is not ACCEPTED_BY_VALIDATOR", async () => {
      const response = await request
        .post(conventionMagicLinkRoutes.renewConvention.url)
        .send(renewedConventionParams)
        .set({
          authorization: createTokenForRole({
            role: "counsellor",
            conventionId: existingConvention.id,
          }),
        });

      expectToEqual(response.body, {
        errors: "This convention cannot be renewed, as it has status : 'DRAFT'",
      });
      expectToEqual(response.status, 400);
    });

    it("403 - Fails if provided token does not have enough privileges", async () => {
      const response = await request
        .post(conventionMagicLinkRoutes.renewConvention.url)
        .send(renewedConventionParams)
        .set({
          authorization: createTokenForRole({
            role: "beneficiary",
            conventionId: existingConvention.id,
          }),
        });

      expectToEqual(response.body, {
        errors: "The role 'beneficiary' is not allowed to renew convention",
      });
      expectToEqual(response.status, 403);
    });
  });

  describe("POST /auth/sign-application/:conventionId", () => {
    it("200 - can sign with inclusion connected user (same email as establishement representative in convention)", async () => {
      const convention = new ConventionDtoBuilder()
        .withStatus("READY_TO_SIGN")
        .notSigned()
        .build();
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

      const response = await request
        .post(`/auth/sign-application/${convention.id}`)
        .send()
        .set({
          authorization: generateInclusionConnectJwt({
            userId: icUser.id,
            version: 1,
          }),
        });
      expectToEqual(response.status, 200);
      expectToEqual(response.body, {
        id: "a99eaca1-ee70-4c90-b3f4-668d492f7392",
      });
    });

    it("403 - cannot sign with inclusion connected user (icUser email != convention establishment representative email)", async () => {
      const convention = new ConventionDtoBuilder()
        .withStatus("READY_TO_SIGN")
        .notSigned()
        .build();
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

      const response = await request
        .post(`/auth/sign-application/${convention.id}`)
        .send()
        .set({
          authorization: generateInclusionConnectJwt({
            userId: icUser.id,
            version: 1,
          }),
        });

      expectToEqual(response.status, 403);
      expectToEqual(response.body, {
        errors:
          "Only Beneficiary, his current employer, his legal representative or the establishment representative are allowed to sign convention",
      });
    });
  });
});
