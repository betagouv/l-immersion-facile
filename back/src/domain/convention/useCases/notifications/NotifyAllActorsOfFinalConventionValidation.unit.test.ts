import { parseISO } from "date-fns";
import {
  AgencyDtoBuilder,
  ConventionDto,
  ConventionDtoBuilder,
  CreateConventionMagicLinkPayloadProperties,
  displayEmergencyContactInfos,
  expectToEqual,
  expectTypeToMatchAndEqual,
  frontRoutes,
  reasonableSchedule,
} from "shared";
import { AppConfigBuilder } from "../../../../_testBuilders/AppConfigBuilder";
import {
  expectEmailFinalValidationConfirmationMatchingConvention,
  getValidatedConventionFinalConfirmationParams,
} from "../../../../_testBuilders/emailAssertions";
import { fakeGenerateMagicLinkUrlFn } from "../../../../_testBuilders/jwtTestHelper";
import { AppConfig } from "../../../../adapters/primary/config/appConfig";
import {
  createInMemoryUow,
  InMemoryUnitOfWork,
} from "../../../../adapters/primary/config/uowConfig";
import { CustomTimeGateway } from "../../../../adapters/secondary/core/TimeGateway/CustomTimeGateway";
import { InMemoryEmailGateway } from "../../../../adapters/secondary/emailGateway/InMemoryEmailGateway";
import { InMemoryUowPerformer } from "../../../../adapters/secondary/InMemoryUowPerformer";
import { DeterministShortLinkIdGeneratorGateway } from "../../../../adapters/secondary/shortLinkIdGeneratorGateway/DeterministShortLinkIdGeneratorGateway";
import { ConventionPoleEmploiUserAdvisorEntity } from "../../../peConnect/dto/PeConnect.dto";
import { NotifyAllActorsOfFinalConventionValidation } from "./NotifyAllActorsOfFinalConventionValidation";

const establishmentTutorEmail = "boss@mail.com";
const validConvention: ConventionDto = new ConventionDtoBuilder()
  .withEstablishmentTutorEmail(establishmentTutorEmail)
  .withEstablishmentRepresentativeEmail(establishmentTutorEmail)
  .build();

const counsellorEmail = "counsellor@email.fr";
const validatorEmail = "myValidator@mail.com";
const defaultAgency = AgencyDtoBuilder.create(validConvention.agencyId)
  .withValidatorEmails([validatorEmail])
  .build();

