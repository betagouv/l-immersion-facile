import {
  AgencyDtoBuilder,
  InclusionConnectedUserBuilder,
  User,
  UserParamsForAgency,
  errors,
  expectPromiseToFailWithError,
  expectToEqual,
  toAgencyDtoForAgencyUsersAndAdmins,
} from "shared";
import { toAgencyWithRights } from "../../../utils/agency";
import { emptyName } from "../../core/authentication/inclusion-connect/entities/user.helper";
import { StubDashboardGateway } from "../../core/dashboard/adapters/StubDashboardGateway";
import {
  CreateNewEvent,
  makeCreateNewEvent,
} from "../../core/events/ports/EventBus";
import { CustomTimeGateway } from "../../core/time-gateway/adapters/CustomTimeGateway";
import { TimeGateway } from "../../core/time-gateway/ports/TimeGateway";
import { InMemoryUowPerformer } from "../../core/unit-of-work/adapters/InMemoryUowPerformer";
import {
  InMemoryUnitOfWork,
  createInMemoryUow,
} from "../../core/unit-of-work/adapters/createInMemoryUow";
import { TestUuidGenerator } from "../../core/uuid-generator/adapters/UuidGeneratorImplementations";
import { UuidGenerator } from "../../core/uuid-generator/ports/UuidGenerator";
import {
  CreateUserForAgency,
  makeCreateUserForAgency,
} from "./CreateUserForAgency";

