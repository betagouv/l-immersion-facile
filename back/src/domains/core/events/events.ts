import {
  AgencyId,
  ContactEstablishmentEventPayload,
  ConventionId,
  DateString,
  EstablishmentJwtPayload,
  Flavor,
  IdentityProvider,
  RejectIcUserRoleForAgencyParams,
  Role,
  SiretDto,
  UserId,
  WithAgencyId,
  WithAgencyIdAndUserId,
  WithAssessmentDto,
  WithConventionDto,
  WithConventionIdLegacy,
  WithDiscussionId,
  WithFormEstablishmentDto,
  WithSiretDto,
  roleSchema,
  siretSchema,
  userIdSchema,
} from "shared";
import { z } from "zod";
import { RenewMagicLinkPayload } from "../../convention/use-cases/notifications/DeliverRenewedMagicLink";
import { WithEstablishmentAggregate } from "../../establishment/entities/EstablishmentAggregate";
import { WithNotificationIdAndKind } from "../notifications/helpers/Notification";
import {
  ConventionReminderPayload,
  ConventionRequiresModificationPayload,
} from "./eventPayload.dto";

export type SubscriptionId = Flavor<string, "SubscriptionId">;

export type EventFailure = {
  subscriptionId: SubscriptionId;
  errorMessage: string;
};

export type EventPublication = {
  publishedAt: DateString;
  failures: EventFailure[];
};

export type EventStatus =
  | "never-published"
  | "to-republish"
  | "in-process"
  | "published"
  | "failed-but-will-retry"
  | "failed-to-many-times";

type GenericEvent<T extends string, P> = {
  id: string;
  occurredAt: DateString;
  topic: T;
  payload: P;
  publications: EventPublication[];
  wasQuarantined: boolean;
  status: EventStatus;
};

export type NotificationAddedEvent = GenericEvent<
  "NotificationAdded",
  WithNotificationIdAndKind
>;
export type NotificationBatchAddedEvent = GenericEvent<
  "NotificationBatchAdded",
  WithNotificationIdAndKind[]
>;

export type UserAuthenticatedPayload = {
  userId: string;
  provider: IdentityProvider;
  codeSafir: string | null;
};

export type TriggeredBy =
  | { kind: "inclusion-connected"; userId: UserId }
  | { kind: "convention-magic-link"; role: Role }
  | { kind: "establishment-magic-link"; siret: SiretDto }
  | { kind: "crawler" };

export const triggeredBySchema: z.Schema<TriggeredBy> = z.discriminatedUnion(
  "kind",
  [
    z.object({ kind: z.literal("inclusion-connected"), userId: userIdSchema }),
    z.object({ kind: z.literal("convention-magic-link"), role: roleSchema }),
    z.object({
      kind: z.literal("establishment-magic-link"),
      siret: siretSchema,
    }),
  ],
);

export type WithTriggeredBy = {
  triggeredBy: TriggeredBy | null;
};

export const withTriggeredBySchema: z.Schema<WithTriggeredBy> = z.object({
  triggeredBy: triggeredBySchema.or(z.null()),
});

