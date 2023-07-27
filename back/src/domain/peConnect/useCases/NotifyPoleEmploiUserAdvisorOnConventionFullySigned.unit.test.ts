import {
  AgencyDto,
  ConventionDto,
  ConventionDtoBuilder,
  frontRoutes,
} from "shared";
import { fakeGenerateMagicLinkUrlFn } from "../../../_testBuilders/jwtTestHelper";
import {
  ExpectSavedNotificationsAndEvents,
  makeExpectSavedNotificationsAndEvents,
} from "../../../_testBuilders/makeExpectSavedNotificationsAndEvents";
import {
  createInMemoryUow,
  InMemoryUnitOfWork,
} from "../../../adapters/primary/config/uowConfig";
import { CustomTimeGateway } from "../../../adapters/secondary/core/TimeGateway/CustomTimeGateway";
import { UuidV4Generator } from "../../../adapters/secondary/core/UuidGeneratorImplementations";
import { InMemoryUowPerformer } from "../../../adapters/secondary/InMemoryUowPerformer";
import { makeSaveNotificationAndRelatedEvent } from "../../generic/notifications/entities/Notification";
import { PeUserAndAdvisor } from "../dto/PeConnect.dto";
import { PeConnectImmersionAdvisorDto } from "../dto/PeConnectAdvisor.dto";
import { NotifyPoleEmploiUserAdvisorOnConventionFullySigned } from "./NotifyPoleEmploiUserAdvisorOnConventionFullySigned";

describe("NotifyPoleEmploiUserAdvisorOnConventionFullySigned", () => {
  let uow: InMemoryUnitOfWork;
  let usecase: NotifyPoleEmploiUserAdvisorOnConventionFullySigned;
  let agency: AgencyDto;
  const timeGateway = new CustomTimeGateway();
  let expectSavedNotificationsAndEvents: ExpectSavedNotificationsAndEvents;

  beforeEach(() => {
    uow = createInMemoryUow();
    agency = uow.agencyRepository.agencies[0];
    expectSavedNotificationsAndEvents = makeExpectSavedNotificationsAndEvents(
      uow.notificationRepository,
      uow.outboxRepository,
    );
    const uuidGenerator = new UuidV4Generator();
    const saveNotificationAndRelatedEvent = makeSaveNotificationAndRelatedEvent(
      uuidGenerator,
      timeGateway,
    );

    usecase = new NotifyPoleEmploiUserAdvisorOnConventionFullySigned(
      new InMemoryUowPerformer(uow),
      saveNotificationAndRelatedEvent,
      fakeGenerateMagicLinkUrlFn,
      timeGateway,
    );
  });

  it("should resolve to undefined if the convention pole emploi OAuth advisor is not found", async () => {
    const conventionDtoFromEvent: ConventionDto = new ConventionDtoBuilder()
      .withId("add5c20e-6dd2-45af-affe-927358005251")
      .withFederatedIdentity({ provider: "peConnect", token: "blop" })
      .build();

    expect(await usecase.execute(conventionDtoFromEvent)).toBeUndefined();
  });

  it("should send email with the correct params", async () => {
    const conventionDtoFromEvent = new ConventionDtoBuilder()
      .withId(conventionId)
      .withAgencyId(agency.id)
      .withFederatedIdentity({ provider: "peConnect", token: userPeExternalId })
      .withBeneficiaryFirstName("John")
      .withBeneficiaryLastName("Doe")
      .withBeneficiaryEmail("john.doe@plop.fr")
      .withImmersionAddress("127 Avenue de la République 94800 Villejuif")
      .withDateStart("2022-07-06")
      .withDateEnd("2022-07-30")
      .withBusinessName("Boulangerie Les Echarts")
      .build();

    uow.conventionRepository.setConventions({
      [conventionDtoFromEvent.id]: conventionDtoFromEvent,
    });
    uow.conventionPoleEmploiAdvisorRepository.setConventionPoleEmploiUsersAdvisor(
      [
        {
          peExternalId: userAdvisorDto.user.peExternalId,
          advisor: userAdvisorDto.advisor,
          _entityName: "ConventionPoleEmploiAdvisor",
          conventionId,
        },
      ],
    );

    await usecase.execute(conventionDtoFromEvent);

    expectSavedNotificationsAndEvents({
      emails: [
        {
          kind: "POLE_EMPLOI_ADVISOR_ON_CONVENTION_FULLY_SIGNED",
          recipients: [advisor.email],
          params: {
            conventionId,
            advisorFirstName: advisor.firstName,
            advisorLastName: advisor.lastName,
            immersionAddress: conventionDtoFromEvent.immersionAddress!,
            beneficiaryFirstName:
              conventionDtoFromEvent.signatories.beneficiary.firstName,
            beneficiaryLastName:
              conventionDtoFromEvent.signatories.beneficiary.lastName,
            beneficiaryEmail:
              conventionDtoFromEvent.signatories.beneficiary.email,
            dateStart: conventionDtoFromEvent.dateStart,
            dateEnd: conventionDtoFromEvent.dateEnd,
            businessName: conventionDtoFromEvent.businessName,
            magicLink: fakeGenerateMagicLinkUrlFn({
              id: conventionDtoFromEvent.id,
              role: "validator",
              targetRoute: frontRoutes.manageConvention,
              email: advisor.email,
              now: timeGateway.now(),
            }),
            agencyLogoUrl: agency.logoUrl,
          },
        },
      ],
    });
  });

  it("peConnected without advisor", async () => {
    const conventionDtoFromEvent = new ConventionDtoBuilder()
      .withId(conventionId)
      .withAgencyId(agency.id)
      .withFederatedIdentity({ provider: "peConnect", token: userPeExternalId })
      .withBeneficiaryFirstName("John")
      .withBeneficiaryLastName("Doe")
      .withBeneficiaryEmail("john.doe@plop.fr")
      .withImmersionAddress("127 Avenue de la République 94800 Villejuif")
      .withDateStart("2022-07-06")
      .withDateEnd("2022-07-30")
      .withBusinessName("Boulangerie Les Echarts")
      .build();

    uow.conventionRepository.setConventions({
      [conventionDtoFromEvent.id]: conventionDtoFromEvent,
    });
    uow.conventionPoleEmploiAdvisorRepository.setConventionPoleEmploiUsersAdvisor(
      [
        {
          advisor: undefined,
          peExternalId: userAdvisorDto.user.peExternalId,
          _entityName: "ConventionPoleEmploiAdvisor",
          conventionId,
        },
      ],
    );

    await usecase.execute(conventionDtoFromEvent);

    expectSavedNotificationsAndEvents({
      emails: [],
    });
  });
});

const conventionId = "749dd14f-c82a-48b1-b1bb-fffc5467e4d4";
const userPeExternalId = "749dd14f-c82a-48b1-b1bb-fffc5467e4d4";
const advisor: PeConnectImmersionAdvisorDto = {
  email: "elsa.oldenburg@pole-emploi.net",
  firstName: "Elsa",
  lastName: "Oldenburg",
  type: "CAPEMPLOI",
};
const userAdvisorDto: PeUserAndAdvisor = {
  advisor,
  user: {
    peExternalId: userPeExternalId,
    email: "",
    firstName: "",
    isJobseeker: true,
    lastName: "",
  },
};
