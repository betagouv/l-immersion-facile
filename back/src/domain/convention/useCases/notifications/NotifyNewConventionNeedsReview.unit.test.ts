import {
  AgencyDtoBuilder,
  ConventionDto,
  ConventionDtoBuilder,
  expectToEqual,
  frontRoutes,
} from "shared";
import { AppConfig } from "../../../../adapters/primary/config/appConfig";
import {
  createInMemoryUow,
  InMemoryUnitOfWork,
} from "../../../../adapters/primary/config/uowConfig";
import { CustomTimeGateway } from "../../../../adapters/secondary/core/TimeGateway/CustomTimeGateway";
import { UuidV4Generator } from "../../../../adapters/secondary/core/UuidGeneratorImplementations";
import { InMemoryUowPerformer } from "../../../../adapters/secondary/InMemoryUowPerformer";
import { DeterministShortLinkIdGeneratorGateway } from "../../../../adapters/secondary/shortLinkIdGeneratorGateway/DeterministShortLinkIdGeneratorGateway";
import { AppConfigBuilder } from "../../../../utils/AppConfigBuilder";
import { fakeGenerateMagicLinkUrlFn } from "../../../../utils/jwtTestHelper";
import {
  ExpectSavedNotificationsAndEvents,
  makeExpectSavedNotificationsAndEvents,
} from "../../../../utils/makeExpectSavedNotificationsAndEvents";
import { makeShortLinkUrl } from "../../../core/ShortLink";
import { makeSaveNotificationAndRelatedEvent } from "../../../generic/notifications/entities/Notification";
import { NotifyNewConventionNeedsReview } from "./NotifyNewConventionNeedsReview";

const defaultConvention = new ConventionDtoBuilder().build();
const validatorEmail = "myValidator@bob.yolo";
const defaultAgency = AgencyDtoBuilder.create(defaultConvention.agencyId)
  .withValidatorEmails([validatorEmail])
  .build();

