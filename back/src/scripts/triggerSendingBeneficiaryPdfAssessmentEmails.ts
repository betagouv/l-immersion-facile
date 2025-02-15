import { addDays } from "date-fns";
import { keys } from "ramda";
import { AppConfig } from "../config/bootstrap/appConfig";
import { createGetPgPoolFn } from "../config/bootstrap/createGateways";
import { makeCreateNewEvent } from "../domains/core/events/ports/EventBus";
import { makeSaveNotificationAndRelatedEvent } from "../domains/core/notifications/helpers/Notification";
import { RealTimeGateway } from "../domains/core/time-gateway/adapters/RealTimeGateway";
import { createUowPerformer } from "../domains/core/unit-of-work/adapters/createUowPerformer";
import { UuidV4Generator } from "../domains/core/uuid-generator/adapters/UuidGeneratorImplementations";
import { SendBeneficiariesPdfAssessmentsEmails } from "../domains/establishment/use-cases/SendBeneficiariesPdfAssessmentsEmails";
import { createLogger } from "../utils/logger";
import { handleCRONScript } from "./handleCRONScript";
import { getDateRangeFromScriptParams } from "./utils";

/**
 *  we can pass date params to this script like this: pnpm back trigger-sending-beneficiary-assessment-emails 2024-07-01 2024-01-24
 */

const logger = createLogger(__filename);

const config = AppConfig.createFromEnv();
const sendBeneficiaryPdfAssessmentEmailsScript = async () => {
  logger.info({ message: "Starting to send Beneficiary assessment Emails" });

  const timeGateway = new RealTimeGateway();

  const { uowPerformer } = createUowPerformer(
    config,
    createGetPgPoolFn(config),
  );

  const uuidGenerator = new UuidV4Generator();

  const saveNotificationAndRelatedEvent = makeSaveNotificationAndRelatedEvent(
    uuidGenerator,
    timeGateway,
  );

  const sendBeneficiariesPdfAssesmentsEmails =
    new SendBeneficiariesPdfAssessmentsEmails(
      uowPerformer,
      saveNotificationAndRelatedEvent,
      makeCreateNewEvent({
        timeGateway,
        uuidGenerator: new UuidV4Generator(),
      }),
    );

  const now = timeGateway.now();
  const tomorrow = {
    from: addDays(now, 1),
    to: addDays(now, 2),
  };
  const conventionEndDate =
    getDateRangeFromScriptParams({
      scriptParams: process.argv,
    }) ?? tomorrow;

  if (conventionEndDate.to > addDays(now, 2)) {
    const message =
      "Attention, vous êtes sur le point d'envoyer des bilans concernant des immersions qui ne sont pas encore terminées.";
    logger.error({
      message,
    });
    throw new Error(message);
  }
  return sendBeneficiariesPdfAssesmentsEmails.execute({
    conventionEndDate,
  });
};

handleCRONScript(
  "sendBeneficiaryPdfAssessmentEmailsScript",
  config,
  sendBeneficiaryPdfAssessmentEmailsScript,
  ({ numberOfImmersionEndingTomorrow, errors = {} }) => {
    const failures = keys(errors);
    const numberOfFailures = failures.length;
    const numberOfSuccess = numberOfImmersionEndingTomorrow - numberOfFailures;

    const errorsAsString = failures
      .map(
        (conventionId) =>
          `For immersion ids ${conventionId} : ${errors[conventionId]} `,
      )
      .join("\n");

    return [
      `Total of immersion ending tomorrow : ${numberOfSuccess}`,
      `Number of successfully sent Assessments : ${numberOfSuccess}`,
      `Number of failures : ${numberOfFailures}`,
      ...(numberOfFailures > 0 ? [`Failures : ${errorsAsString}`] : []),
    ].join("\n");
  },
  logger,
);
