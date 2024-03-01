import { format } from "date-fns";
import {
  type AgencyDto,
  type Beneficiary,
  type BeneficiaryCurrentEmployer,
  type BeneficiaryRepresentative,
  type ConventionDto,
  type ConventionReadDto,
  type EstablishmentRepresentative,
  type ExtractFromExisting,
  type GenericActor,
  type Phone,
  type Role,
  type TemplatedEmail,
  type TemplatedSms,
  filterNotFalsy,
  frontRoutes,
  isEstablishmentTutorIsEstablishmentRepresentative,
  isSignatoryRole,
} from "shared";
import { AppConfig } from "../../../../config/bootstrap/appConfig";
import { GenerateConventionMagicLinkUrl } from "../../../../config/bootstrap/magicLinkUrl";
import {
  ForbiddenError,
  NotFoundError,
} from "../../../../config/helpers/httpErrors";
import { TransactionalUseCase } from "../../../core/UseCase";
import {
  ConventionReminderPayload,
  ReminderKind,
} from "../../../core/events/eventPayload.dto";
import { conventionReminderPayloadSchema } from "../../../core/events/eventPayload.schema";
import { SaveNotificationAndRelatedEvent } from "../../../core/notifications/helpers/Notification";
import { prepareMagicShortLinkMaker } from "../../../core/short-link/ShortLink";
import { ShortLinkIdGeneratorGateway } from "../../../core/short-link/ports/ShortLinkIdGeneratorGateway";
import { TimeGateway } from "../../../core/time-gateway/ports/TimeGateway";
import { UnitOfWork } from "../../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../../core/unit-of-work/ports/UnitOfWorkPerformer";
import {
  missingAgencyMessage,
  missingConventionMessage,
} from "./NotifyLastSigneeThatConventionHasBeenSigned";

type EmailWithRole = {
  email: string;
  role: Role;
};

type SignatoriesReminderKind = ExtractFromExisting<
  ReminderKind,
  "FirstReminderForSignatories" | "LastReminderForSignatories"
>;

type AgenciesReminderKind = ExtractFromExisting<
  ReminderKind,
  "FirstReminderForAgency" | "LastReminderForAgency"
>;

export class NotifyConventionReminder extends TransactionalUseCase<
  ConventionReminderPayload,
  void