describe("NotifyConventionNeedsReview", () => {
  let uow: InMemoryUnitOfWork;
  let notifyNewConventionNeedsReview: NotifyNewConventionNeedsReview;
  let shortLinkIdGeneratorGateway: DeterministShortLinkIdGeneratorGateway;
  let config: AppConfig;
  let conventionInReview: ConventionDto;
  let expectSavedNotificationsAndEvents: ExpectSavedNotificationsAndEvents;
  const timeGateway = new CustomTimeGateway();

  beforeEach(() => {
    config = new AppConfigBuilder().build();
    uow = createInMemoryUow();
    shortLinkIdGeneratorGateway = new DeterministShortLinkIdGeneratorGateway();
    expectSavedNotificationsAndEvents = makeExpectSavedNotificationsAndEvents(
      uow.notificationRepository,
      uow.outboxRepository,
    );
    const uuidGenerator = new UuidV4Generator();
    const saveNotificationAndRelatedEvent = makeSaveNotificationAndRelatedEvent(
      uuidGenerator,
      timeGateway,
    );
    notifyNewConventionNeedsReview = new NotifyNewConventionNeedsReview(
      new InMemoryUowPerformer(uow),
      saveNotificationAndRelatedEvent,
      fakeGenerateMagicLinkUrlFn,
      timeGateway,
      shortLinkIdGeneratorGateway,
      config,
    );
  });

  describe("When convention status is IN_REVIEW", () => {
    beforeEach(() => {
      conventionInReview = new ConventionDtoBuilder(defaultConvention)
        .withStatus("IN_REVIEW")
        .build();
    });

    it("Nominal case: Sends notification email to councellor, with 2 existing councellors", async () => {
      const shortLinkIds = [
        "shortlink1",
        "shortlink2",
        "shortlink3",
        "shortlink4",
      ];
      shortLinkIdGeneratorGateway.addMoreShortLinkIds(shortLinkIds);
      const counsellorEmails = [
        "aCouncellor@unmail.com",
        "anotherCouncellor@unmail.com",
      ];
      const agency = new AgencyDtoBuilder(defaultAgency)
        .withCounsellorEmails(counsellorEmails)
        .build();

      uow.agencyRepository.setAgencies([agency]);

      await notifyNewConventionNeedsReview.execute({
        convention: conventionInReview,
      });

      expectToEqual(uow.shortLinkQuery.getShortLinks(), {
        [shortLinkIds[0]]: fakeGenerateMagicLinkUrlFn({
          id: conventionInReview.id,
          email: counsellorEmails[0],
          now: timeGateway.now(),
          role: "counsellor",
          targetRoute: frontRoutes.conventionStatusDashboard,
        }),
        [shortLinkIds[1]]: fakeGenerateMagicLinkUrlFn({
          id: conventionInReview.id,
          email: counsellorEmails[1],
          now: timeGateway.now(),
          role: "counsellor",
          targetRoute: frontRoutes.conventionStatusDashboard,
        }),
        [shortLinkIds[2]]: fakeGenerateMagicLinkUrlFn({
          id: conventionInReview.id,
          email: counsellorEmails[0],
          now: timeGateway.now(),
          role: "counsellor",
          targetRoute: frontRoutes.manageConvention,
        }),
        [shortLinkIds[3]]: fakeGenerateMagicLinkUrlFn({
          id: conventionInReview.id,
          email: counsellorEmails[1],
          now: timeGateway.now(),
          role: "counsellor",
          targetRoute: frontRoutes.manageConvention,
        }),
      });
      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
            recipients: [counsellorEmails[0]],
            params: {
              conventionId: conventionInReview.id,
              internshipKind: conventionInReview.internshipKind,
              beneficiaryFirstName:
                conventionInReview.signatories.beneficiary.firstName,
              beneficiaryLastName:
                conventionInReview.signatories.beneficiary.lastName,
              businessName: conventionInReview.businessName,
              magicLink: makeShortLinkUrl(config, shortLinkIds[2]),
              conventionStatusLink: makeShortLinkUrl(config, shortLinkIds[0]),
              possibleRoleAction: "en vérifier l'éligibilité",
              agencyLogoUrl: agency.logoUrl,
              validatorName: "",
            },
          },
          {
            kind: "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
            recipients: [counsellorEmails[1]],
            params: {
              conventionId: conventionInReview.id,
              internshipKind: conventionInReview.internshipKind,
              beneficiaryFirstName:
                conventionInReview.signatories.beneficiary.firstName,
              beneficiaryLastName:
                conventionInReview.signatories.beneficiary.lastName,
              businessName: conventionInReview.businessName,
              magicLink: makeShortLinkUrl(config, shortLinkIds[3]),
              conventionStatusLink: makeShortLinkUrl(config, shortLinkIds[1]),
              possibleRoleAction: "en vérifier l'éligibilité",
              agencyLogoUrl: agency.logoUrl,
              validatorName: "",
            },
          },
        ],
      });
    });

    it("No counsellors available: we fall back to validators: Sends notification email to those validators (using 2 of them)", async () => {
      const validatorEmails = [
        "aValidator@unmail.com",
        "anotherValidator@unmail.com",
      ];
      const agency = new AgencyDtoBuilder(defaultAgency)
        .withValidatorEmails(validatorEmails)
        .build();

      uow.agencyRepository.setAgencies([agency]);
      const shortLinkIds = [
        "shortlink1",
        "shortlink2",
        "shortlink3",
        "shortlink4",
      ];
      shortLinkIdGeneratorGateway.addMoreShortLinkIds(shortLinkIds);

      await notifyNewConventionNeedsReview.execute({
        convention: conventionInReview,
      });

      expectToEqual(uow.shortLinkQuery.getShortLinks(), {
        [shortLinkIds[0]]: fakeGenerateMagicLinkUrlFn({
          id: conventionInReview.id,
          email: validatorEmails[0],
          now: timeGateway.now(),
          role: "validator",
          targetRoute: frontRoutes.conventionStatusDashboard,
        }),
        [shortLinkIds[1]]: fakeGenerateMagicLinkUrlFn({
          id: conventionInReview.id,
          email: validatorEmails[1],
          now: timeGateway.now(),
          role: "validator",
          targetRoute: frontRoutes.conventionStatusDashboard,
        }),
        [shortLinkIds[2]]: fakeGenerateMagicLinkUrlFn({
          id: conventionInReview.id,
          email: validatorEmails[0],
          now: timeGateway.now(),
          role: "validator",
          targetRoute: frontRoutes.manageConvention,
        }),
        [shortLinkIds[3]]: fakeGenerateMagicLinkUrlFn({
          id: conventionInReview.id,
          email: validatorEmails[1],
          now: timeGateway.now(),
          role: "validator",
          targetRoute: frontRoutes.manageConvention,
        }),
      });

      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
            recipients: [validatorEmails[0]],
            params: {
              conventionId: conventionInReview.id,
              internshipKind: conventionInReview.internshipKind,
              beneficiaryFirstName:
                conventionInReview.signatories.beneficiary.firstName,
              beneficiaryLastName:
                conventionInReview.signatories.beneficiary.lastName,
              businessName: conventionInReview.businessName,
              magicLink: makeShortLinkUrl(config, shortLinkIds[2]),
              conventionStatusLink: makeShortLinkUrl(config, shortLinkIds[0]),
              possibleRoleAction: "en considérer la validation",
              agencyLogoUrl: agency.logoUrl,
              validatorName: "",
            },
          },
          {
            kind: "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
            recipients: [validatorEmails[1]],
            params: {
              conventionId: conventionInReview.id,
              internshipKind: conventionInReview.internshipKind,
              beneficiaryFirstName:
                conventionInReview.signatories.beneficiary.firstName,
              beneficiaryLastName:
                conventionInReview.signatories.beneficiary.lastName,
              businessName: conventionInReview.businessName,
              magicLink: makeShortLinkUrl(config, shortLinkIds[3]),
              conventionStatusLink: makeShortLinkUrl(config, shortLinkIds[1]),
              possibleRoleAction: "en considérer la validation",
              agencyLogoUrl: agency.logoUrl,
              validatorName: "",
            },
          },
        ],
      });
    });

    it("No counsellors available, neither validators => ensure no mail is sent", async () => {
      await notifyNewConventionNeedsReview.execute({
        convention: conventionInReview,
      });
      expectSavedNotificationsAndEvents({ emails: [] });
    });

    describe("When convention status is ACCEPTED_BY_COUNSELLOR", () => {
      let acceptedByCounsellorConvention: ConventionDto;
      beforeEach(() => {
        acceptedByCounsellorConvention = new ConventionDtoBuilder(
          defaultConvention,
        )
          .withStatus("ACCEPTED_BY_COUNSELLOR")
          .build();
      });

      it("Nominal case: Sends notification email to validators", async () => {
        const shortLinkIds = ["link1", "link2", "link3", "link4"];
        shortLinkIdGeneratorGateway.addMoreShortLinkIds(shortLinkIds);
        const validatorEmails = [
          "aValidator@unmail.com",
          "anotherValidator@unmail.com",
        ];
        const agency = new AgencyDtoBuilder(defaultAgency)
          .withValidatorEmails(validatorEmails)
          .build();

        uow.agencyRepository.setAgencies([agency]);

        await notifyNewConventionNeedsReview.execute({
          convention: acceptedByCounsellorConvention,
        });

        expectToEqual(uow.shortLinkQuery.getShortLinks(), {
          [shortLinkIds[0]]: fakeGenerateMagicLinkUrlFn({
            id: acceptedByCounsellorConvention.id,
            email: validatorEmails[0],
            now: timeGateway.now(),
            role: "validator",
            targetRoute: frontRoutes.conventionStatusDashboard,
          }),
          [shortLinkIds[1]]: fakeGenerateMagicLinkUrlFn({
            id: acceptedByCounsellorConvention.id,
            email: validatorEmails[1],
            now: timeGateway.now(),
            role: "validator",
            targetRoute: frontRoutes.conventionStatusDashboard,
          }),
          [shortLinkIds[2]]: fakeGenerateMagicLinkUrlFn({
            id: acceptedByCounsellorConvention.id,
            email: validatorEmails[0],
            now: timeGateway.now(),
            role: "validator",
            targetRoute: frontRoutes.manageConvention,
          }),

          [shortLinkIds[3]]: fakeGenerateMagicLinkUrlFn({
            id: acceptedByCounsellorConvention.id,
            email: validatorEmails[1],
            now: timeGateway.now(),
            role: "validator",
            targetRoute: frontRoutes.manageConvention,
          }),
        });

        expectSavedNotificationsAndEvents({
          emails: [
            {
              kind: "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
              recipients: [validatorEmails[0]],
              params: {
                conventionId: acceptedByCounsellorConvention.id,
                internshipKind: acceptedByCounsellorConvention.internshipKind,
                beneficiaryFirstName:
                  acceptedByCounsellorConvention.signatories.beneficiary
                    .firstName,
                beneficiaryLastName:
                  acceptedByCounsellorConvention.signatories.beneficiary
                    .lastName,
                businessName: acceptedByCounsellorConvention.businessName,
                magicLink: makeShortLinkUrl(config, shortLinkIds[2]),
                conventionStatusLink: makeShortLinkUrl(config, shortLinkIds[0]),
                possibleRoleAction: "en considérer la validation",
                agencyLogoUrl: agency.logoUrl,
                validatorName: "",
              },
            },
            {
              kind: "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
              recipients: [validatorEmails[1]],
              params: {
                conventionId: acceptedByCounsellorConvention.id,
                internshipKind: acceptedByCounsellorConvention.internshipKind,
                beneficiaryFirstName:
                  acceptedByCounsellorConvention.signatories.beneficiary
                    .firstName,
                beneficiaryLastName:
                  acceptedByCounsellorConvention.signatories.beneficiary
                    .lastName,
                businessName: acceptedByCounsellorConvention.businessName,
                magicLink: makeShortLinkUrl(config, shortLinkIds[3]),
                conventionStatusLink: makeShortLinkUrl(config, shortLinkIds[1]),
                possibleRoleAction: "en considérer la validation",
                agencyLogoUrl: agency.logoUrl,
                validatorName: "",
              },
            },
          ],
        });
      });

      it("No validators available => ensure no mail is sent", async () => {
        await notifyNewConventionNeedsReview.execute({
          convention: acceptedByCounsellorConvention,
        });
        expectSavedNotificationsAndEvents({ emails: [] });
      });
    });

    describe("When status is ACCEPTED_BY_VALIDATOR", () => {
      let acceptedByValidatorConvention: ConventionDto;
      beforeEach(() => {
        acceptedByValidatorConvention = new ConventionDtoBuilder()
          .withStatus("ACCEPTED_BY_VALIDATOR")
          .build();
      });

      it("Nominal case: Sends notification email to admins", async () => {
        const shortLinkIds = ["link1", "link2"];
        shortLinkIdGeneratorGateway.addMoreShortLinkIds(shortLinkIds);
        const adminEmail = "anAdmin@unmail.com";
        const agency = new AgencyDtoBuilder(defaultAgency)
          .withAdminEmails([adminEmail])
          .build();

        uow.agencyRepository.setAgencies([agency]);

        await notifyNewConventionNeedsReview.execute({
          convention: acceptedByValidatorConvention,
        });

        expectToEqual(uow.shortLinkQuery.getShortLinks(), {
          [shortLinkIds[0]]: fakeGenerateMagicLinkUrlFn({
            id: acceptedByValidatorConvention.id,
            email: adminEmail,
            now: timeGateway.now(),
            role: "backOffice",
            targetRoute: frontRoutes.conventionStatusDashboard,
          }),
          [shortLinkIds[1]]: fakeGenerateMagicLinkUrlFn({
            id: acceptedByValidatorConvention.id,
            email: adminEmail,
            now: timeGateway.now(),
            role: "backOffice",
            targetRoute: frontRoutes.manageConvention,
          }),
        });

        expectSavedNotificationsAndEvents({
          emails: [
            {
              kind: "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
              recipients: [adminEmail],
              params: {
                conventionId: acceptedByValidatorConvention.id,
                internshipKind: acceptedByValidatorConvention.internshipKind,
                beneficiaryFirstName:
                  acceptedByValidatorConvention.signatories.beneficiary
                    .firstName,
                beneficiaryLastName:
                  acceptedByValidatorConvention.signatories.beneficiary
                    .lastName,
                businessName: acceptedByValidatorConvention.businessName,
                magicLink: makeShortLinkUrl(config, shortLinkIds[1]),
                conventionStatusLink: makeShortLinkUrl(config, shortLinkIds[0]),
                possibleRoleAction: "en considérer la validation",
                agencyLogoUrl: agency.logoUrl,
                validatorName: "",
              },
            },
          ],
        });
      });

      it("No admin available => ensure no mail is sent", async () => {
        await notifyNewConventionNeedsReview.execute({
          convention: acceptedByValidatorConvention,
        });

        expectSavedNotificationsAndEvents({ emails: [] });
      });
    });
  });

  describe("When convention status is ACCEPTED_BY_COUNSELLOR", () => {
    beforeEach(() => {
      conventionInReview = new ConventionDtoBuilder(defaultConvention)
        .withStatus("ACCEPTED_BY_COUNSELLOR")
        .withValidator({ lastname: "Doe", firstname: "John" })
        .build();
    });

    it("Nominal case: Sends notification email to validator with counsellor name", async () => {
      const shortLinkIds = [
        "shortlink1",
        "shortlink2",
        "shortlink3",
        "shortlink4",
      ];
      shortLinkIdGeneratorGateway.addMoreShortLinkIds(shortLinkIds);
      const validatorEmails = [
        "aValidator@unmail.com",
        "anotherValidator@unmail.com",
      ];
      const agency = new AgencyDtoBuilder(defaultAgency)
        .withValidatorEmails(validatorEmails)
        .build();

      uow.agencyRepository.setAgencies([agency]);

      await notifyNewConventionNeedsReview.execute({
        convention: conventionInReview,
      });

      expectToEqual(uow.shortLinkQuery.getShortLinks(), {
        [shortLinkIds[0]]: fakeGenerateMagicLinkUrlFn({
          id: conventionInReview.id,
          email: validatorEmails[0],
          now: timeGateway.now(),
          role: "validator",
          targetRoute: frontRoutes.conventionStatusDashboard,
        }),
        [shortLinkIds[1]]: fakeGenerateMagicLinkUrlFn({
          id: conventionInReview.id,
          email: validatorEmails[1],
          now: timeGateway.now(),
          role: "validator",
          targetRoute: frontRoutes.conventionStatusDashboard,
        }),
        [shortLinkIds[2]]: fakeGenerateMagicLinkUrlFn({
          id: conventionInReview.id,
          email: validatorEmails[0],
          now: timeGateway.now(),
          role: "validator",
          targetRoute: frontRoutes.manageConvention,
        }),
        [shortLinkIds[3]]: fakeGenerateMagicLinkUrlFn({
          id: conventionInReview.id,
          email: validatorEmails[1],
          now: timeGateway.now(),
          role: "validator",
          targetRoute: frontRoutes.manageConvention,
        }),
      });
      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
            recipients: [validatorEmails[0]],
            params: {
              conventionId: conventionInReview.id,
              internshipKind: conventionInReview.internshipKind,
              beneficiaryFirstName:
                conventionInReview.signatories.beneficiary.firstName,
              beneficiaryLastName:
                conventionInReview.signatories.beneficiary.lastName,
              businessName: conventionInReview.businessName,
              magicLink: makeShortLinkUrl(config, shortLinkIds[2]),
              conventionStatusLink: makeShortLinkUrl(config, shortLinkIds[0]),
              possibleRoleAction: "en considérer la validation",
              agencyLogoUrl: agency.logoUrl,
              validatorName: "John Doe",
            },
          },
          {
            kind: "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
            recipients: [validatorEmails[1]],
            params: {
              conventionId: conventionInReview.id,
              internshipKind: conventionInReview.internshipKind,
              beneficiaryFirstName:
                conventionInReview.signatories.beneficiary.firstName,
              beneficiaryLastName:
                conventionInReview.signatories.beneficiary.lastName,
              businessName: conventionInReview.businessName,
              magicLink: makeShortLinkUrl(config, shortLinkIds[3]),
              conventionStatusLink: makeShortLinkUrl(config, shortLinkIds[1]),
              possibleRoleAction: "en considérer la validation",
              agencyLogoUrl: agency.logoUrl,
              validatorName: "John Doe",
            },
          },
        ],
      });
    });
  });
});
