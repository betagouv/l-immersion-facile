import subDays from "date-fns/subDays";
import { difference } from "ramda";
import {
  AbsoluteUrl,
  AgencyRole,
  ConventionId,
  ConventionReadDto,
  Email,
  errors,
  executeInSequence,
  frontRoutes,
  immersionFacileNoReplyEmailSender,
} from "shared";
import { z } from "zod";
import { GenerateConventionMagicLinkUrl } from "../../../config/bootstrap/magicLinkUrl";
import { AssessmentRepository } from "../../convention/ports/AssessmentRepository";
import { ConventionRepository } from "../../convention/ports/ConventionRepository";
import { createTransactionalUseCase } from "../../core/UseCase";
import {
  NotificationContentAndFollowedIds,
  SaveNotificationAndRelatedEvent,
} from "../../core/notifications/helpers/Notification";
import { NotificationRepository } from "../../core/notifications/ports/NotificationRepository";
import { TimeGateway } from "../../core/time-gateway/ports/TimeGateway";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";

type AssessmentReminderOutput = {
  numberOfReminders: number;
};

export type AssessmentReminderMode =
  | "3daysAfterConventionEnd"
  | "10daysAfterConventionEnd";

export type AssessmentReminder = ReturnType<typeof makeAssessmentReminder>;
export const makeAssessmentReminder = createTransactionalUseCase<
  { mode: AssessmentReminderMode },
  AssessmentReminderOutput,
  void,
  {
    timeGateway: TimeGateway;
    saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent;
    generateConventionMagicLinkUrl: GenerateConventionMagicLinkUrl;
  }
>(
  {
    name: "AssessmentReminder",
    inputSchema: z.object({
      mode: z.enum(["3daysAfterConventionEnd", "10daysAfterConventionEnd"]),
    }),
  },
  async ({ inputParams: params, uow, deps }) => {
    const now = deps.timeGateway.now();
    const conventionIdsToRemind = await getConventionIdsToRemind({
      mode: params.mode,
      now,
      assessmentRepository: uow.assessmentRepository,
      conventionRepository: uow.conventionRepository,
      notificationRepository: uow.notificationRepository,
    });

    await executeInSequence(conventionIdsToRemind, async (conventionId) => {
      const convention =
        await uow.conventionQueries.getConventionById(conventionId);
      if (!convention)
        throw errors.convention.notFound({ conventionId: conventionId });
      await sendAssessmentReminders({
        uow,
        mode: params.mode,
        recipientEmails: convention.agencyValidatorEmails,
        convention,
        now,
        generateConventionMagicLinkUrl: deps.generateConventionMagicLinkUrl,
        saveNotificationAndRelatedEvent: deps.saveNotificationAndRelatedEvent,
        role: "validator",
      });
      await sendAssessmentReminders({
        uow,
        mode: params.mode,
        recipientEmails: convention.agencyCounsellorEmails,
        convention,
        now,
        generateConventionMagicLinkUrl: deps.generateConventionMagicLinkUrl,
        saveNotificationAndRelatedEvent: deps.saveNotificationAndRelatedEvent,
        role: "counsellor",
      });
    });

    return {
      numberOfReminders: conventionIdsToRemind.length,
    };
  },
);

const getConventionIdsToRemind = async ({
  mode,
  now,
  conventionRepository,
  assessmentRepository,
  notificationRepository,
}: {
  mode: AssessmentReminderMode;
  now: Date;
  conventionRepository: ConventionRepository;
  assessmentRepository: AssessmentRepository;
  notificationRepository: NotificationRepository;
}): Promise<ConventionId[]> => {
  const daysAfterLastNotifications =
    mode === "3daysAfterConventionEnd" ? 3 : 10;
  const potentialConventionsToRemind =
    await conventionRepository.getIdsValidatedByEndDateAround(
      subDays(now, daysAfterLastNotifications),
    );

  const conventionsWithAssessments = (
    await assessmentRepository.getByConventionIds(potentialConventionsToRemind)
  ).map((assessment) => assessment.conventionId);

  const ids = await notificationRepository.getConventionIdsWithoutNotifications(
    {
      emailType:
        mode === "3daysAfterConventionEnd"
          ? "ASSESSMENT_AGENCY_FIRST_REMINDER"
          : "ASSESSMENT_AGENCY_SECOND_REMINDER",
      conventionIds: difference(
        potentialConventionsToRemind,
        conventionsWithAssessments,
      ),
    },
  );

  return ids;
};

const createNotification = ({
  mode,
  convention,
  recipientEmail,
  establishmentContactEmail,
  assessmentCreationLink,
}: {
  mode: AssessmentReminderMode;
  convention: ConventionReadDto;
  recipientEmail: Email;
  establishmentContactEmail: Email;
  assessmentCreationLink: AbsoluteUrl;
}): NotificationContentAndFollowedIds => {
  return {
    followedIds: {
      agencyId: convention.agencyId,
      conventionId: convention.id,
      establishmentSiret: convention.siret,
    },
    kind: "email",
    templatedContent: {
      kind:
        mode === "3daysAfterConventionEnd"
          ? "ASSESSMENT_AGENCY_FIRST_REMINDER"
          : "ASSESSMENT_AGENCY_SECOND_REMINDER",
      params: {
        beneficiaryFirstName: convention.signatories.beneficiary.firstName,
        beneficiaryLastName: convention.signatories.beneficiary.lastName,
        conventionId: convention.id,
        internshipKind: convention.internshipKind,
        businessName: convention.businessName,
        assessmentCreationLink,
        establishmentContactEmail,
      },
      recipients: [recipientEmail],
      sender: immersionFacileNoReplyEmailSender,
    },
  };
};

const sendAssessmentReminders = async ({
  uow,
  mode,
  saveNotificationAndRelatedEvent,
  convention,
  recipientEmails,
  now,
  generateConventionMagicLinkUrl,
  role,
}: {
  uow: UnitOfWork;
  mode: AssessmentReminderMode;
  saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent;
  convention: ConventionReadDto;
  recipientEmails: Email[];
  now: Date;
  generateConventionMagicLinkUrl: GenerateConventionMagicLinkUrl;
  role: AgencyRole;
}) => {
  for (const recipientEmail of recipientEmails) {
    const assessmentCreationLink = generateConventionMagicLinkUrl({
      id: convention.id,
      email: recipientEmail,
      role,
      targetRoute: frontRoutes.assessment,
      now,
    });
    const notification = createNotification({
      mode,
      convention,
      recipientEmail: recipientEmail,
      establishmentContactEmail:
        convention.signatories.establishmentRepresentative.email,
      assessmentCreationLink,
    });
    await saveNotificationAndRelatedEvent(uow, notification);
  }
};