> {
  protected inputSchema = conventionReminderPayloadSchema;

  readonly #timeGateway: TimeGateway;

  readonly #saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent;

  readonly #generateConventionMagicLinkUrl: GenerateConventionMagicLinkUrl;

  readonly #shortLinkIdGeneratorGateway: ShortLinkIdGeneratorGateway;

  readonly #config: AppConfig;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    timeGateway: TimeGateway,
    saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent,
    generateConventionMagicLinkUrl: GenerateConventionMagicLinkUrl,
    shortLinkIdGeneratorGateway: ShortLinkIdGeneratorGateway,
    config: AppConfig,
  ) {
    super(uowPerformer);

    this.#config = config;
    this.#generateConventionMagicLinkUrl = generateConventionMagicLinkUrl;
    this.#saveNotificationAndRelatedEvent = saveNotificationAndRelatedEvent;
    this.#shortLinkIdGeneratorGateway = shortLinkIdGeneratorGateway;
    this.#timeGateway = timeGateway;
  }

  protected async _execute(
    { conventionId, reminderKind }: ConventionReminderPayload,
    uow: UnitOfWork,
  ) {
    const conventionRead =
      await uow.conventionQueries.getConventionById(conventionId);
    if (!conventionRead)
      throw new NotFoundError(missingConventionMessage(conventionId));

    if (
      reminderKind === "FirstReminderForSignatories" ||
      reminderKind === "LastReminderForSignatories"
    )
      return this.#onSignatoriesReminder(reminderKind, conventionRead, uow);

    const agency = await uow.agencyRepository.getById(conventionRead.agencyId);
    if (!agency) throw new NotFoundError(missingAgencyMessage(conventionRead));

    return this.#onAgencyReminder(reminderKind, conventionRead, agency, uow);
  }

  async #makeSignatoryReminderEmail(
    { role, email, firstName, lastName }: GenericActor<Role>,
    convention: ConventionDto,
    uow: UnitOfWork,
    kind: Extract<
      ReminderKind,
      "FirstReminderForSignatories" | "LastReminderForSignatories"
    >,
  ): Promise<TemplatedEmail> {
    const makeShortMagicLink = prepareMagicShortLinkMaker({
      config: this.#config,
      conventionMagicLinkPayload: {
        id: convention.id,
        role,
        email,
        now: this.#timeGateway.now(),
      },
      generateConventionMagicLinkUrl: this.#generateConventionMagicLinkUrl,
      shortLinkIdGeneratorGateway: this.#shortLinkIdGeneratorGateway,
      uow,
    });

    return {
      kind:
        kind === "FirstReminderForSignatories"
          ? "SIGNATORY_FIRST_REMINDER"
          : "SIGNATORY_LAST_REMINDER",
      recipients: [email],
      params: {
        actorFirstName: firstName,
        actorLastName: lastName,
        beneficiaryFirstName: convention.signatories.beneficiary.firstName,
        beneficiaryLastName: convention.signatories.beneficiary.lastName,
        businessName: convention.businessName,
        conventionId: convention.id,
        signatoriesSummary: toSignatoriesSummary(convention).join("\n"),
        magicLinkUrl: isSignatoryRole(role)
          ? await makeShortMagicLink(frontRoutes.conventionToSign)
          : undefined,
      },
    };
  }

  async #onAgencyReminder(
    reminderKind: AgenciesReminderKind,
    conventionRead: ConventionReadDto,
    agency: AgencyDto,
    uow: UnitOfWork,
  ): Promise<void> {
    if (conventionRead.status !== "IN_REVIEW")
      throw new ForbiddenError(
        forbiddenUnsupportedStatusMessage(conventionRead, reminderKind),
      );
    await Promise.all(
      [
        ...agency.counsellorEmails.map(
          (email) =>
            ({
              role: "counsellor",
              email,
            }) satisfies EmailWithRole,
        ),
        ...agency.validatorEmails.map(
          (email) =>
            ({
              role: "validator",
              email,
            }) satisfies EmailWithRole,
        ),
      ].map((emailWithRole) =>
        this.#sendAgencyReminderEmails(
          emailWithRole,
          conventionRead,
          agency,
          uow,
          reminderKind,
        ),
      ),
    );
  }

  async #onSignatoriesReminder(
    kind: SignatoriesReminderKind,
    conventionRead: ConventionReadDto,
    uow: UnitOfWork,
  ): Promise<void> {
    if (!["READY_TO_SIGN", "PARTIALLY_SIGNED"].includes(conventionRead.status))
      throw new ForbiddenError(
        forbiddenUnsupportedStatusMessage(conventionRead, kind),
      );

    const signatories = Object.values(conventionRead.signatories);

    const smsSignatories = signatories.filter(
      (signatory) => !signatory.signedAt && isValidMobilePhone(signatory.phone),
    );

    const emailActors = [
      ...signatories,
      ...(isEstablishmentTutorIsEstablishmentRepresentative(conventionRead)
        ? []
        : [conventionRead.establishmentTutor]),
    ];

    const templatedEmails: TemplatedEmail[] = await Promise.all(
      emailActors.map((actor) =>
        this.#makeSignatoryReminderEmail(actor, conventionRead, uow, kind),
      ),
    );
    const templatedSms = await Promise.all(
      smsSignatories.map((signatory) =>
        this.#prepareSmsReminderParams(signatory, conventionRead, uow, kind),
      ),
    );

    const followedIds = {
      conventionId: conventionRead.id,
      agencyId: conventionRead.agencyId,
      establishmentSiret: conventionRead.siret,
    };

    await Promise.all([
      ...templatedEmails.map((email) =>
        this.#saveNotificationAndRelatedEvent(uow, {
          kind: "email",
          followedIds,
          templatedContent: email,
        }),
      ),
      ...templatedSms.map((sms) =>
        this.#saveNotificationAndRelatedEvent(uow, {
          kind: "sms",
          followedIds,
          templatedContent: sms,
        }),
      ),
    ]);
  }

  async #prepareSmsReminderParams(
    { role, email, phone }: GenericActor<Role>,
    convention: ConventionReadDto,
    uow: UnitOfWork,
    kind: SignatoriesReminderKind,
  ): Promise<TemplatedSms> {
    const makeShortMagicLink = prepareMagicShortLinkMaker({
      config: this.#config,
      conventionMagicLinkPayload: {
        id: convention.id,
        role,
        email,
        now: this.#timeGateway.now(),
      },
      generateConventionMagicLinkUrl: this.#generateConventionMagicLinkUrl,
      shortLinkIdGeneratorGateway: this.#shortLinkIdGeneratorGateway,
      uow,
    });

    const shortLink = await makeShortMagicLink(frontRoutes.conventionToSign);

    return {
      kind,
      recipientPhone: makeInternationalPhone(phone),
      params: { shortLink },
    };
  }

  async #sendAgencyReminderEmails(
    { email, role }: EmailWithRole,
    convention: ConventionReadDto,
    agency: AgencyDto,
    uow: UnitOfWork,
    kind: AgenciesReminderKind,
  ): Promise<void> {
    const makeShortMagicLink = prepareMagicShortLinkMaker({
      config: this.#config,
      conventionMagicLinkPayload: {
        id: convention.id,
        role,
        email,
        now: this.#timeGateway.now(),
      },
      generateConventionMagicLinkUrl: this.#generateConventionMagicLinkUrl,
      shortLinkIdGeneratorGateway: this.#shortLinkIdGeneratorGateway,
      uow,
    });

    const templatedEmail: TemplatedEmail =
      kind === "FirstReminderForAgency"
        ? {
            kind: "AGENCY_FIRST_REMINDER",
            recipients: [email],
            params: {
              conventionId: convention.id,
              agencyName: agency.name,
              beneficiaryFirstName:
                convention.signatories.beneficiary.firstName,
              beneficiaryLastName: convention.signatories.beneficiary.lastName,
              businessName: convention.businessName,
              dateStart: convention.dateStart,
              dateEnd: convention.dateEnd,
              agencyMagicLinkUrl: await makeShortMagicLink(
                frontRoutes.manageConvention,
              ),
            },
          }
        : {
            kind: "AGENCY_LAST_REMINDER",
            recipients: [email],
            params: {
              conventionId: convention.id,
              beneficiaryFirstName:
                convention.signatories.beneficiary.firstName,
              beneficiaryLastName: convention.signatories.beneficiary.lastName,
              businessName: convention.businessName,
              agencyMagicLinkUrl: await makeShortMagicLink(
                frontRoutes.manageConvention,
              ),
            },
          };

    await this.#saveNotificationAndRelatedEvent(uow, {
      kind: "email",
      followedIds: {
        conventionId: convention.id,
        agencyId: agency.id,
        establishmentSiret: convention.siret,
      },
      templatedContent: templatedEmail,
    });

    return;
  }
}

