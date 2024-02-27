import {
  AgencyDtoBuilder,
  ConventionDto,
  ConventionDtoBuilder,
  expectPromiseToFailWithError,
} from "shared";
import { AppConfig } from "../../../../adapters/primary/config/appConfig";
import {
  InMemoryUnitOfWork,
  createInMemoryUow,
} from "../../../../adapters/primary/config/uowConfig";
import { InMemoryUowPerformer } from "../../../../adapters/secondary/InMemoryUowPerformer";
import { UuidV4Generator } from "../../../../adapters/secondary/core/UuidGeneratorImplementations";
import { DeterministShortLinkIdGeneratorGateway } from "../../../../adapters/secondary/shortLinkIdGeneratorGateway/DeterministShortLinkIdGeneratorGateway";
import { AppConfigBuilder } from "../../../../utils/AppConfigBuilder";
import { fakeGenerateMagicLinkUrlFn } from "../../../../utils/jwtTestHelper";
import {
  ExpectSavedNotificationsAndEvents,
  makeExpectSavedNotificationsAndEvents,
} from "../../../../utils/makeExpectSavedNotificationsAndEvents";
import { makeShortLinkUrl } from "../../../core/ShortLink";
import { ShortLinkId } from "../../../core/ports/ShortLinkQuery";
import { CustomTimeGateway } from "../../../core/time-gateway/adapters/CustomTimeGateway";
import { makeSaveNotificationAndRelatedEvent } from "../../../generic/notifications/entities/Notification";
import { conventionMissingMessage } from "../../entities/Convention";
import { missingAgencyMessage } from "./NotifyLastSigneeThatConventionHasBeenSigned";
import {
  NO_JUSTIFICATION,
  NotifySignatoriesThatConventionSubmittedNeedsSignatureAfterModification,
} from "./NotifySignatoriesThatConventionSubmittedNeedsSignatureAfterModification";

