import {
  AgencyDtoBuilder,
  BackOfficeJwtPayload,
  ConventionDtoBuilder,
  ConventionJwtPayload,
  InclusionConnectDomainJwtPayload,
  InclusionConnectedUser,
  expectPromiseToFailWithError,
  expectToEqual,
} from "shared";
import {
  ForbiddenError,
  NotFoundError,
} from "../../../adapters/primary/helpers/httpErrors";
import { InMemoryUowPerformer } from "../../core/unit-of-work/adapters/InMemoryUowPerformer";
import {
  InMemoryUnitOfWork,
  createInMemoryUow,
} from "../../core/unit-of-work/adapters/createInMemoryUow";
import { GetConvention } from "./GetConvention";

describe("Get Convention", () => {
  const agency = new AgencyDtoBuilder().build();
  const convention = new ConventionDtoBuilder().withAgencyId(agency.id).build();
  let getConvention: GetConvention;
  let uow: InMemoryUnitOfWork;

  beforeEach(() => {
    uow = createInMemoryUow();
    getConvention = new GetConvention(new InMemoryUowPerformer(uow));
  });

  describe("Wrong paths", () => {
    describe("Forbidden error", () => {
      it("When no auth payload provided", async () => {
        await expectPromiseToFailWithError(
          getConvention.execute({ conventionId: convention.id }),
          new ForbiddenError("No auth payload provided"),
        );
      });

      it("When convention id in jwt token does not match provided one", async () => {
        await expectPromiseToFailWithError(
          getConvention.execute(
            { conventionId: convention.id },
            {
              role: "establishment-representative",
              applicationId: "not-matching-convention-id",
              emailHash: "",
            },
          ),
          new ForbiddenError(
            `This token is not allowed to access convention with id ${convention.id}. Role was 'establishment-representative'`,
          ),
        );
      });

      it("When the user don't have correct role on inclusion connected users", async () => {
        const user: InclusionConnectedUser = {
          id: "my-user-id",
          email: "my-user@email.com",
          firstName: "John",
          lastName: "Doe",
          agencyRights: [{ role: "toReview", agency }],
          establishmentDashboards: {},
          externalId: "john-external-id",
        };
        uow.inclusionConnectedUserRepository.setInclusionConnectedUsers([user]);
        uow.agencyRepository.setAgencies([agency]);
        uow.conventionRepository.setConventions([convention]);

        await expectPromiseToFailWithError(
          getConvention.execute(
            { conventionId: convention.id },
            { userId: "my-user-id" },
          ),
          new ForbiddenError(
            `User with id 'my-user-id' is not allowed to access convention with id '${convention.id}'`,
          ),
        );
      });
    });

    describe("Not found error", () => {
      it("When the Convention does not exist", async () => {
        await expectPromiseToFailWithError(
          getConvention.execute(
            { conventionId: convention.id },
            {
              role: "establishment-representative",
              applicationId: convention.id,
              emailHash: "",
            },
          ),
          new NotFoundError(`No convention found with id ${convention.id}`),
        );
      });

      it("When if user is not on inclusion connected users", async () => {
        uow.agencyRepository.setAgencies([agency]);
        uow.conventionRepository.setConventions([convention]);
        const userId = "my-user-id";

        await expectPromiseToFailWithError(
          getConvention.execute({ conventionId: convention.id }, { userId }),
          new NotFoundError(`No user found with id '${userId}'`),
        );
      });
    });
  });

  describe("Right paths", () => {
    beforeEach(() => {
      uow.agencyRepository.setAgencies([agency]);
      uow.conventionRepository.setConventions([convention]);
    });

    describe("Inclusion connected user", () => {
      it("that have agency rights", async () => {
        const user: InclusionConnectedUser = {
          id: "my-user-id",
          email: "my-user@email.com",
          firstName: "John",
          lastName: "Doe",
          agencyRights: [{ role: "validator", agency }],
          establishmentDashboards: {},
          externalId: "john-external-id",
        };
        uow.inclusionConnectedUserRepository.setInclusionConnectedUsers([user]);
        const jwtPayload: InclusionConnectDomainJwtPayload = {
          userId: "my-user-id",
        };

        const fetchedConvention = await getConvention.execute(
          { conventionId: convention.id },
          jwtPayload,
        );
        expectToEqual(fetchedConvention, {
          ...convention,
          agencyName: agency.name,
          agencyDepartment: agency.address.departmentCode,
          agencyKind: agency.kind,
          agencySiret: agency.agencySiret,
          agencyCounsellorEmails: agency.counsellorEmails,
          agencyValidatorEmails: agency.validatorEmails,
        });
      });

      it("that establishment rep is also the inclusion connected user", async () => {
        const user: InclusionConnectedUser = {
          id: "my-user-id",
          email: convention.signatories.establishmentRepresentative.email,
          firstName: "John",
          lastName: "Doe",
          agencyRights: [],
          establishmentDashboards: {},
          externalId: "john-external-id",
        };
        uow.inclusionConnectedUserRepository.setInclusionConnectedUsers([user]);

        const jwtPayload: InclusionConnectDomainJwtPayload = {
          userId: user.id,
        };

        const fetchedConvention = await getConvention.execute(
          { conventionId: convention.id },
          jwtPayload,
        );

        expectToEqual(fetchedConvention, {
          ...convention,
          agencyName: agency.name,
          agencyDepartment: agency.address.departmentCode,
          agencyKind: agency.kind,
          agencySiret: agency.agencySiret,
          agencyCounsellorEmails: agency.counsellorEmails,
          agencyValidatorEmails: agency.validatorEmails,
        });
      });
    });

    it("with ConventionJwtPayload", async () => {
      const payload: ConventionJwtPayload = {
        role: "establishment-representative",
        emailHash: "",
        applicationId: convention.id,
        iat: 1,
        version: 1,
      };

      const conventionResult = await getConvention.execute(
        { conventionId: convention.id },
        payload,
      );

      expectToEqual(conventionResult, {
        ...convention,
        agencyName: agency.name,
        agencyDepartment: agency.address.departmentCode,
        agencyKind: agency.kind,
        agencySiret: agency.agencySiret,
        agencyCounsellorEmails: agency.counsellorEmails,
        agencyValidatorEmails: agency.validatorEmails,
      });
    });

    it("with BackOfficeJwtPayload", async () => {
      const payload: BackOfficeJwtPayload = {
        role: "backOffice",
        sub: "",
        iat: 1,
        version: 1,
      };

      const conventionResult = await getConvention.execute(
        { conventionId: convention.id },
        payload,
      );

      expectToEqual(conventionResult, {
        ...convention,
        agencyName: agency.name,
        agencyDepartment: agency.address.departmentCode,
        agencyKind: agency.kind,
        agencySiret: agency.agencySiret,
        agencyCounsellorEmails: agency.counsellorEmails,
        agencyValidatorEmails: agency.validatorEmails,
      });
    });
  });
});