describe("CreateUserForAgency", () => {
  const counsellor = new InclusionConnectedUserBuilder()
    .withId("counsellor")
    .withEmail("counsellor@mail.com")
    .buildUser();

  const agencyWithCounsellor = new AgencyDtoBuilder().build();

  const icBackofficeAdminUserBuilder = new InclusionConnectedUserBuilder()
    .withId("backoffice-admin-id")
    .withIsAdmin(true);
  const icBackofficeAdminUser = icBackofficeAdminUserBuilder.build();
  const backofficeAdminUser = icBackofficeAdminUserBuilder.buildUser();

  const icNotAdminUserBuilder = new InclusionConnectedUserBuilder()
    .withId("not-admin-id")
    .withIsAdmin(false);
  const icNotAdminUser = icNotAdminUserBuilder.build();
  const notAdminUser = icNotAdminUserBuilder.buildUser();

  const icNotAgencyAdminUserBuilder = new InclusionConnectedUserBuilder()
    .withId("not-agency-admin-id")
    .withIsAdmin(false);
  const icNotAgencyAdminUser = icNotAgencyAdminUserBuilder.build();

  const icAgencyAdminUserBuilder = new InclusionConnectedUserBuilder()
    .withId("agency-admin-id")
    .withIsAdmin(false)
    .withAgencyRights([
      {
        agency: toAgencyDtoForAgencyUsersAndAdmins(agencyWithCounsellor, []),
        roles: ["agency-admin"],
        isNotifiedByEmail: true,
      },
    ]);
  const icAgencyAdminUser = icAgencyAdminUserBuilder.build();

  let uow: InMemoryUnitOfWork;
  let createUserForAgency: CreateUserForAgency;
  let timeGateway: TimeGateway;
  let uuidGenerator: UuidGenerator;
  let createNewEvent: CreateNewEvent;

  beforeEach(() => {
    uow = createInMemoryUow();
    timeGateway = new CustomTimeGateway();
    uuidGenerator = new TestUuidGenerator();
    createNewEvent = makeCreateNewEvent({
      uuidGenerator,
      timeGateway,
    });
    createUserForAgency = makeCreateUserForAgency({
      uowPerformer: new InMemoryUowPerformer(uow),
      deps: {
        timeGateway,
        createNewEvent,
        dashboardGateway: new StubDashboardGateway(),
      },
    });
    uow.agencyRepository.agencies = [
      toAgencyWithRights(agencyWithCounsellor, {
        [counsellor.id]: { isNotifiedByEmail: false, roles: ["counsellor"] },
      }),
    ];
    uow.userRepository.users = [icBackofficeAdminUser, notAdminUser];
  });

  it("throws Forbidden if token payload is not backoffice token", async () => {
    await expectPromiseToFailWithError(
      createUserForAgency.execute(
        {
          userId: uuidGenerator.new(),
          roles: ["counsellor"],
          agencyId: "agency-1",
          isNotifiedByEmail: true,
          email: "any@email.fr",
        },
        icNotAdminUser,
      ),
      errors.user.forbidden({ userId: icNotAdminUser.id }),
    );
  });

  it("throws Forbidden if token payload is not admin on agency", async () => {
    await expectPromiseToFailWithError(
      createUserForAgency.execute(
        {
          userId: uuidGenerator.new(),
          roles: ["counsellor"],
          agencyId: "agency-1",
          isNotifiedByEmail: true,
          email: "any@email.fr",
        },
        icNotAgencyAdminUser,
      ),
      errors.user.forbidden({ userId: icNotAgencyAdminUser.id }),
    );
  });

  it("throws not found if agency does not exist", async () => {
    uow.userRepository.users = [backofficeAdminUser, icNotAdminUser];

    const agencyId = "Fake-Agency-Id";

    await expectPromiseToFailWithError(
      createUserForAgency.execute(
        {
          userId: uuidGenerator.new(),
          roles: ["counsellor"],
          agencyId,
          isNotifiedByEmail: true,
          email: "notAdminUser@email.fr",
        },
        icBackofficeAdminUser,
      ),
      errors.agency.notFound({
        agencyId,
      }),
    );
  });

  describe("Agency with refers to agency", () => {
    const agencyWithRefersTo = new AgencyDtoBuilder()
      .withId("agency-with-refers-to")
      .withRefersToAgencyInfo({
        refersToAgencyId: agencyWithCounsellor.id,
        refersToAgencyName: agencyWithCounsellor.name,
      })
      .build();

    it("Throw when user have role validator", async () => {
      uow.agencyRepository.agencies = [
        toAgencyWithRights(agencyWithRefersTo, {
          [counsellor.id]: { isNotifiedByEmail: false, roles: ["counsellor"] },
        }),
        toAgencyWithRights(agencyWithCounsellor, {
          [counsellor.id]: { isNotifiedByEmail: false, roles: ["counsellor"] },
        }),
      ];

      expectPromiseToFailWithError(
        createUserForAgency.execute(
          {
            userId: uuidGenerator.new(),
            agencyId: agencyWithRefersTo.id,
            roles: ["validator"],
            isNotifiedByEmail: true,
            email: "new-user@email.fr",
          },
          icBackofficeAdminUser,
        ),
        errors.agency.invalidRoleUpdateForAgencyWithRefersTo({
          agencyId: agencyWithRefersTo.id,
          role: "validator",
        }),
      );
    });
  });

  it.each([
    {
      triggeredByRole: "backoffice-admin",
      triggeredByUser: icBackofficeAdminUser,
    },
    {
      triggeredByRole: "agency-admin",
      triggeredByUser: icAgencyAdminUser,
    },
  ])(
    "$triggeredByRole can create new user with its agency rights if no other users exist by email",
    async ({ triggeredByUser }) => {
      const newUserId = uuidGenerator.new();
      uow.userRepository.users = [counsellor];

      const icUserForAgency: UserParamsForAgency = {
        userId: newUserId,
        agencyId: agencyWithCounsellor.id,
        roles: ["counsellor"],
        isNotifiedByEmail: false,
        email: "new-user@email.fr",
      };

      await createUserForAgency.execute(icUserForAgency, triggeredByUser);

      expectToEqual(uow.userRepository.users, [
        counsellor,
        {
          id: icUserForAgency.userId,
          email: icUserForAgency.email,
          createdAt: timeGateway.now().toISOString(),
          firstName: emptyName,
          lastName: emptyName,
          externalId: null,
        },
      ]);
      expectToEqual(uow.agencyRepository.agencies, [
        toAgencyWithRights(agencyWithCounsellor, {
          [newUserId]: { isNotifiedByEmail: false, roles: ["counsellor"] },
          [counsellor.id]: {
            isNotifiedByEmail: false,
            roles: ["counsellor"],
          },
        }),
      ]);

      expectToEqual(uow.outboxRepository.events, [
        createNewEvent({
          topic: "IcUserAgencyRightChanged",
          payload: {
            agencyId: icUserForAgency.agencyId,
            userId: icUserForAgency.userId,
            triggeredBy: {
              kind: "inclusion-connected",
              userId: triggeredByUser.id,
            },
          },
        }),
      ]);
    },
  );

  it.each([
    {
      triggeredByRole: "backoffice-admin",
      triggeredByUser: icBackofficeAdminUser,
    },
    {
      triggeredByRole: "agency-admin",
      triggeredByUser: icAgencyAdminUser,
    },
  ])(
    "$triggeredByRole can add agency rights to an existing user",
    async ({ triggeredByUser }) => {
      const validator: User = {
        id: "validator",
        email: "user@email.fr",
        firstName: "John",
        lastName: "Doe",
        externalId: null,
        createdAt: timeGateway.now().toISOString(),
      };
      uow.userRepository.users = [validator, counsellor, icAgencyAdminUser];

      const anotherAgency = new AgencyDtoBuilder()
        .withId("another-agency-id")
        .build();
      uow.agencyRepository.agencies = [
        toAgencyWithRights(agencyWithCounsellor, {
          [icAgencyAdminUser.id]: {
            isNotifiedByEmail: false,
            roles: ["agency-admin"],
          },
        }),
        toAgencyWithRights(anotherAgency, {
          [counsellor.id]: { isNotifiedByEmail: false, roles: ["counsellor"] },
          [validator.id]: { isNotifiedByEmail: true, roles: ["validator"] },
        }),
      ];

      const icUserForAgency: UserParamsForAgency = {
        userId: validator.id,
        agencyId: agencyWithCounsellor.id,
        roles: ["counsellor"],
        isNotifiedByEmail: false,
        email: validator.email,
      };

      await createUserForAgency.execute(icUserForAgency, triggeredByUser);

      expectToEqual(uow.agencyRepository.agencies, [
        toAgencyWithRights(agencyWithCounsellor, {
          [icAgencyAdminUser.id]: {
            isNotifiedByEmail: false,
            roles: ["agency-admin"],
          },
          [validator.id]: {
            isNotifiedByEmail: icUserForAgency.isNotifiedByEmail,
            roles: icUserForAgency.roles,
          },
        }),
        toAgencyWithRights(anotherAgency, {
          [counsellor.id]: { isNotifiedByEmail: false, roles: ["counsellor"] },
          [validator.id]: { isNotifiedByEmail: true, roles: ["validator"] },
        }),
      ]);
      expectToEqual(uow.outboxRepository.events, [
        createNewEvent({
          topic: "IcUserAgencyRightChanged",
          payload: {
            agencyId: agencyWithCounsellor.id,
            userId: validator.id,
            triggeredBy: {
              kind: "inclusion-connected",
              userId: triggeredByUser.id,
            },
          },
        }),
      ]);
    },
  );

  it("throw if user already exist in agency", async () => {
    const validator: User = {
      id: "validator",
      email: "user@email.fr",
      firstName: "John",
      lastName: "Doe",
      externalId: null,
      createdAt: timeGateway.now().toISOString(),
    };
    uow.userRepository.users = [validator, counsellor];

    uow.agencyRepository.agencies = [
      toAgencyWithRights(agencyWithCounsellor, {
        [counsellor.id]: { isNotifiedByEmail: false, roles: ["counsellor"] },
        [validator.id]: { isNotifiedByEmail: true, roles: ["validator"] },
      }),
    ];

    const icUserForAgency: UserParamsForAgency = {
      userId: validator.id,
      agencyId: agencyWithCounsellor.id,
      roles: ["counsellor"],
      isNotifiedByEmail: false,
      email: validator.email,
    };

    await expectPromiseToFailWithError(
      createUserForAgency.execute(icUserForAgency, icBackofficeAdminUser),
      errors.agency.userAlreadyExist(),
    );
  });
});
