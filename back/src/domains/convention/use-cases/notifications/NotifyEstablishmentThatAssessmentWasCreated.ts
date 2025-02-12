import {
  ConventionEstablishmentRole,
  WithAssessmentDto,
  errors,
  frontRoutes,
  withAssessmentSchema,
} from "shared";
import { GenerateConventionMagicLinkUrl } from "../../../../config/bootstrap/magicLinkUrl";
import { createTransactionalUseCase } from "../../../core/UseCase";
import { SaveNotificationAndRelatedEvent } from "../../../core/notifications/helpers/Notification";
import { TimeGateway } from "../../../core/time-gateway/ports/TimeGateway";

export type NotifyEstablishmentThatAssessmentWasCreated = ReturnType<
  typeof makeNotifyEstablishmentThatAssessmentWasCreated
>;
export const makeNotifyEstablishmentThatAssessmentWasCreated =
  createTransactionalUseCase<
    WithAssessmentDto,
    void,
    void,
    {
      saveNotificationAndRelatedEvent: SaveNotificationAndRelatedEvent;
      generateLink: GenerateConventionMagicLinkUrl;
      timeGateway: TimeGateway;
    }
  >(
    {
      name: "NotifyEstablishmentThatAssessmentWasCreated",
      inputSchema: withAssessmentSchema,
    },
    async ({
      inputParams: { assessment },
      uow,
      deps: { saveNotificationAndRelatedEvent, generateLink, timeGateway },
    }) => {
      const convention = await uow.conventionRepository.getById(
        assessment.conventionId,
      );

      if (!convention)
        throw errors.convention.notFound({
          conventionId: assessment.conventionId,
        });

      const sendEmailForRole = (role: ConventionEstablishmentRole) =>
        saveNotificationAndRelatedEvent(uow, {
          kind: "email",
          templatedContent: {
            kind: "ASSESSMENT_CREATED_ESTABLISHMENT_NOTIFICATION",
            recipients:
              role === "establishment-representative"
                ? [convention.signatories.establishmentRepresentative.email]
                : [convention.establishmentTutor.email],
            params: {
              beneficiaryFullName: `${convention.signatories.beneficiary.firstName} ${convention.signatories.beneficiary.lastName}`,
              recipientFullName:
                role === "establishment-representative"
                  ? `${convention.signatories.establishmentRepresentative.firstName} ${convention.signatories.establishmentRepresentative.lastName}`
                  : `${convention.establishmentTutor.firstName} ${convention.establishmentTutor.lastName}`,
              internshipKind: convention.internshipKind,
              businessName: convention.businessName,
              linkToAssessment: generateLink({
                id: convention.id,
                email:
                  role === "establishment-representative"
                    ? convention.signatories.establishmentRepresentative.email
                    : convention.establishmentTutor.email,
                role,
                targetRoute: `${frontRoutes.assessmentDocument}`,
                now: timeGateway.now(),
              }),
            },
          },
          followedIds: {
            establishmentSiret: convention.siret,
            conventionId: assessment.conventionId,
          },
        });

      await Promise.all([
        sendEmailForRole("establishment-representative"),
        ...(convention.signatories.establishmentRepresentative.email ===
        convention.establishmentTutor.email
          ? []
          : [sendEmailForRole("establishment-tutor")]),
      ]);
    },
  );
