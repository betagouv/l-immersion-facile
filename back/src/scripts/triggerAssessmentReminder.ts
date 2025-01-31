import { AppConfig } from "../config/bootstrap/appConfig";
import { createGetPgPoolFn } from "../config/bootstrap/createGateways";
import { makeGenerateConventionMagicLinkUrl } from "../config/bootstrap/magicLinkUrl";
import { makeGenerateJwtES256 } from "../domains/core/jwt";
import { makeSaveNotificationAndRelatedEvent } from "../domains/core/notifications/helpers/Notification";
import { RealTimeGateway } from "../domains/core/time-gateway/adapters/RealTimeGateway";
import { createUowPerformer } from "../domains/core/unit-of-work/adapters/createUowPerformer";
import { UuidV4Generator } from "../domains/core/uuid-generator/adapters/UuidGeneratorImplementations";
import { makeAssessmentReminder } from "../domains/establishment/use-cases/AssessmentReminder";
import { createLogger } from "../utils/logger";
import { handleCRONScript } from "./handleCRONScript";

const logger = createLogger(__filename);
const config = AppConfig.createFromEnv();

const triggerAssessmentReminder = async () => {
  logger.info({ message: "Starting to send emails with assessment reminder" });

  const timeGateway = new RealTimeGateway();
  const generateConventionJwt = makeGenerateJwtES256<"convention">(
    config.jwtPrivateKey,
    3600 * 24 * 30,
  );

  const { numberOfReminders: numberOfFirstReminders } =
    await makeAssessmentReminder({
      uowPerformer: createUowPerformer(config, createGetPgPoolFn(config))
        .uowPerformer,
      deps: {
        timeGateway,
        saveNotificationAndRelatedEvent: makeSaveNotificationAndRelatedEvent(
          new UuidV4Generator(),
          timeGateway,
        ),
        generateConventionMagicLinkUrl: makeGenerateConventionMagicLinkUrl(
          config,
          generateConventionJwt,
        ),
      },
    }).execute({ mode: "3daysAfterConventionEnd" });

  const { numberOfReminders: numberOfSecondReminders } =
    await makeAssessmentReminder({
      uowPerformer: createUowPerformer(config, createGetPgPoolFn(config))
        .uowPerformer,
      deps: {
        timeGateway,
        saveNotificationAndRelatedEvent: makeSaveNotificationAndRelatedEvent(
          new UuidV4Generator(),
          timeGateway,
        ),
        generateConventionMagicLinkUrl: makeGenerateConventionMagicLinkUrl(
          config,
          generateConventionJwt,
        ),
      },
    }).execute({ mode: "10daysAfterConventionEnd" });

  return {
    numberOfFirstReminders,
    numberOfSecondReminders,
  };
};

handleCRONScript(
  "assessmentReminder",
  config,
  triggerAssessmentReminder,
  ({ numberOfFirstReminders, numberOfSecondReminders }) =>
    [
      `Total of first reminders : ${numberOfFirstReminders}`,
      `Total of second reminders: ${numberOfSecondReminders}`,
    ].join("\n"),
  logger,
);
