import {
  AgencyDtoBuilder,
  AgencyRight,
  AgencyRole,
  IcUserRoleForAgencyParams,
  InclusionConnectedUser,
  InclusionConnectedUserBuilder,
  errors,
  expectPromiseToFailWithError,
  expectToEqual,
} from "shared";
import { InMemoryInclusionConnectedUserRepository } from "../../core/authentication/inclusion-connect/adapters/InMemoryInclusionConnectedUserRepository";
import { InMemoryOutboxRepository } from "../../core/events/adapters/InMemoryOutboxRepository";
import {
  CreateNewEvent,
  makeCreateNewEvent,
} from "../../core/events/ports/EventBus";
import { CustomTimeGateway } from "../../core/time-gateway/adapters/CustomTimeGateway";
import { InMemoryUowPerformer } from "../../core/unit-of-work/adapters/InMemoryUowPerformer";
import { createInMemoryUow } from "../../core/unit-of-work/adapters/createInMemoryUow";
import { TestUuidGenerator } from "../../core/uuid-generator/adapters/UuidGeneratorImplementations";
import { UpdateIcUserRoleForAgency } from "./UpdateIcUserRoleForAgency";

const backofficeAdminUser = new InclusionConnectedUserBuilder()
  .withId("backoffice-admin-id")
  .withIsAdmin(true)
  .build();

const notAdminUser = new InclusionConnectedUserBuilder()
  .withId("not-admin-id")
  .withIsAdmin(false)
  .build();

