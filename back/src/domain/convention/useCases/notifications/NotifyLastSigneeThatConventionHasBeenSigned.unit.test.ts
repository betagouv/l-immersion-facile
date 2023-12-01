import {
  AgencyDto,
  ConventionDto,
  ConventionDtoBuilder,
  expectPromiseToFailWithError,
  frontRoutes,
} from "shared";
import { fakeGenerateMagicLinkUrlFn } from "../../../../_testBuilders/jwtTestHelper";
import {
  ExpectSavedNotificationsAndEvents,
  makeExpectSavedNotificationsAndEvents,
} from "../../../../_testBuilders/makeExpectSavedNotificationsAndEvents";
import {
  createInMemoryUow,
  InMemoryUnitOfWork,
} from "../../../../adapters/primary/config/uowConfig";
import { CustomTimeGateway } from "../../../../adapters/secondary/core/TimeGateway/CustomTimeGateway";
import { UuidV4Generator } from "../../../../adapters/secondary/core/UuidGeneratorImplementations";
import { InMemoryUowPerformer } from "../../../../adapters/secondary/InMemoryUowPerformer";
import { makeSaveNotificationAndRelatedEvent } from "../../../generic/notifications/entities/Notification";
import {
  missingConventionMessage,
  noSignatoryMessage,
  NotifyLastSigneeThatConventionHasBeenSigned,
} from "./NotifyLastSigneeThatConventionHasBeenSigned";

describe("NotifyLastSigneeThatConventionHasBeenSigned", () => {
  let conventionSignedByNoOne: ConventionDto;
  let notifyLastSignee: NotifyLastSigneeThatConventionHasBeenSigned;
  let uow: InMemoryUnitOfWork;
  let timeGateway: CustomTimeGateway;
  let agency: AgencyDto;
  let expectSavedNotificationsAndEvents: ExpectSavedNotificationsAndEvents;

  beforeEach(() => {
    uow = createInMemoryUow();
    agency = uow.agencyRepository.agencies[0];
    conventionSignedByNoOne = new ConventionDtoBuilder()
      .withAgencyId(agency.id)
      .signedByBeneficiary(undefined)
      .signedByEstablishmentRepresentative(undefined)
      .build();

    expectSavedNotificationsAndEvents = makeExpectSavedNotificationsAndEvents(
      uow.notificationRepository,
      uow.outboxRepository,
    );

    timeGateway = new CustomTimeGateway();

    const uuidGenerator = new UuidV4Generator();
    const saveNotificationAndRelatedEvent = makeSaveNotificationAndRelatedEvent(
      uuidGenerator,
      timeGateway,
    );

    notifyLastSignee = new NotifyLastSigneeThatConventionHasBeenSigned(
      new InMemoryUowPerformer(uow),
      saveNotificationAndRelatedEvent,
      fakeGenerateMagicLinkUrlFn,
      timeGateway,
    );
  });

  it("Last signed by beneficiary, no more signees", async () => {
    const signedConvention = new ConventionDtoBuilder(conventionSignedByNoOne)
      .signedByBeneficiary(new Date().toISOString())
      .build();
    const now = new Date();
    timeGateway.setNextDate(now);

    uow.conventionRepository.setConventions([signedConvention]);

    await notifyLastSignee.execute({ convention: signedConvention });
    const conventionStatusLink = fakeGenerateMagicLinkUrlFn({
      targetRoute: frontRoutes.conventionStatusDashboard,
      id: signedConvention.id,
      role: "beneficiary",
      email: signedConvention.signatories.beneficiary.email,
      now,
    });

    expectSavedNotificationsAndEvents({
      emails: [
        {
          params: {
            internshipKind: signedConvention.internshipKind,
            conventionId: signedConvention.id,
            signedAt: signedConvention.signatories.beneficiary.signedAt!,
            conventionStatusLink,
            agencyLogoUrl: agency.logoUrl,
            agencyName: agency.name,
          },
          recipients: [signedConvention.signatories.beneficiary.email],
          kind: "SIGNEE_HAS_SIGNED_CONVENTION",
        },
      ],
    });
  });

  it("Last signed by establishment representative, beneficiary already signed", async () => {
    const signedConvention = new ConventionDtoBuilder(conventionSignedByNoOne)
      .signedByBeneficiary(new Date().toISOString())
      .signedByEstablishmentRepresentative(new Date().toISOString())
      .build();
    const now = new Date();
    timeGateway.setNextDate(now);
    uow.conventionRepository.setConventions([signedConvention]);

    await notifyLastSignee.execute({ convention: signedConvention });

    expectSavedNotificationsAndEvents({
      emails: [
        {
          params: {
            internshipKind: signedConvention.internshipKind,
            signedAt:
              signedConvention.signatories.establishmentRepresentative
                .signedAt!,
            conventionId: signedConvention.id,
            conventionStatusLink: fakeGenerateMagicLinkUrlFn({
              targetRoute: frontRoutes.conventionStatusDashboard,
              id: signedConvention.id,
              role: "establishment-representative",
              email:
                signedConvention.signatories.establishmentRepresentative.email,
              now,
            }),
            agencyLogoUrl: agency.logoUrl,
            agencyName: agency.name,
          },
          recipients: [
            signedConvention.signatories.establishmentRepresentative.email,
          ],
          kind: "SIGNEE_HAS_SIGNED_CONVENTION",
        },
      ],
    });
  });

  it("No one has signed the convention.", async () => {
    uow.conventionRepository.setConventions([conventionSignedByNoOne]);

    await expectPromiseToFailWithError(
      notifyLastSignee.execute({ convention: conventionSignedByNoOne }),
      new Error(noSignatoryMessage(conventionSignedByNoOne)),
    );

    expectSavedNotificationsAndEvents({ emails: [] });
  });

  it("No convention on repository.", async () => {
    uow.conventionRepository.setConventions([]);

    await expectPromiseToFailWithError(
      notifyLastSignee.execute({ convention: conventionSignedByNoOne }),
      new Error(missingConventionMessage(conventionSignedByNoOne.id)),
    );

    expectSavedNotificationsAndEvents({ emails: [] });
  });
});
