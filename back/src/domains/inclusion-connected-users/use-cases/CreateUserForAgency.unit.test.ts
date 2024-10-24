import {
  AgencyDtoBuilder,
  InclusionConnectedUserBuilder,
  User,
  UserParamsForAgency,
  errors,
  expectPromiseToFailWithError,
  expectToEqual,
} from "shared";
import { toAgencyWithRights } from "../../../utils/agency";
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

  const counsellor = new InclusionConnectedUserBuilder()
    .withId("counsellor")
    .withEmail("counsellor@mail.com")
    .buildUser();

  const agencyWithCounsellor = new AgencyDtoBuilder().build();

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
      deps: { timeGateway, createNewEvent },
    });
    uow.agencyRepository.setAgencies([
      toAgencyWithRights(agencyWithCounsellor, {
        [counsellor.id]: { isNotifiedByEmail: false, roles: ["counsellor"] },
      }),
    ]);
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

  it("create new user with its agency rights if no other users exist by email", async () => {
    const newUserId = uuidGenerator.new();
    uow.userRepository.users = [counsellor];

    const icUserForAgency: UserParamsForAgency = {
      userId: newUserId,
      agencyId: agencyWithCounsellor.id,
      roles: ["counsellor"],
      isNotifiedByEmail: false,
      email: "new-user@email.fr",
    };

    await createUserForAgency.execute(icUserForAgency, icBackofficeAdminUser);

    expectToEqual(uow.userRepository.users, [
      counsellor,
      {
        id: icUserForAgency.userId,
        email: icUserForAgency.email,
        createdAt: timeGateway.now().toISOString(),
        firstName: "Non fourni",
        lastName: "Non fourni",
        externalId: null,
      },
    ]);
    expectToEqual(uow.agencyRepository.agencies, [
      toAgencyWithRights(agencyWithCounsellor, {
        [newUserId]: { isNotifiedByEmail: false, roles: ["counsellor"] },
        [counsellor.id]: { isNotifiedByEmail: false, roles: ["counsellor"] },
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
            userId: icBackofficeAdminUser.id,
          },
        },
      }),
    ]);
  });

  it("add agency rights to an existing user with same email", async () => {
    const validator: User = {
      id: "validator",
      email: "user@email.fr",
      firstName: "John",
      lastName: "Doe",
      externalId: null,
      createdAt: timeGateway.now().toISOString(),
    };
    uow.userRepository.users = [validator, counsellor];

    const anotherAgency = new AgencyDtoBuilder()
      .withId("another-agency-id")
      .build();
    uow.agencyRepository.agencies = [
      toAgencyWithRights(agencyWithCounsellor, {
        [counsellor.id]: { isNotifiedByEmail: false, roles: ["counsellor"] },
        [validator.id]: { isNotifiedByEmail: true, roles: ["validator"] },
      }),
      toAgencyWithRights(anotherAgency, {}),
    ];

    const icUserForAgency: UserParamsForAgency = {
      userId: validator.id,
      agencyId: anotherAgency.id,
      roles: ["counsellor"],
      isNotifiedByEmail: false,
      email: validator.email,
    };

    await createUserForAgency.execute(icUserForAgency, icBackofficeAdminUser);

    expectToEqual(uow.agencyRepository.agencies, [
      toAgencyWithRights(agencyWithCounsellor, {
        [counsellor.id]: { isNotifiedByEmail: false, roles: ["counsellor"] },
        [validator.id]: { isNotifiedByEmail: true, roles: ["validator"] },
      }),
      toAgencyWithRights(anotherAgency, {
        [validator.id]: {
          isNotifiedByEmail: icUserForAgency.isNotifiedByEmail,
          roles: icUserForAgency.roles,
        },
      }),
    ]);
    expectToEqual(uow.outboxRepository.events, [
      createNewEvent({
        topic: "IcUserAgencyRightChanged",
        payload: {
          agencyId: anotherAgency.id,
          userId: validator.id,
          triggeredBy: {
            kind: "inclusion-connected",
            userId: icBackofficeAdminUser.id,
          },
        },
      }),
    ]);
  });
});