describe("NotifySignatoriesThatConventionSubmittedNeedsSignatureAfterModification", () => {
  let useCase: NotifySignatoriesThatConventionSubmittedNeedsSignatureAfterModification;
  let config: AppConfig;
  let shortLinkGenerator: DeterministShortLinkIdGeneratorGateway;
  let expectSavedNotificationsAndEvents: ExpectSavedNotificationsAndEvents;
  let uow: InMemoryUnitOfWork;

  beforeEach(() => {
    config = new AppConfigBuilder({}).build();
    shortLinkGenerator = new DeterministShortLinkIdGeneratorGateway();

    uow = createInMemoryUow();
    const uuidGenerator = new UuidV4Generator();
    const timeGateway = new CustomTimeGateway(new Date());
    useCase =
      new NotifySignatoriesThatConventionSubmittedNeedsSignatureAfterModification(
        new InMemoryUowPerformer(uow),
        timeGateway,
        shortLinkGenerator,
        config,
        makeSaveNotificationAndRelatedEvent(uuidGenerator, timeGateway),
        fakeGenerateMagicLinkUrlFn,
      );
    expectSavedNotificationsAndEvents = makeExpectSavedNotificationsAndEvents(
      uow.notificationRepository,
      uow.outboxRepository,
    );
  });

  describe("Right paths", () => {
    it("Convention with minimal signatories", async () => {
      const justification = "justif";
      const { convention, agency, shortLinks } = prepareScenario(
        uow,
        shortLinkGenerator,
        new ConventionDtoBuilder()
          .withStatusJustification(justification)
          .build(),
        ["shortLink1", "shortLink2"],
      );

      await useCase.execute({ convention });

      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE_AFTER_MODIFICATION",
            recipients: [convention.signatories.beneficiary.email],
            params: {
              agencyLogoUrl: agency.logoUrl ?? undefined,
              beneficiaryFirstName:
                convention.signatories.beneficiary.firstName,
              beneficiaryLastName: convention.signatories.beneficiary.lastName,
              businessName: convention.businessName,
              conventionId: convention.id,
              conventionSignShortlink: makeShortLinkUrl(config, shortLinks[0]),
              internshipKind: convention.internshipKind,
              justification,
              signatoryFirstName: convention.signatories.beneficiary.firstName,
              signatoryLastName: convention.signatories.beneficiary.lastName,
            },
          },
          {
            kind: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE_AFTER_MODIFICATION",
            recipients: [
              convention.signatories.establishmentRepresentative.email,
            ],
            params: {
              agencyLogoUrl: agency.logoUrl ?? undefined,
              beneficiaryFirstName:
                convention.signatories.beneficiary.firstName,
              beneficiaryLastName: convention.signatories.beneficiary.lastName,
              businessName: convention.businessName,
              conventionId: convention.id,
              conventionSignShortlink: makeShortLinkUrl(config, shortLinks[1]),
              internshipKind: convention.internshipKind,
              justification,
              signatoryFirstName:
                convention.signatories.establishmentRepresentative.firstName,
              signatoryLastName:
                convention.signatories.establishmentRepresentative.lastName,
            },
          },
        ],
      });
    });

    it("Convention without justification", async () => {
      const { convention, agency, shortLinks } = prepareScenario(
        uow,
        shortLinkGenerator,
        new ConventionDtoBuilder().build(),
        ["shortLink1", "shortLink2"],
      );

      await useCase.execute({ convention });

      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE_AFTER_MODIFICATION",
            recipients: [convention.signatories.beneficiary.email],
            params: {
              agencyLogoUrl: agency.logoUrl ?? undefined,
              beneficiaryFirstName:
                convention.signatories.beneficiary.firstName,
              beneficiaryLastName: convention.signatories.beneficiary.lastName,
              businessName: convention.businessName,
              conventionId: convention.id,
              conventionSignShortlink: makeShortLinkUrl(config, shortLinks[0]),
              internshipKind: convention.internshipKind,
              justification: NO_JUSTIFICATION,
              signatoryFirstName: convention.signatories.beneficiary.firstName,
              signatoryLastName: convention.signatories.beneficiary.lastName,
            },
          },
          {
            kind: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE_AFTER_MODIFICATION",
            recipients: [
              convention.signatories.establishmentRepresentative.email,
            ],
            params: {
              agencyLogoUrl: agency.logoUrl ?? undefined,
              beneficiaryFirstName:
                convention.signatories.beneficiary.firstName,
              beneficiaryLastName: convention.signatories.beneficiary.lastName,
              businessName: convention.businessName,
              conventionId: convention.id,
              conventionSignShortlink: makeShortLinkUrl(config, shortLinks[1]),
              internshipKind: convention.internshipKind,
              justification: NO_JUSTIFICATION,
              signatoryFirstName:
                convention.signatories.establishmentRepresentative.firstName,
              signatoryLastName:
                convention.signatories.establishmentRepresentative.lastName,
            },
          },
        ],
      });
    });

    it("Convention with all signatories", async () => {
      const justification = "justif";

      const { convention, agency, shortLinks } = prepareScenario(
        uow,
        shortLinkGenerator,
        new ConventionDtoBuilder()
          .withStatusJustification(justification)
          .withBeneficiaryRepresentative({
            firstName: "benef rep first name",
            lastName: "benef rep last name",
            email: "benefrep@email.com",
            phone: "0600558877",
            role: "beneficiary-representative",
          })
          .withBeneficiaryCurrentEmployer({
            firstName: "benef cur emp first name",
            lastName: "benef cur emp last name",
            email: "benefcuremp@email.com",
            phone: "0600777777",
            businessAddress: "13 rue de la soif, 60666 Quimper",
            businessName: "Merguez Corp",
            businessSiret: "77884455998877",
            job: "Lanceur de guezmer",
            role: "beneficiary-current-employer",
          })
          .build(),
        ["shortLink1", "shortLink2", "shortLink3", "shortLink4"],
      );

      await useCase.execute({ convention });

      expectSavedNotificationsAndEvents({
        emails: [
          {
            kind: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE_AFTER_MODIFICATION",
            recipients: [convention.signatories.beneficiary.email],
            params: {
              agencyLogoUrl: agency.logoUrl ?? undefined,
              beneficiaryFirstName:
                convention.signatories.beneficiary.firstName,
              beneficiaryLastName: convention.signatories.beneficiary.lastName,
              businessName: convention.businessName,
              conventionId: convention.id,
              conventionSignShortlink: makeShortLinkUrl(config, shortLinks[0]),
              internshipKind: convention.internshipKind,
              justification,
              signatoryFirstName: convention.signatories.beneficiary.firstName,
              signatoryLastName: convention.signatories.beneficiary.lastName,
            },
          },
          {
            kind: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE_AFTER_MODIFICATION",
            recipients: [
              convention.signatories.establishmentRepresentative.email,
            ],
            params: {
              agencyLogoUrl: agency.logoUrl ?? undefined,
              beneficiaryFirstName:
                convention.signatories.beneficiary.firstName,
              beneficiaryLastName: convention.signatories.beneficiary.lastName,
              businessName: convention.businessName,
              conventionId: convention.id,
              conventionSignShortlink: makeShortLinkUrl(config, shortLinks[1]),
              internshipKind: convention.internshipKind,
              justification,
              signatoryFirstName:
                convention.signatories.establishmentRepresentative.firstName,
              signatoryLastName:
                convention.signatories.establishmentRepresentative.lastName,
            },
          },
          {
            kind: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE_AFTER_MODIFICATION",
            recipients: [
              // biome-ignore lint/style/noNonNullAssertion:
              convention.signatories.beneficiaryRepresentative!.email,
            ],
            params: {
              agencyLogoUrl: agency.logoUrl ?? undefined,
              beneficiaryFirstName:
                convention.signatories.beneficiary.firstName,
              beneficiaryLastName: convention.signatories.beneficiary.lastName,
              businessName: convention.businessName,
              conventionId: convention.id,
              conventionSignShortlink: makeShortLinkUrl(config, shortLinks[2]),
              internshipKind: convention.internshipKind,
              justification,
              signatoryFirstName:
                // biome-ignore lint/style/noNonNullAssertion:
                convention.signatories.beneficiaryRepresentative!.firstName,
              signatoryLastName:
                // biome-ignore lint/style/noNonNullAssertion:
                convention.signatories.beneficiaryRepresentative!.lastName,
            },
          },
          {
            kind: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE_AFTER_MODIFICATION",
            recipients: [
              // biome-ignore lint/style/noNonNullAssertion:
              convention.signatories.beneficiaryCurrentEmployer!.email,
            ],
            params: {
              agencyLogoUrl: agency.logoUrl ?? undefined,
              beneficiaryFirstName:
                convention.signatories.beneficiary.firstName,
              beneficiaryLastName: convention.signatories.beneficiary.lastName,
              businessName: convention.businessName,
              conventionId: convention.id,
              conventionSignShortlink: makeShortLinkUrl(config, shortLinks[3]),
              internshipKind: convention.internshipKind,
              justification,
              signatoryFirstName:
                // biome-ignore lint/style/noNonNullAssertion:
                convention.signatories.beneficiaryCurrentEmployer!.firstName,

              signatoryLastName:
                // biome-ignore lint/style/noNonNullAssertion:
                convention.signatories.beneficiaryCurrentEmployer!.lastName,
            },
          },
        ],
      });
    });
  });

  describe("Wrong paths", () => {
    it("Convention missing", async () => {
      const convention = new ConventionDtoBuilder().build();
      uow.agencyRepository.setAgencies([new AgencyDtoBuilder().build()]);

      await expectPromiseToFailWithError(
        useCase.execute({ convention }),
        new Error(conventionMissingMessage(convention.id)),
      );

      await expectSavedNotificationsAndEvents({});
    });

    it("Agency missing", async () => {
      const convention = new ConventionDtoBuilder().build();
      const agency = new AgencyDtoBuilder().build();
      uow.conventionRepository.setConventions([
        new ConventionDtoBuilder(convention).withAgencyId(agency.id).build(),
      ]);

      await expectPromiseToFailWithError(
        useCase.execute({ convention }),
        new Error(missingAgencyMessage(convention)),
      );

      await expectSavedNotificationsAndEvents({});
    });
  });
});

const prepareScenario = (
  uow: InMemoryUnitOfWork,
  shortLinkGenerator: DeterministShortLinkIdGeneratorGateway,
  convention: ConventionDto,
  shortLinks: ShortLinkId[],
) => {
  const agency = new AgencyDtoBuilder().build();

  uow.agencyRepository.setAgencies([agency]);
  uow.conventionRepository.setConventions([
    new ConventionDtoBuilder(convention).withAgencyId(agency.id).build(),
  ]);
  shortLinkGenerator.addMoreShortLinkIds(shortLinks);
  return { convention, agency, shortLinks };
};
