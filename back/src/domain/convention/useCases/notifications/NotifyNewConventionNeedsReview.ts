import {
  AgencyDto,
  concatValidatorNames,
  ConventionDto,
  conventionSchema,
  ConventionStatus,
  frontRoutes,
  Role,
  TemplatedEmail,
} from "shared";
import { AppConfig } from "../../../../adapters/primary/config/appConfig";
import { GenerateConventionMagicLinkUrl } from "../../../../adapters/primary/config/magicLinkUrl";
import { createLogger } from "../../../../utils/logger";
import { ShortLinkIdGeneratorGateway } from "../../../core/ports/ShortLinkIdGeneratorGateway";
import { TimeGateway } from "../../../core/ports/TimeGateway";
import {
  UnitOfWork,
  UnitOfWorkPerformer,
} from "../../../core/ports/UnitOfWork";
import { prepareMagicShortLinkMaker } from "../../../core/ShortLink";
import { TransactionalUseCase } from "../../../core/UseCase";
import { SaveNotificationAndRelatedEvent } from "../../../generic/notifications/entities/Notification";

const logger = createLogger(__filename);

export class NotifyNewConventionNeedsReview extends TransactionalUseCase<ConventionDto> {
  protected inputSchema = conventionSchema;

  readonly #saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent;

  readonly #generateConventionMagicLinkUrl: GenerateConventionMagicLinkUrl;

  readonly #timeGateway: TimeGateway;

  readonly #shortLinkIdGeneratorGateway: ShortLinkIdGeneratorGateway;

  readonly #config: AppConfig;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent,
    generateConventionMagicLinkUrl: GenerateConventionMagicLinkUrl,
    timeGateway: TimeGateway,
    shortLinkIdGeneratorGateway: ShortLinkIdGeneratorGateway,
    config: AppConfig,
  ) {
    super(uowPerformer);

    this.#saveNotificationAndRelatedEvent = saveNotificationAndRelatedEvent;
    this.#generateConventionMagicLinkUrl = generateConventionMagicLinkUrl;
    this.#timeGateway = timeGateway;
    this.#shortLinkIdGeneratorGateway = shortLinkIdGeneratorGateway;
    this.#config = config;
  }

  protected async _execute(
    convention: ConventionDto,
    uow: UnitOfWork,
  ): Promise<void> {
    const agency = await uow.agencyRepository.getById(convention.agencyId);

    if (!agency) {
      logger.error(
        { agencyId: convention.agencyId },
        "No Agency Config found for this agency code",
      );
      return;
    }

    const recipients = determineRecipients(convention.status, agency);
    logger.debug("conventionDto.status : " + convention.status);

    if (!recipients) {
      logger.error(
        {
          conventionId: convention.id,
          status: convention.status,
          agencyId: convention.agencyId,
        },
        "Unable to find appropriate recipient for validation notification.",
      );
      return;
    }

    logger.info(
      {
        recipients,
        conventionId: convention.id,
      },
      "Sending Mail to review an immersion",
    );

    const emails: TemplatedEmail[] = await Promise.all(
      recipients.emails.map(async (recipientEmail) => {
        const makeShortMagicLink = prepareMagicShortLinkMaker({
          config: this.#config,
          conventionMagicLinkPayload: {
            id: convention.id,
            role: recipients.role,
            email: recipientEmail,
            now: this.#timeGateway.now(),
          },
          generateConventionMagicLinkUrl: this.#generateConventionMagicLinkUrl,
          shortLinkIdGeneratorGateway: this.#shortLinkIdGeneratorGateway,
          uow,
        });

        return {
          kind: "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
          recipients: [recipientEmail],
          params: {
            agencyLogoUrl: agency.logoUrl,
            beneficiaryFirstName: convention.signatories.beneficiary.firstName,
            beneficiaryLastName: convention.signatories.beneficiary.lastName,
            businessName: convention.businessName,
            conventionId: convention.id,
            conventionStatusLink: await makeShortMagicLink(
              frontRoutes.conventionStatusDashboard,
            ),
            internshipKind: convention.internshipKind,
            magicLink: await makeShortMagicLink(frontRoutes.manageConvention),
            possibleRoleAction:
              recipients.role === "counsellor"
                ? "en vérifier l'éligibilité"
                : "en considérer la validation",
            validatorName: convention.validators?.agencyCounsellor
              ? concatValidatorNames(convention.validators?.agencyCounsellor)
              : "",
          },
        };
      }),
    );

    await Promise.all(
      emails.map((email) =>
        this.#saveNotificationAndRelatedEvent(uow, {
          kind: "email",
          templatedContent: email,
          followedIds: {
            conventionId: convention.id,
            agencyId: convention.agencyId,
            establishmentSiret: convention.siret,
          },
        }),
      ),
    );

    logger.info(
      {
        recipients,
        conventionId: convention.id,
      },
      "Mail to review an immersion sent",
    );
  }
}

type Recipients = {
  role: Role;
  emails: string[];
};

const determineRecipients = (
  status: ConventionStatus,
  agency: AgencyDto,
): Recipients | undefined => {
  const hasCounsellorEmails = agency.counsellorEmails.length > 0;
  const hasValidatorEmails = agency.validatorEmails.length > 0;
  const hasAdminEmails = agency.adminEmails.length > 0;

  switch (status) {
    case "IN_REVIEW": {
      if (hasCounsellorEmails)
        return { role: "counsellor", emails: agency.counsellorEmails };
      if (hasValidatorEmails)
        return { role: "validator", emails: agency.validatorEmails };
      return;
    }
    case "ACCEPTED_BY_COUNSELLOR":
      return hasValidatorEmails
        ? { role: "validator", emails: agency.validatorEmails }
        : undefined;
    case "ACCEPTED_BY_VALIDATOR":
      return hasAdminEmails
        ? { role: "backOffice", emails: agency.adminEmails }
        : undefined;
    default:
      // This notification may fire when using the /debug/populate route, with
      // statuses not included in the above list. Ignore this case.
      return;
  }
};
