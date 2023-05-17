import {
  AgencyDtoBuilder,
  ConventionDto,
  ConventionDtoBuilder,
  immersionFacileContactEmail,
} from "shared";
import { AppConfigBuilder } from "../../_testBuilders/AppConfigBuilder";
import { generateConventionJwtTestFn } from "../../_testBuilders/jwtTestHelper";
import {
  AppConfig,
  makeEmailAllowListPredicate,
} from "../../adapters/primary/config/appConfig";
import { configureCreateHttpClientForExternalApi } from "../../adapters/primary/config/createHttpClientForExternalApi";
import {
  GenerateConventionMagicLinkUrl,
  makeGenerateConventionMagicLinkUrl,
} from "../../adapters/primary/config/magicLinkUrl";
import { createInMemoryUow } from "../../adapters/primary/config/uowConfig";
import { CustomTimeGateway } from "../../adapters/secondary/core/TimeGateway/CustomTimeGateway";
import { InMemoryUowPerformer } from "../../adapters/secondary/InMemoryUowPerformer";
import { BrevoNotificationGateway } from "../../adapters/secondary/notificationGateway/BrevoNotificationGateway";
import { brevoNotificationGatewayTargets } from "../../adapters/secondary/notificationGateway/BrevoNotificationGateway.targets";
import { DeterministShortLinkIdGeneratorGateway } from "../../adapters/secondary/shortLinkIdGeneratorGateway/DeterministShortLinkIdGeneratorGateway";
import { NotifyNewApplicationNeedsReview } from "../../domain/convention/useCases/notifications/NotifyNewApplicationNeedsReview";
import { TimeGateway } from "../../domain/core/ports/TimeGateway";

// These tests are not hermetic and not meant for automated testing. They will send emails using
// Brevo, use up production quota, and fail for uncontrollable reasons such as quota
// errors.
//
// Requires the following environment variables to be set for the tests to pass:
// - BREVO_API_KEY

const validConvention: ConventionDto = new ConventionDtoBuilder()
  .withStatus("IN_REVIEW")
  .withBeneficiaryEmail("jean-francois.macresy@beta.gouv.fr")
  .withEstablishmentTutorEmail(
    "jean-francois.macresy+establishmentTutor@beta.gouv.fr",
  )
  .build();

describe("Notify To 2 Counsellors that an application is available", () => {
  let notificationGateway: BrevoNotificationGateway;
  let generateMagicLinkFn: GenerateConventionMagicLinkUrl;
  let agency;
  let timeGateway: TimeGateway;
  let shortlinkGateway = new DeterministShortLinkIdGeneratorGateway();
  const config = new AppConfigBuilder().build();

  beforeEach(() => {
    shortlinkGateway = new DeterministShortLinkIdGeneratorGateway();
    const config = AppConfig.createFromEnv();
    notificationGateway = new BrevoNotificationGateway(
      configureCreateHttpClientForExternalApi()(
        brevoNotificationGatewayTargets,
      ),
      makeEmailAllowListPredicate({
        skipEmailAllowList: config.skipEmailAllowlist,
        emailAllowList: config.emailAllowList,
      }),
      config.apiKeyBrevo + "wrong",
      {
        name: "Immersion Facilitée",
        email: immersionFacileContactEmail,
      },
    );
    generateMagicLinkFn = makeGenerateConventionMagicLinkUrl(
      config,
      generateConventionJwtTestFn,
    );
    timeGateway = new CustomTimeGateway();
  });

  //eslint-disable-next-line jest/expect-expect
  it("Sends notification mails to check Immersion Application eligibility", async () => {
    const counsellorEmails = [
      "recette+test-counsellor1@immersion-facile.beta.gouv.fr",
      "recette+test-counsellor2@immersion-facile.beta.gouv.fr",
    ];

    agency = AgencyDtoBuilder.create(validConvention.agencyId)
      .withCounsellorEmails(counsellorEmails)
      .build();

    const uow = createInMemoryUow();
    uow.agencyRepository.setAgencies([agency]);

    const notifyNewApplicationNeedsReview = new NotifyNewApplicationNeedsReview(
      new InMemoryUowPerformer(uow),
      notificationGateway,
      generateMagicLinkFn,
      timeGateway,
      shortlinkGateway,
      config,
    );
    await notifyNewApplicationNeedsReview.execute(validConvention);
  });

  // TODO(jfmac)
  // Needs to be re-done with real db
  //eslint-disable-next-line jest/expect-expect
  it("Sends notification mails to check Immersion Application eligibility with a real working immersion", async () => {
    const counsellorEmails = [
      "recette+test-counsellor1@immersion-facile.beta.gouv.fr",
      "recette+test-counsellor2@immersion-facile.beta.gouv.fr",
    ];

    agency = AgencyDtoBuilder.create(validConvention.agencyId)
      .withCounsellorEmails(counsellorEmails)
      .build();

    validConvention.id = "ef725832-c8f9-41e1-974b-44372e6e474c";

    const uow = createInMemoryUow();
    uow.agencyRepository.setAgencies([agency]);

    const notifyNewApplicationNeedsReview = new NotifyNewApplicationNeedsReview(
      new InMemoryUowPerformer(uow),
      notificationGateway,
      generateMagicLinkFn,
      timeGateway,
      shortlinkGateway,
      config,
    );
    await notifyNewApplicationNeedsReview.execute(validConvention);
  });

  //eslint-disable-next-line jest/no-conditional-expect, jest/expect-expect
  it("Sends notification mails to check Immersion Application validation  with a real working immersion", async () => {
    const validationEmails = [
      "recette+test-validatior1@immersion-facile.beta.gouv.fr",
      "recette+test-validatior2@immersion-facile.beta.gouv.fr",
    ];

    agency = AgencyDtoBuilder.create(validConvention.agencyId)
      .withValidatorEmails(validationEmails)
      .build();
    validConvention.id = "ef725832-c8f9-41e1-974b-44372e6e474c";

    const uow = createInMemoryUow();
    uow.agencyRepository.setAgencies([agency]);

    const notifyNewApplicationNeedsReview = new NotifyNewApplicationNeedsReview(
      new InMemoryUowPerformer(uow),
      notificationGateway,
      generateMagicLinkFn,
      timeGateway,
      shortlinkGateway,
      config,
    );
    await notifyNewApplicationNeedsReview.execute(validConvention);
  });
});
