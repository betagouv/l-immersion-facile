import {
  AgencyDtoBuilder,
  InclusionConnectedUserBuilder,
  errors,
  expectPromiseToFailWithError,
  expectToEqual,
} from "shared";
import { toAgencyWithRights } from "../../../utils/agency";
import { InMemoryUowPerformer } from "../../core/unit-of-work/adapters/InMemoryUowPerformer";
import {
  InMemoryUnitOfWork,
  createInMemoryUow,
} from "../../core/unit-of-work/adapters/createInMemoryUow";
import { GetAgencyById, makeGetAgencyById } from "./GetAgencyById";

describe("getAgencyByIdForDashboard", () => {
  const peAgency = new AgencyDtoBuilder()
    .withId("peAgency")
    .withName("just-added-agency")
    .withLogoUrl("https://agency-logo.com")
    .withKind("pole-emploi")
    .build();

  const agencyWithRefersTo = new AgencyDtoBuilder()
    .withId("id-of-agency-refering-to-other")
    .withRefersToAgencyInfo({
      refersToAgencyId: peAgency.id,
      refersToAgencyName: peAgency.name,
    })
    .withName("just-added-agency-refering-to-other-one")
    .withLogoUrl("https://agency-refering-logo.com")
    .withKind("autre")
    .build();

  const counsellor1 = new InclusionConnectedUserBuilder()
    .withId("councellor1")
    .withEmail("councellor1@email.com")
    .buildUser();
  const counsellor2 = new InclusionConnectedUserBuilder()
    .withId("councellor2")
    .withEmail("councellor2@email.com")
    .buildUser();
  const validator = new InclusionConnectedUserBuilder()
    .withId("validator")
    .withEmail("validator@email.com")
    .buildUser();

  const agencyAdminBuilder = new InclusionConnectedUserBuilder()
    .withId("agencyAdminUser")
    .withEmail("agencyAdminUser@email.com")
    .withAgencyRights([
      {
        agency: agencyWithRefersTo,
        isNotifiedByEmail: true,
        roles: ["agency-admin"],
      },
    ]);
  const icAgencyAdminUser = agencyAdminBuilder.build();
  const agencyAdminUser = agencyAdminBuilder.buildUser();

  const notAgencyAdminUser = new InclusionConnectedUserBuilder()
    .withId("notAgencyAdminUser")
    .withEmail("not-agencyAdminUser@email.com")
    .build();

  let uow: InMemoryUnitOfWork;
  let getAgencyById: GetAgencyById;

  beforeEach(() => {
    uow = createInMemoryUow();
    uow.userRepository.users = [
      counsellor1,
      validator,
      counsellor2,
      agencyAdminUser,
    ];
    uow.agencyRepository.agencies = [
      toAgencyWithRights(peAgency, {
        [counsellor1.id]: { isNotifiedByEmail: true, roles: ["counsellor"] },
        [validator.id]: { isNotifiedByEmail: true, roles: ["validator"] },
      }),
      toAgencyWithRights(agencyWithRefersTo, {
        [counsellor2.id]: { isNotifiedByEmail: true, roles: ["counsellor"] },
        [validator.id]: { isNotifiedByEmail: true, roles: ["validator"] },
        [agencyAdminUser.id]: {
          isNotifiedByEmail: true,
          roles: ["agency-admin"],
        },
      }),
    ];

    getAgencyById = makeGetAgencyById({
      uowPerformer: new InMemoryUowPerformer(uow),
    });
  });

  describe("right paths", () => {
    it("get the agency by id", async () => {
      expectToEqual(
        await getAgencyById.execute(agencyWithRefersTo.id, icAgencyAdminUser),
        {
          ...agencyWithRefersTo,
          counsellorEmails: [counsellor2.email],
          validatorEmails: [validator.email],
        },
      );
    });
  });

  describe("wrong paths", () => {
    it("Throw when no agency were found", async () => {
      uow.agencyRepository.agencies = [];

      await expectPromiseToFailWithError(
        getAgencyById.execute(agencyWithRefersTo.id, notAgencyAdminUser),
        errors.agency.notFound({ agencyId: agencyWithRefersTo.id }),
      );
    });

    it("Throw when user is not admin on agency", async () => {
      uow.agencyRepository.agencies = [
        toAgencyWithRights(peAgency, {
          [counsellor1.id]: { isNotifiedByEmail: true, roles: ["counsellor"] },
          [validator.id]: { isNotifiedByEmail: true, roles: ["validator"] },
        }),
        toAgencyWithRights(agencyWithRefersTo, {
          [counsellor2.id]: { isNotifiedByEmail: true, roles: ["counsellor"] },
          [validator.id]: { isNotifiedByEmail: true, roles: ["validator"] },
          [agencyAdminUser.id]: {
            isNotifiedByEmail: true,
            roles: ["agency-admin"],
          },
        }),
      ];

      await expectPromiseToFailWithError(
        getAgencyById.execute(agencyWithRefersTo.id, notAgencyAdminUser),
        errors.user.forbidden({
          userId: notAgencyAdminUser.id,
        }),
      );
    });
  });
});