// biome-ignore format: better readability without formatting
export type DomainEvent =
  | NotificationAddedEvent
  | NotificationBatchAddedEvent
  // IMMERSION APPLICATION RELATED
  // HAPPY PATH
  | GenericEvent<"ConventionSubmittedByBeneficiary", WithConventionDto & Partial<WithDiscussionId> & WithTriggeredBy>
  | GenericEvent<"ConventionSubmittedAfterModification", WithConventionDto & WithTriggeredBy>
  | GenericEvent<"ConventionPartiallySigned", WithConventionDto & WithTriggeredBy>
  | GenericEvent<"ConventionFullySigned", WithConventionDto & WithTriggeredBy>
  | GenericEvent<"ConventionAcceptedByCounsellor", WithConventionDto & WithTriggeredBy>
  | GenericEvent<"ConventionAcceptedByValidator", WithConventionDto & WithTriggeredBy>
  | GenericEvent<"ConventionReminderRequired", ConventionReminderPayload>
  | GenericEvent<"ConventionBroadcastRequested", WithConventionDto & WithTriggeredBy>

  // UNHAPPY PATHS
  | GenericEvent<"ConventionRejected", WithConventionDto & WithTriggeredBy>
  | GenericEvent<"ConventionCancelled", WithConventionDto & WithTriggeredBy>
  | GenericEvent<"ConventionRequiresModification", ConventionRequiresModificationPayload & WithTriggeredBy>
  | GenericEvent<"ConventionDeprecated", WithConventionDto & WithTriggeredBy>

  // MAGIC LINK RENEWAL
  | GenericEvent<"MagicLinkRenewalRequested", RenewMagicLinkPayload & WithTriggeredBy>

  // FORM ESTABLISHMENT RELATED
  | GenericEvent<"FormEstablishmentEdited", WithFormEstablishmentDto & WithTriggeredBy>
  | GenericEvent<"ContactRequestedByBeneficiary", ContactEstablishmentEventPayload & WithTriggeredBy>
  | GenericEvent<"FormEstablishmentEditLinkSent", EstablishmentJwtPayload & WithTriggeredBy>
  | GenericEvent<"NewEstablishmentAggregateInsertedFromForm", WithEstablishmentAggregate & WithTriggeredBy>
  | GenericEvent<"UpdatedEstablishmentAggregateInsertedFromForm", WithSiretDto & WithTriggeredBy>
  | GenericEvent<"ExchangeAddedToDiscussion", WithSiretDto & WithDiscussionId>

  // ESTABLISHMENT LEAD RELATED
  | GenericEvent<"EstablishmentLeadReminderSent", WithConventionIdLegacy>
  
  // AGENCY RELATED
  | GenericEvent<"NewAgencyAdded", WithAgencyId & WithTriggeredBy>
  | GenericEvent<"AgencyActivated", WithAgencyId & WithTriggeredBy>
  | GenericEvent<"AgencyUpdated", WithAgencyId & WithTriggeredBy>
  | GenericEvent<"AgencyRejected", WithAgencyId & WithTriggeredBy>

  // IMMERSION ASSESSMENT related
  | GenericEvent<"AssessmentCreated", WithAssessmentDto & WithTriggeredBy>
  | GenericEvent<"EmailWithLinkToCreateAssessmentSent", WithConventionIdLegacy>
  | GenericEvent<"BeneficiaryAssessmentEmailSent", WithConventionIdLegacy>

  // PECONNECT related
  | GenericEvent<"FederatedIdentityBoundToConvention", WithConventionDto & WithTriggeredBy>
  | GenericEvent<"FederatedIdentityNotBoundToConvention", WithConventionDto & WithTriggeredBy>
  // USER CONNECTED related (only inclusion connect for now).
  // We don't put full OAuth in payload to avoid private data in logs etc...
  | GenericEvent<"UserAuthenticatedSuccessfully", UserAuthenticatedPayload & WithTriggeredBy>
  | GenericEvent<"AgencyRegisteredToInclusionConnectedUser", { userId: UserId; agencyIds: AgencyId[] } & WithTriggeredBy>
  | GenericEvent<"IcUserAgencyRightChanged", WithAgencyIdAndUserId & WithTriggeredBy>
  | GenericEvent<"IcUserAgencyRightRejected", RejectIcUserRoleForAgencyParams & WithTriggeredBy>
  // API CONSUMER related
  | GenericEvent<"ApiConsumerSaved", { consumerId: string } & WithTriggeredBy>
  // ERRORED CONVENTION RELATED
  | GenericEvent<"PartnerErroredConventionMarkedAsHandled", { conventionId: ConventionId; userId: UserId } & WithTriggeredBy>;

export type DomainTopic = DomainEvent["topic"];