describe("NotifyAllActorsOfFinalApplicationValidation sends confirmation email to all actors", () => {
  const shortLinkId = "shortLink1";
  let uow: InMemoryUnitOfWork;
  let emailGateway: InMemoryEmailGateway;
  let timeGateway: CustomTimeGateway;
  let notifyAllActorsOfFinalConventionValidation: NotifyAllActorsOfFinalConventionValidation;
  let config: AppConfig;

  beforeEach(() => {
    uow = createInMemoryUow();
    emailGateway = new InMemoryEmailGateway();
    timeGateway = new CustomTimeGateway();
    const shortLinkIdGeneratorGateway =
      new DeterministShortLinkIdGeneratorGateway();
    shortLinkIdGeneratorGateway.addMoreShortLinkIds([shortLinkId]);
    config = new AppConfigBuilder({}).build();
    notifyAllActorsOfFinalConventionValidation =
      new NotifyAllActorsOfFinalConventionValidation(
        new InMemoryUowPerformer(uow),
        emailGateway,
        fakeGenerateMagicLinkUrlFn,
        timeGateway,
        shortLinkIdGeneratorGateway,
        config,
      );
  });

  it("Default actors: beneficiary, establishement tutor, agency counsellor", async () => {
    const agency = new AgencyDtoBuilder(defaultAgency)
      .withCounsellorEmails([counsellorEmail])
      .build();

    uow.agencyRepository.setAgencies([agency]);

    await notifyAllActorsOfFinalConventionValidation.execute(validConvention);

    expectEmailFinalValidationConfirmationMatchingConvention(
      [
        validConvention.signatories.beneficiary.email,
        validConvention.signatories.establishmentRepresentative.email,
        counsellorEmail,
        validatorEmail,
      ],
      emailGateway.getSentEmails(),
      agency,
      validConvention,
      fakeGenerateMagicLinkUrlFn,
      timeGateway,
    );
  });

  it("With beneficiary current employer", async () => {
    const agency = new AgencyDtoBuilder(defaultAgency)
      .withCounsellorEmails([counsellorEmail])
      .build();

    uow.agencyRepository.setAgencies([agency]);

    const conventionWithBeneficiaryCurrentEmployer = new ConventionDtoBuilder(
      validConvention,
    )
      .withBeneficiaryCurrentEmployer({
        businessName: "boss",
        role: "beneficiary-current-employer",
        email: "current@employer.com",
        phone: "001223344",
        firstName: "Harry",
        lastName: "Potter",
        job: "Magician",
        businessSiret: "01234567891234",
      })
      .build();

    await notifyAllActorsOfFinalConventionValidation.execute(
      conventionWithBeneficiaryCurrentEmployer,
    );

    expectEmailFinalValidationConfirmationMatchingConvention(
      [
        conventionWithBeneficiaryCurrentEmployer.signatories.beneficiary.email,
        conventionWithBeneficiaryCurrentEmployer.signatories
          .establishmentRepresentative.email,
        conventionWithBeneficiaryCurrentEmployer.signatories
          .beneficiaryCurrentEmployer!.email,
        counsellorEmail,
        validatorEmail,
      ],
      emailGateway.getSentEmails(),
      agency,
      conventionWithBeneficiaryCurrentEmployer,
      fakeGenerateMagicLinkUrlFn,
      timeGateway,
    );
  });

  it("With different establishment tutor and establishment representative", async () => {
    const agency = new AgencyDtoBuilder(defaultAgency)
      .withCounsellorEmails([counsellorEmail])
      .build();

    uow.agencyRepository.setAgencies([agency]);

    const conventionWithSpecificEstablishementEmail = new ConventionDtoBuilder()
      .withEstablishmentTutorEmail(establishmentTutorEmail)
      .build();

    await notifyAllActorsOfFinalConventionValidation.execute(
      conventionWithSpecificEstablishementEmail,
    );

    expectEmailFinalValidationConfirmationMatchingConvention(
      [
        conventionWithSpecificEstablishementEmail.signatories.beneficiary.email,
        conventionWithSpecificEstablishementEmail.signatories
          .establishmentRepresentative.email,
        counsellorEmail,
        validatorEmail,
        conventionWithSpecificEstablishementEmail.establishmentTutor.email,
      ],
      emailGateway.getSentEmails(),
      agency,
      validConvention,
      fakeGenerateMagicLinkUrlFn,
      timeGateway,
    );
  });

  it("With a legal representative", async () => {
    const conventionWithBeneficiaryRepresentative = new ConventionDtoBuilder()
      .withBeneficiaryRepresentative({
        firstName: "Tom",
        lastName: "Cruise",
        phone: "0665454271",
        role: "beneficiary-representative",
        email: "beneficiary@representative.fr",
      })
      .build();

    const agency = new AgencyDtoBuilder(defaultAgency)
      .withCounsellorEmails([counsellorEmail])
      .build();

    uow.agencyRepository.setAgencies([agency]);

    await notifyAllActorsOfFinalConventionValidation.execute(
      conventionWithBeneficiaryRepresentative,
    );

    expectEmailFinalValidationConfirmationMatchingConvention(
      [
        conventionWithBeneficiaryRepresentative.signatories.beneficiary.email,
        conventionWithBeneficiaryRepresentative.signatories
          .establishmentRepresentative.email,
        conventionWithBeneficiaryRepresentative.signatories
          .beneficiaryRepresentative!.email,
        counsellorEmail,
        validatorEmail,
      ],
      emailGateway.getSentEmails(),
      agency,
      conventionWithBeneficiaryRepresentative,
      fakeGenerateMagicLinkUrlFn,
      timeGateway,
    );
  });
  it("With PeConnect Federated identity: beneficiary, establishment tutor, agency counsellor & validator, and dedicated advisor", async () => {
    const userPeExternalId = "i-am-an-external-id";
    const userConventionAdvisor: ConventionPoleEmploiUserAdvisorEntity = {
      _entityName: "ConventionPoleEmploiAdvisor",
      advisor: {
        email: "elsa.oldenburg@pole-emploi.net",
        firstName: "Elsa",
        lastName: "Oldenburg",
        type: "CAPEMPLOI",
      },
      peExternalId: userPeExternalId,
      conventionId: validConvention.id,
    };

    uow.conventionPoleEmploiAdvisorRepository.setConventionPoleEmploiUsersAdvisor(
      [userConventionAdvisor],
    );

    const agency = new AgencyDtoBuilder(defaultAgency)
      .withCounsellorEmails([counsellorEmail])
      .build();

    uow.agencyRepository.setAgencies([agency]);

    await notifyAllActorsOfFinalConventionValidation.execute(validConvention);

    expectEmailFinalValidationConfirmationMatchingConvention(
      [
        validConvention.signatories.beneficiary.email,
        validConvention.signatories.establishmentRepresentative.email,
        counsellorEmail,
        validatorEmail,
        userConventionAdvisor.advisor!.email,
      ],
      emailGateway.getSentEmails(),
      agency,
      validConvention,
      fakeGenerateMagicLinkUrlFn,
      timeGateway,
    );
  });
  it("With PeConnect Federated identity: beneficiary, establishment tutor, agency counsellor & validator, and no advisor", async () => {
    const userPeExternalId = "i-am-an-external-id";
    const userConventionAdvisor: ConventionPoleEmploiUserAdvisorEntity = {
      _entityName: "ConventionPoleEmploiAdvisor",
      advisor: undefined,
      peExternalId: userPeExternalId,
      conventionId: validConvention.id,
    };

    uow.conventionPoleEmploiAdvisorRepository.setConventionPoleEmploiUsersAdvisor(
      [userConventionAdvisor],
    );

    const agency = new AgencyDtoBuilder(defaultAgency)
      .withCounsellorEmails([counsellorEmail])
      .build();

    uow.agencyRepository.setAgencies([agency]);

    await notifyAllActorsOfFinalConventionValidation.execute(validConvention);

    expectEmailFinalValidationConfirmationMatchingConvention(
      [
        validConvention.signatories.beneficiary.email,
        validConvention.signatories.establishmentRepresentative.email,
        counsellorEmail,
        validatorEmail,
      ],
      emailGateway.getSentEmails(),
      agency,
      validConvention,
      fakeGenerateMagicLinkUrlFn,
      timeGateway,
    );
  });
});