describe("GetInclusionConnectedUsers", () => {
  let updateIcUserRoleForAgency: UpdateIcUserRoleForAgency;
  let uowPerformer: InMemoryUowPerformer;
  let inclusionConnectedUserRepository: InMemoryInclusionConnectedUserRepository;
  let timeGateway: CustomTimeGateway;
  let outboxRepo: InMemoryOutboxRepository;
  let createNewEvent: CreateNewEvent;

  beforeEach(() => {
    const uow = createInMemoryUow();

    outboxRepo = uow.outboxRepository;

    timeGateway = new CustomTimeGateway();

    createNewEvent = makeCreateNewEvent({
      timeGateway,
      uuidGenerator: new TestUuidGenerator(),
    });

    inclusionConnectedUserRepository = uow.inclusionConnectedUserRepository;
    uowPerformer = new InMemoryUowPerformer(uow);

    inclusionConnectedUserRepository.setInclusionConnectedUsers([
      backofficeAdminUser,
      notAdminUser,
    ]);
    updateIcUserRoleForAgency = new UpdateIcUserRoleForAgency(
      uowPerformer,
      createNewEvent,
    );
  });

  it("throws Forbidden if no jwt token provided", async () => {
    await expectPromiseToFailWithError(
      updateIcUserRoleForAgency.execute({
        roles: ["counsellor"],
        agencyId: "agency-1",
        userId: notAdminUser.id,
      }),
      errors.user.unauthorized(),
    );
  });

  it("throws Forbidden if token payload is not backoffice token", async () => {
    await expectPromiseToFailWithError(
      updateIcUserRoleForAgency.execute(
        { roles: ["counsellor"], agencyId: "agency-1", userId: "john-123" },
        notAdminUser,
      ),
      errors.user.forbidden({ userId: notAdminUser.id }),
    );
  });

  it("throws not found if agency does not exist for user", async () => {
    inclusionConnectedUserRepository.setInclusionConnectedUsers([
      backofficeAdminUser,
      {
        ...notAdminUser,
        agencyRights: [],
        dashboards: {
          agencies: {},
          establishments: {},
        },
      },
    ]);

    const agencyId = "agency-1";
    await expectPromiseToFailWithError(
      updateIcUserRoleForAgency.execute(
        {
          roles: ["counsellor"],
          agencyId,
          userId: notAdminUser.id,
        },
        backofficeAdminUser,
      ),
      errors.user.noRightsOnAgency({
        agencyId,
        userId: notAdminUser.id,
      }),
    );
  });

  it("changes the role of a user for a given agency", async () => {
    const agency = new AgencyDtoBuilder().build();
    const icUser: InclusionConnectedUser = {
      ...notAdminUser,
      agencyRights: [{ agency, roles: ["toReview"], isNotifiedByEmail: false }],
      dashboards: {
        agencies: {},
        establishments: {},
      },
    };

    inclusionConnectedUserRepository.setInclusionConnectedUsers([
      backofficeAdminUser,
      icUser,
    ]);
    const newRole: AgencyRole = "validator";

    await updateIcUserRoleForAgency.execute(
      {
        roles: [newRole],
        agencyId: agency.id,
        userId: notAdminUser.id,
      },
      backofficeAdminUser,
    );

    expectToEqual(
      await inclusionConnectedUserRepository.getById(notAdminUser.id),
      {
        ...notAdminUser,
        agencyRights: [{ agency, roles: [newRole], isNotifiedByEmail: false }],
        dashboards: {
          agencies: {},
          establishments: {},
        },
      },
    );
  });

  it("should save IcUserAgencyRightChanged event when successful", async () => {
    const agency = new AgencyDtoBuilder().build();
    const icUser: InclusionConnectedUser = {
      ...notAdminUser,
      agencyRights: [{ agency, roles: ["toReview"], isNotifiedByEmail: false }],
      dashboards: {
        agencies: {},
        establishments: {},
      },
    };

    inclusionConnectedUserRepository.setInclusionConnectedUsers([
      backofficeAdminUser,
      icUser,
    ]);
    const newRole: AgencyRole = "validator";
    const icUserRoleForAgency: IcUserRoleForAgencyParams = {
      userId: notAdminUser.id,
      agencyId: agency.id,
      roles: [newRole],
    };
    await updateIcUserRoleForAgency.execute(
      icUserRoleForAgency,
      backofficeAdminUser,
    );

    expect(outboxRepo.events).toHaveLength(1);

    expectToEqual(
      outboxRepo.events[0],
      createNewEvent({
        topic: "IcUserAgencyRightChanged",
        payload: {
          ...icUserRoleForAgency,
          triggeredBy: {
            kind: "inclusion-connected",
            userId: backofficeAdminUser.id,
          },
        },
      }),
    );
  });

  it("can change to more than one role", async () => {
    const agency = new AgencyDtoBuilder().build();
    const icUser: InclusionConnectedUser = {
      ...notAdminUser,
      agencyRights: [{ agency, roles: ["toReview"], isNotifiedByEmail: false }],
      dashboards: {
        agencies: {},
        establishments: {},
      },
    };

    inclusionConnectedUserRepository.setInclusionConnectedUsers([
      backofficeAdminUser,
      icUser,
    ]);

    const icUserRoleForAgency: IcUserRoleForAgencyParams = {
      roles: ["counsellor", "validator", "agencyOwner"],
      agencyId: agency.id,
      userId: notAdminUser.id,
    };

    await updateIcUserRoleForAgency.execute(
      icUserRoleForAgency,
      backofficeAdminUser,
    );

    expectToEqual(
      await inclusionConnectedUserRepository.getById(notAdminUser.id),
      {
        ...notAdminUser,
        agencyRights: [
          {
            agency,
            roles: icUserRoleForAgency.roles,
            isNotifiedByEmail: false,
          },
        ],
        dashboards: {
          agencies: {},
          establishments: {},
        },
      },
    );

    expect(outboxRepo.events).toHaveLength(1);

    expectToEqual(
      outboxRepo.events[0],
      createNewEvent({
        topic: "IcUserAgencyRightChanged",
        payload: {
          ...icUserRoleForAgency,
          triggeredBy: {
            kind: "inclusion-connected",
            userId: backofficeAdminUser.id,
          },
        },
      }),
    );
  });
  it("cannot remove the last validator of an agency", async () => {
    const agency = new AgencyDtoBuilder().build();
    const agencyRight: AgencyRight = {
      agency,
      roles: ["validator"],
      isNotifiedByEmail: false,
    };

    const icUser: InclusionConnectedUser = {
      ...notAdminUser,
      agencyRights: [agencyRight],
      dashboards: {
        agencies: {},
        establishments: {},
      },
    };

    inclusionConnectedUserRepository.setInclusionConnectedUsers([
      backofficeAdminUser,
      icUser,
    ]);

    await expectPromiseToFailWithError(
      updateIcUserRoleForAgency.execute(
        { agencyId: agency.id, roles: ["counsellor"], userId: icUser.id },
        backofficeAdminUser,
      ),
      errors.agency.notEnoughValidators({ agencyId: agency.id }),
    );
  });
});
