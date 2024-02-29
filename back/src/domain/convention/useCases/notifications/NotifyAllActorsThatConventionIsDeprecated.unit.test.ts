import {
  AgencyDto,
  AgencyDtoBuilder,
  BeneficiaryCurrentEmployer,
  BeneficiaryRepresentative,
  ConventionDtoBuilder,
} from "shared";
import { EmailNotification } from "shared";
import {
  InMemoryUnitOfWork,
  createInMemoryUow,
} from "../../../../adapters/primary/config/uowConfig";
import { expectNotifyConventionIsDeprecated } from "../../../../adapters/secondary/InMemoryNotificationRepository";
import { InMemoryUowPerformer } from "../../../../adapters/secondary/InMemoryUowPerformer";
import { UuidV4Generator } from "../../../../adapters/secondary/core/UuidGeneratorImplementations";
import { CustomTimeGateway } from "../../../core/time-gateway/adapters/CustomTimeGateway";
import { makeSaveNotificationAndRelatedEvent } from "../../../generic/notifications/entities/Notification";
import { NotifyAllActorsThatConventionIsDeprecated } from "./NotifyAllActorsThatConventionIsDeprecated";

const beneficiaryRepresentative: BeneficiaryRepresentative = {
  role: "beneficiary-representative",
  email: "legal@representative.com",
  firstName: "The",
  lastName: "Representative",
  phone: "1234567",
};

const beneficiaryCurrentEmployer: BeneficiaryCurrentEmployer = {
  firstName: "ali",
  lastName: "baba",
  businessName: "business",
  businessSiret: "01234567890123",
  email: "beneficiary-current-employer@gmail.com",
  job: "job",
  phone: "0011223344",
  role: "beneficiary-current-employer",
  signedAt: new Date().toISOString(),
  businessAddress: "Rue des Bouchers 67065 Strasbourg",
};

const deprecatedConvention = new ConventionDtoBuilder()
  .withStatus("DEPRECATED")
  .withStatusJustification("test-deprecation-justification")
  .withBeneficiaryRepresentative(beneficiaryRepresentative)
  .withBeneficiaryCurrentEmployer(beneficiaryCurrentEmployer)
  .build();

const deprecatedConventionWithDuplicatedEmails = new ConventionDtoBuilder()
  .withStatus("DEPRECATED")
  .withAgencyId("fakeAgencyId")
  .withBeneficiaryRepresentative(beneficiaryRepresentative)
  .withBeneficiaryCurrentEmployer(beneficiaryCurrentEmployer)
  .withEstablishmentRepresentativeEmail(
    "establishment-representative@gmail.com",
  )
  .withEstablishmentTutorEmail("establishment-representative@gmail.com")
  .build();

const counsellorEmails = ["counsellor1@email.fr", "counsellor2@email.fr"];

const validatorEmails = ["validator@gmail.com"];

const defaultAgency = AgencyDtoBuilder.create(deprecatedConvention.agencyId)
  .withName("test-agency-name")
  .withCounsellorEmails(counsellorEmails)
  .withValidatorEmails(validatorEmails)
  .build();

const agencyWithSameEmailAdressForCounsellorAndValidator =
  AgencyDtoBuilder.create(deprecatedConventionWithDuplicatedEmails.agencyId)
    .withName("duplicated-email-test-agency-name")
    .withCounsellorEmails(counsellorEmails)
    .withValidatorEmails(counsellorEmails)
    .build();

describe("NotifyAllActorsThatApplicationIsDeprecated", () => {
  let useCase: NotifyAllActorsThatConventionIsDeprecated;
  let agency: AgencyDto;

  let uow: InMemoryUnitOfWork;

  beforeEach(() => {
    agency = defaultAgency;

    uow = createInMemoryUow();
    uow.agencyRepository.setAgencies([agency]);

    const timeGateway = new CustomTimeGateway();
    const uuidGenerator = new UuidV4Generator();
    const saveNotificationAndRelatedEvent = makeSaveNotificationAndRelatedEvent(
      uuidGenerator,
      timeGateway,
    );
    useCase = new NotifyAllActorsThatConventionIsDeprecated(
      new InMemoryUowPerformer(uow),
      saveNotificationAndRelatedEvent,
    );
  });

  it("Sends a conevention deprecated notification to all actors", async () => {
    await useCase.execute({ convention: deprecatedConvention });
    const {
      beneficiaryCurrentEmployer,
      beneficiary,
      establishmentRepresentative,
      beneficiaryRepresentative,
    } = deprecatedConvention.signatories;

    const templatedEmailsSent = uow.notificationRepository.notifications
      .filter((notif): notif is EmailNotification => notif.kind === "email")
      .map((notif) => notif.templatedContent);

    expect(templatedEmailsSent).toHaveLength(1);

    expectNotifyConventionIsDeprecated(
      templatedEmailsSent[0],
      [
        beneficiary.email,
        establishmentRepresentative.email,
        // biome-ignore lint/style/noNonNullAssertion:
        beneficiaryRepresentative!.email,
        // biome-ignore lint/style/noNonNullAssertion:
        beneficiaryCurrentEmployer!.email,
        ...counsellorEmails,
        ...validatorEmails,
      ],
      deprecatedConvention,
    );
  });

  it("doesn't send duplicated rejection emails if validator email is also in counsellor emails and establishment tutor email is the same as establishment representative", async () => {
    uow.agencyRepository.setAgencies([
      agencyWithSameEmailAdressForCounsellorAndValidator,
    ]);

    await useCase.execute({
      convention: deprecatedConventionWithDuplicatedEmails,
    });

    const {
      beneficiaryCurrentEmployer,
      beneficiary,
      establishmentRepresentative,
      beneficiaryRepresentative,
    } = deprecatedConventionWithDuplicatedEmails.signatories;

    const templatedEmailsSent = uow.notificationRepository.notifications
      .filter((notif): notif is EmailNotification => notif.kind === "email")
      .map((notif) => notif.templatedContent);

    expect(templatedEmailsSent).toHaveLength(1);

    expectNotifyConventionIsDeprecated(
      templatedEmailsSent[0],
      [
        beneficiary.email,
        establishmentRepresentative.email,
        // biome-ignore lint/style/noNonNullAssertion:
        beneficiaryRepresentative!.email,
        // biome-ignore lint/style/noNonNullAssertion:
        beneficiaryCurrentEmployer!.email,
        ...agencyWithSameEmailAdressForCounsellorAndValidator.validatorEmails,
      ],
      deprecatedConventionWithDuplicatedEmails,
    );
  });
});