describe("getValidatedApplicationFinalConfirmationParams", () => {
  const timeGw = new CustomTimeGateway();
  const agency = new AgencyDtoBuilder(defaultAgency)
    .withQuestionnaireUrl("testQuestionnaireUrl")
    .withSignature("testSignature")
    .build();

  it("simple convention", () => {
    const convention = new ConventionDtoBuilder()
      .withImmersionAddress("immersionAddress")
      .withSanitaryPrevention(true)
      .withSanitaryPreventionDescription("sanitaryPreventionDescription")
      .withIndividualProtection(true)
      .withSchedule(reasonableSchedule)
      .build();

    const magicLinkNow = new Date("2023-04-12T10:00:00.000Z");
    timeGw.setNextDate(magicLinkNow);

    const magicLinkCommonFields: CreateConventionMagicLinkPayloadProperties = {
      id: convention.id,
      role: convention.signatories.beneficiary.role,
      email: convention.signatories.beneficiary.email,
      now: magicLinkNow,
    };

    expectToEqual(
      getValidatedConventionFinalConfirmationParams(
        agency,
        convention,
        fakeGenerateMagicLinkUrlFn,
        timeGw,
      ),
      {
        internshipKind: convention.internshipKind,

        beneficiaryFirstName: convention.signatories.beneficiary.firstName,
        beneficiaryLastName: convention.signatories.beneficiary.lastName,

        beneficiaryBirthdate: convention.signatories.beneficiary.birthdate,

        dateStart: parseISO(convention.dateStart).toLocaleDateString("fr"),
        dateEnd: parseISO(convention.dateEnd).toLocaleDateString("fr"),
        establishmentTutorName: `${convention.establishmentTutor.firstName} ${convention.establishmentTutor.lastName}`,

        businessName: convention.businessName,

        immersionAppellationLabel:
          convention.immersionAppellation.appellationLabel,

        emergencyContactInfos: displayEmergencyContactInfos({
          ...convention.signatories,
        }),
        agencyLogoUrl: agency.logoUrl,
        magicLink: fakeGenerateMagicLinkUrlFn({
          ...magicLinkCommonFields,
          targetRoute: frontRoutes.conventionDocument,
        }),
      },
    );
  });

  it("with beneficiary representative", () => {
    const convention = new ConventionDtoBuilder()
      .withImmersionAddress("immersionAddress")
      .withSanitaryPrevention(true)
      .withSanitaryPreventionDescription("sanitaryPreventionDescription")
      .withIndividualProtection(true)
      .withSchedule(reasonableSchedule)
      .withBeneficiaryRepresentative({
        role: "beneficiary-representative",
        firstName: "beneficiary",
        lastName: "representative",
        email: "rep@rep.com",
        phone: "0011223344",
      })
      .build();

    const magicLinkCommonFields: CreateConventionMagicLinkPayloadProperties = {
      id: convention.id,
      role: convention.signatories.beneficiary.role,
      email: convention.signatories.beneficiary.email,
      now: timeGw.now(),
    };

    expectTypeToMatchAndEqual(
      getValidatedConventionFinalConfirmationParams(
        agency,
        convention,
        fakeGenerateMagicLinkUrlFn,
        timeGw,
      ),
      {
        internshipKind: convention.internshipKind,

        beneficiaryFirstName: convention.signatories.beneficiary.firstName,
        beneficiaryLastName: convention.signatories.beneficiary.lastName,
        beneficiaryBirthdate: convention.signatories.beneficiary.birthdate,

        dateStart: parseISO(convention.dateStart).toLocaleDateString("fr"),
        dateEnd: parseISO(convention.dateEnd).toLocaleDateString("fr"),
        establishmentTutorName: `${convention.establishmentTutor.firstName} ${convention.establishmentTutor.lastName}`,

        businessName: convention.businessName,

        immersionAppellationLabel:
          convention.immersionAppellation.appellationLabel,

        emergencyContactInfos: displayEmergencyContactInfos({
          ...convention.signatories,
        }),
        agencyLogoUrl: agency.logoUrl,
        magicLink: fakeGenerateMagicLinkUrlFn({
          ...magicLinkCommonFields,
          targetRoute: frontRoutes.conventionDocument,
        }),
      },
    );
  });
});