export const forbiddenUnsupportedStatusMessage = (
  convention: ConventionDto,
  kind: ReminderKind,
): string =>
  `Convention status ${convention.status} is not supported for reminder ${kind}.`;

export const toSignatoriesSummary = ({
  signatories,
  businessName,
}: ConventionDto): string[] =>
  [
    beneficiarySummary(signatories.beneficiary),
    beneficiaryRepresentativeSummary(signatories.beneficiaryRepresentative),
    beneficiaryCurrentEmployer(signatories.beneficiaryCurrentEmployer),
    establishmentSummary(signatories.establishmentRepresentative, businessName),
  ].filter(filterNotFalsy);

const beneficiarySummary = (
  beneficiary: Beneficiary<"immersion" | "mini-stage-cci">,
): string =>
  `- ${signStatus(beneficiary.signedAt)} - ${beneficiary.firstName} ${
    beneficiary.lastName
  }, bénéficiaire`;

const beneficiaryRepresentativeSummary = (
  beneficiaryRepresentative: BeneficiaryRepresentative | undefined,
): string | undefined =>
  beneficiaryRepresentative &&
  `- ${signStatus(beneficiaryRepresentative.signedAt)} - ${
    beneficiaryRepresentative.firstName
  } ${beneficiaryRepresentative.lastName}, représentant légal du bénéficiaire`;

const beneficiaryCurrentEmployer = (
  beneficiaryCurrentEmployer: BeneficiaryCurrentEmployer | undefined,
): string | undefined =>
  beneficiaryCurrentEmployer &&
  `- ${signStatus(beneficiaryCurrentEmployer.signedAt)} - ${
    beneficiaryCurrentEmployer.firstName
  } ${beneficiaryCurrentEmployer.lastName}, employeur actuel du bénéficiaire`;

const establishmentSummary = (
  establishmentRepresentative: EstablishmentRepresentative,
  businessName: string,
): string =>
  `- ${signStatus(establishmentRepresentative.signedAt)} - ${
    establishmentRepresentative.firstName
  } ${
    establishmentRepresentative.lastName
  }, représentant l'entreprise ${businessName}`;

const signStatus = (signAt: string | undefined): string =>
  signAt
    ? `√  - A signé le ${format(new Date(signAt), "dd/MM/yyyy")}`
    : `❌ - N'a pas signé`;

const isValidMobilePhone = (phone: string): boolean =>
  (phone.startsWith("06") || phone.startsWith("07")) && phone.length === 10;

function makeInternationalPhone(phone: string): Phone {
  if (phone.startsWith("0690") || phone.startsWith("0691"))
    return `590${phone.substring(1)}`;
  if (phone.startsWith("0694")) return `594${phone.substring(1)}`;
  if (phone.startsWith("0696") || phone.startsWith("0697"))
    return `596${phone.substring(1)}`;
  if (
    phone.startsWith("0692") ||
    phone.startsWith("0693") ||
    phone.startsWith("0639")
  )
    return `262${phone.substring(1)}`;
  return `33${phone.substring(1)}`;
}
