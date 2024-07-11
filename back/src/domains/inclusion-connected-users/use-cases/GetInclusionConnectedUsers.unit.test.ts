import {
  AgencyDtoBuilder,
  InclusionConnectedUser,
  errorMessages,
  expectPromiseToFailWithError,
  expectToEqual,
} from "shared";
import {
  ForbiddenError,
  UnauthorizedError,
} from "../../../config/helpers/httpErrors";
import { InMemoryInclusionConnectedUserRepository } from "../../core/authentication/inclusion-connect/adapters/InMemoryInclusionConnectedUserRepository";
import { InMemoryUowPerformer } from "../../core/unit-of-work/adapters/InMemoryUowPerformer";
import { createInMemoryUow } from "../../core/unit-of-work/adapters/createInMemoryUow";
import { GetInclusionConnectedUsers } from "./GetInclusionConnectedUsers";

const agency1 = new AgencyDtoBuilder().withId("agency-1").build();
const agency2 = new AgencyDtoBuilder().withId("agency-2").build();

const johnWithAgenciesToReview: InclusionConnectedUser = {
  id: "john-123",
  email: "john@mail.com",
  firstName: "John",
  lastName: "Lennon",
  createdAt: new Date().toISOString(),
  agencyRights: [
    { agency: agency1, roles: ["toReview"], isNotifiedByEmail: false },
    { agency: agency2, roles: ["validator"], isNotifiedByEmail: false },
  ],
  dashboards: {
    agencies: {},
    establishments: {},
  },
  externalId: "john-external-id",
};

const paulWithAllAgenciesReviewed: InclusionConnectedUser = {
  id: "paul-456",
  email: "paul@mail.com",
  firstName: "Paul",
  lastName: "McCartney",
  createdAt: new Date().toISOString(),
  agencyRights: [
    { agency: agency1, roles: ["counsellor"], isNotifiedByEmail: false },
    { agency: agency2, roles: ["validator"], isNotifiedByEmail: false },
  ],
  dashboards: {
    agencies: {},
    establishments: {},
  },
  externalId: "paul-external-id",
};

const backofficeAdminUser: InclusionConnectedUser = {
  id: "backoffice-admin",
  email: "jack.admin@mail.com",
  firstName: "Jack",
  lastName: "The Admin",
  externalId: "jack-admin-external-id",
  createdAt: new Date().toISOString(),
  isBackofficeAdmin: true,
  agencyRights: [],
  dashboards: { agencies: {}, establishments: {} },
  establishments: [],
};

const notBackofficeAdminUser: InclusionConnectedUser = {
  ...backofficeAdminUser,
  isBackofficeAdmin: false,
  id: "not-backoffice-admin",
};

describe("GetInclusionConnectedUsers", () => {
  let getInclusionConnectedUsers: GetInclusionConnectedUsers;
  let uowPerformer: InMemoryUowPerformer;
  let inclusionConnectedUserRepository: InMemoryInclusionConnectedUserRepository;

  beforeEach(() => {
    const uow = createInMemoryUow();
    inclusionConnectedUserRepository = uow.inclusionConnectedUserRepository;
    uowPerformer = new InMemoryUowPerformer(uow);
    getInclusionConnectedUsers = new GetInclusionConnectedUsers(uowPerformer);
  });

  it("throws Unauthorized if no jwt token provided", async () => {
    await expectPromiseToFailWithError(
      getInclusionConnectedUsers.execute({ agencyRole: "toReview" }),
      new UnauthorizedError(),
    );
  });

  it("throws Forbidden if token payload is not backoffice token", async () => {
    inclusionConnectedUserRepository.setInclusionConnectedUsers([
      notBackofficeAdminUser,
    ]);

    await expectPromiseToFailWithError(
      getInclusionConnectedUsers.execute(
        { agencyRole: "toReview" },
        notBackofficeAdminUser,
      ),
      new ForbiddenError(
        errorMessages.user.forbidden({ userId: notBackofficeAdminUser.id }),
      ),
    );
  });

  it("gets the users by agencyRole which have at least one agency with the given role", async () => {
    inclusionConnectedUserRepository.setInclusionConnectedUsers([
      johnWithAgenciesToReview,
      paulWithAllAgenciesReviewed,
      backofficeAdminUser,
    ]);
    const users = await getInclusionConnectedUsers.execute(
      { agencyRole: "toReview" },
      backofficeAdminUser,
    );

    expectToEqual(users, [johnWithAgenciesToReview]);
  });

  it("gets the users by agencyId which have at least one agency with the given role", async () => {
    inclusionConnectedUserRepository.setInclusionConnectedUsers([
      johnWithAgenciesToReview,
      paulWithAllAgenciesReviewed,
      backofficeAdminUser,
    ]);
    const users = await getInclusionConnectedUsers.execute(
      { agencyId: agency1.id },
      backofficeAdminUser,
    );

    expectToEqual(users, [
      johnWithAgenciesToReview,
      paulWithAllAgenciesReviewed,
    ]);
  });
});
