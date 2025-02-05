import {
  AgencyDto,
  AgencyDtoBuilder,
  InclusionConnectedUserBuilder,
  User,
  WithAgencyIdAndUserId,
  errors,
  expectArraysToMatch,
  expectPromiseToFailWithError,
  expectToEqual,
  toAgencyDtoForAgencyUsersAndAdmins,
} from "shared";
import { toAgencyWithRights } from "../../../utils/agency";
import {
  CreateNewEvent,
  makeCreateNewEvent,
} from "../../core/events/ports/EventBus";
import { CustomTimeGateway } from "../../core/time-gateway/adapters/CustomTimeGateway";
import { InMemoryUowPerformer } from "../../core/unit-of-work/adapters/InMemoryUowPerformer";
import {
  InMemoryUnitOfWork,
  createInMemoryUow,
} from "../../core/unit-of-work/adapters/createInMemoryUow";
import { TestUuidGenerator } from "../../core/uuid-generator/adapters/UuidGeneratorImplementations";
import {
  RemoveUserFromAgency,
  makeRemoveUserFromAgency,
} from "./RemoveUserFromAgency";

describe("RemoveUserFromAgency", () => {
  const agency = new AgencyDtoBuilder().build();

  const adminBuilder = new InclusionConnectedUserBuilder()
    .withId("backoffice-admin-id")
    .withIsAdmin(true);

  const icAdmin = adminBuilder.build();

  const notAdminBuilder = new InclusionConnectedUserBuilder()
    .withId("not-admin-id")
    .withIsAdmin(false);
  const icNotAdmin = notAdminBuilder.build();
  const notAdminUser = notAdminBuilder.buildUser();

  const icAgencyAdminUserBuilder = new InclusionConnectedUserBuilder()
    .withId("agency-admin-id")
    .withIsAdmin(false)
    .withAgencyRights([
      {
        agency: toAgencyDtoForAgencyUsersAndAdmins(agency, []),
        roles: ["agency-admin"],
        isNotifiedByEmail: true,
      },
    ]);
  const icAgencyAdminUser = icAgencyAdminUserBuilder.build();

  let uow: InMemoryUnitOfWork;
  let createNewEvent: CreateNewEvent;
  let removeUserFromAgency: RemoveUserFromAgency;

  beforeEach(() => {
    uow = createInMemoryUow();
    createNewEvent = makeCreateNewEvent({
      uuidGenerator: new TestUuidGenerator(),
      timeGateway: new CustomTimeGateway(),
    });
    removeUserFromAgency = makeRemoveUserFromAgency({
      uowPerformer: new InMemoryUowPerformer(uow),
      deps: { createNewEvent },
    });
    uow.agencyRepository.agencies = [toAgencyWithRights(agency, {})];
  });

  describe("Wrong paths", () => {
    it("throws forbidden when token payload is not backoffice token nor agencyAdmin nor himself", async () => {
      await expectPromiseToFailWithError(
        removeUserFromAgency.execute(
          {
            agencyId: "agency-id",
            userId: "user-id",
          },
          icNotAdmin,
        ),
        errors.user.forbidden({ userId: icNotAdmin.id }),
      );
    });

    it("throws notFound if user to delete not found", async () => {
      const inputParams: WithAgencyIdAndUserId = {
        agencyId: agency.id,
        userId: "unexisting-user",
      };

      await expectPromiseToFailWithError(
        removeUserFromAgency.execute(inputParams, icAdmin),
        errors.user.notFound({ userId: inputParams.userId }),
      );
    });

    it("throws bad request if user attempts to delete validator when agency has refersTo", async () => {
      uow.userRepository.users = [notAdminUser];

      const agencyWithRefersTo = new AgencyDtoBuilder()
        .withId("agency-with-refers-to-id")
        .withRefersToAgencyInfo({
          refersToAgencyId: agency.id,
          refersToAgencyName: agency.name,
        })
        .build();

      uow.agencyRepository.agencies = [
        toAgencyWithRights(agencyWithRefersTo, {
          [notAdminUser.id]: { roles: ["validator"], isNotifiedByEmail: false },
        }),
      ];

      await expectPromiseToFailWithError(
        removeUserFromAgency.execute(
          {
            agencyId: agencyWithRefersTo.id,
            userId: notAdminUser.id,
          },
          icAdmin,
        ),
        errors.agency.invalidValidatorEditionWhenAgencyWithRefersTo(
          agencyWithRefersTo.id,
        ),
      );
    });

    it("throws forbidden if user to delete has not rights on agency", async () => {
      const inputParams: WithAgencyIdAndUserId = {
        agencyId: agency.id,
        userId: notAdminUser.id,
      };

      uow.userRepository.users = [notAdminUser];

      await expectPromiseToFailWithError(
        removeUserFromAgency.execute(inputParams, icAdmin),
        errors.user.expectedRightsOnAgency(inputParams),
      );
    });

    it("throws forbidden if user to delete is the last validator receiving notifications", async () => {
      uow.userRepository.users = [notAdminUser];
      uow.agencyRepository.agencies = [
        toAgencyWithRights(agency, {
          [notAdminUser.id]: { roles: ["validator"], isNotifiedByEmail: true },
        }),
      ];

      const inputParams: WithAgencyIdAndUserId = {
        agencyId: agency.id,
        userId: icNotAdmin.id,
      };

      await expectPromiseToFailWithError(
        removeUserFromAgency.execute(inputParams, icAdmin),
        errors.agency.notEnoughValidators(inputParams),
      );
    });

    it("throws forbidden if user to delete is the last pre-validator receiving notifications, and agency has other pre-validators", async () => {
      const counsellorNotReceivingNotif: User = {
        ...notAdminUser,
        id: "counsellor-not-receiving-notif-id",
        email: "counsellorNotReceivingNotif@email.com",
      };
      const counsellorReceivingNotif: User = {
        ...notAdminUser,
        id: "counsellor-receiving-notif-id",
        email: "counsellorReceivingNotif@email.com",
      };
      uow.userRepository.users = [
        counsellorNotReceivingNotif,
        counsellorReceivingNotif,
        notAdminUser,
      ];
      uow.agencyRepository.agencies = [
        toAgencyWithRights(agency, {
          [notAdminUser.id]: { roles: ["validator"], isNotifiedByEmail: true },
          [counsellorNotReceivingNotif.id]: {
            roles: ["counsellor"],
            isNotifiedByEmail: false,
          },
          [counsellorReceivingNotif.id]: {
            roles: ["counsellor"],
            isNotifiedByEmail: true,
          },
        }),
      ];

      const inputParams: WithAgencyIdAndUserId = {
        agencyId: agency.id,
        userId: counsellorReceivingNotif.id,
      };

      await expectPromiseToFailWithError(
        removeUserFromAgency.execute(inputParams, icAdmin),
        errors.agency.notEnoughCounsellors(inputParams),
      );
    });

    it("throws forbidden if user to delete is the last counsellor receiving notifications on agency with refers to another agency", async () => {
      const agencyWithRefersTo: AgencyDto = new AgencyDtoBuilder()
        .withRefersToAgencyInfo({
          refersToAgencyId: agency.id,
          refersToAgencyName: "",
        })
        .build();

      const counsellorWithNotif: User = {
        ...notAdminUser,
      };
      const counsellorWithoutNotif: User = {
        ...notAdminUser,
        id: "user2",
      };
      uow.userRepository.users = [counsellorWithNotif, counsellorWithoutNotif];
      uow.agencyRepository.agencies = [
        toAgencyWithRights(agency, {}),
        toAgencyWithRights(agencyWithRefersTo, {
          [counsellorWithNotif.id]: {
            roles: ["counsellor"],
            isNotifiedByEmail: true,
          },
          [counsellorWithoutNotif.id]: {
            roles: ["counsellor"],
            isNotifiedByEmail: false,
          },
        }),
      ];

      const inputParams: WithAgencyIdAndUserId = {
        agencyId: agencyWithRefersTo.id,
        userId: icNotAdmin.id,
      };
      await expectPromiseToFailWithError(
        removeUserFromAgency.execute(inputParams, icAdmin),
        errors.agency.notEnoughCounsellors(inputParams),
      );
    });
  });

  it("User to-review can remove himself", async () => {
    const agency2 = new AgencyDtoBuilder().withId("agency-2-id").build();
    const otherUserWithRightOnAgencies: User = {
      ...icNotAdmin,
      id: "other-user-id",
    };

    uow.userRepository.users = [notAdminUser, otherUserWithRightOnAgencies];
    uow.agencyRepository.agencies = [
      toAgencyWithRights(agency, {
        [notAdminUser.id]: {
          roles: ["to-review"],
          isNotifiedByEmail: false,
        },
        [otherUserWithRightOnAgencies.id]: {
          roles: ["validator"],
          isNotifiedByEmail: true,
        },
      }),
      toAgencyWithRights(agency2, {
        [notAdminUser.id]: {
          roles: ["validator"],
          isNotifiedByEmail: true,
        },
        [otherUserWithRightOnAgencies.id]: {
          roles: ["validator"],
          isNotifiedByEmail: true,
        },
      }),
    ];

    const inputParams: WithAgencyIdAndUserId = {
      agencyId: agency.id,
      userId: notAdminUser.id,
    };
    await removeUserFromAgency.execute(inputParams, icNotAdmin);

    expectToEqual(uow.agencyRepository.agencies, [
      toAgencyWithRights(agency, {
        [otherUserWithRightOnAgencies.id]: {
          roles: ["validator"],
          isNotifiedByEmail: true,
        },
      }),
      toAgencyWithRights(agency2, {
        [notAdminUser.id]: {
          roles: ["validator"],
          isNotifiedByEmail: true,
        },
        [otherUserWithRightOnAgencies.id]: {
          roles: ["validator"],
          isNotifiedByEmail: true,
        },
      }),
    ]);
    expectArraysToMatch(uow.outboxRepository.events, [
      {
        topic: "IcUserAgencyRightChanged",
        payload: {
          ...inputParams,
          triggeredBy: {
            kind: "inclusion-connected",
            userId: icNotAdmin.id,
          },
        },
      },
    ]);
  });

  it.each([
    {
      triggeredByRole: "backoffice-admin",
      triggeredByUser: icAdmin,
    },
    {
      triggeredByRole: "agency-admin",
      triggeredByUser: icAgencyAdminUser,
    },
  ])(
    "$triggeredByRole can remove user from agency",
    async ({ triggeredByUser }) => {
      const agency2 = new AgencyDtoBuilder().withId("agency-2-id").build();
      const otherUserWithRightOnAgencies: User = {
        ...icNotAdmin,
        id: "other-user-id",
      };

      uow.userRepository.users = [notAdminUser, otherUserWithRightOnAgencies];
      uow.agencyRepository.agencies = [
        toAgencyWithRights(agency, {
          [notAdminUser.id]: {
            roles: ["validator"],
            isNotifiedByEmail: true,
          },
          [otherUserWithRightOnAgencies.id]: {
            roles: ["validator"],
            isNotifiedByEmail: true,
          },
        }),
        toAgencyWithRights(agency2, {
          [notAdminUser.id]: {
            roles: ["validator"],
            isNotifiedByEmail: true,
          },
          [otherUserWithRightOnAgencies.id]: {
            roles: ["validator"],
            isNotifiedByEmail: true,
          },
        }),
      ];

      const inputParams: WithAgencyIdAndUserId = {
        agencyId: agency.id,
        userId: notAdminUser.id,
      };
      await removeUserFromAgency.execute(inputParams, triggeredByUser);

      expectToEqual(uow.agencyRepository.agencies, [
        toAgencyWithRights(agency, {
          [otherUserWithRightOnAgencies.id]: {
            roles: ["validator"],
            isNotifiedByEmail: true,
          },
        }),
        toAgencyWithRights(agency2, {
          [notAdminUser.id]: {
            roles: ["validator"],
            isNotifiedByEmail: true,
          },
          [otherUserWithRightOnAgencies.id]: {
            roles: ["validator"],
            isNotifiedByEmail: true,
          },
        }),
      ]);
      expectArraysToMatch(uow.outboxRepository.events, [
        {
          topic: "IcUserAgencyRightChanged",
          payload: {
            ...inputParams,
            triggeredBy: {
              kind: "inclusion-connected",
              userId: triggeredByUser.id,
            },
          },
        },
      ]);
    },
  );
});
