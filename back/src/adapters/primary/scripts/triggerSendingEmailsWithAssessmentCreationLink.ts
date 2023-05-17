import { Pool } from "pg";
import { keys } from "ramda";
import { immersionFacileContactEmail } from "shared";
import { makeGenerateJwtES256 } from "../../../domain/auth/jwt";
import { makeCreateNewEvent } from "../../../domain/core/eventBus/EventBus";
import { SendEmailsWithAssessmentCreationLink } from "../../../domain/immersionOffer/useCases/SendEmailsWithAssessmentCreationLink";
import { createLogger } from "../../../utils/logger";
import { RealTimeGateway } from "../../secondary/core/TimeGateway/RealTimeGateway";
import { UuidV4Generator } from "../../secondary/core/UuidGeneratorImplementations";
import { BrevoNotificationGateway } from "../../secondary/notificationGateway/BrevoNotificationGateway";
import { brevoNotificationGatewayTargets } from "../../secondary/notificationGateway/BrevoNotificationGateway.targets";
import { InMemoryNotificationGateway } from "../../secondary/notificationGateway/InMemoryNotificationGateway";
import { AppConfig, makeEmailAllowListPredicate } from "../config/appConfig";
import { configureCreateHttpClientForExternalApi } from "../config/createHttpClientForExternalApi";
import { makeGenerateConventionMagicLinkUrl } from "../config/magicLinkUrl";
import { createUowPerformer } from "../config/uowConfig";
import { handleEndOfScriptNotification } from "./handleEndOfScriptNotification";

const logger = createLogger(__filename);

const config = AppConfig.createFromEnv();
const sendEmailsWithAssessmentCreationLinkScript = async () => {
  logger.info("Starting to send Emails with assessment link");

  const dbUrl = config.pgImmersionDbUrl;
  const pool = new Pool({
    connectionString: dbUrl,
  });
  const timeGateway = new RealTimeGateway();

  const notificationGateway =
    config.notificationGateway === "BREVO"
      ? new BrevoNotificationGateway(
          configureCreateHttpClientForExternalApi()(
            brevoNotificationGatewayTargets,
          ),
          makeEmailAllowListPredicate({
            skipEmailAllowList: config.skipEmailAllowlist,
            emailAllowList: config.emailAllowList,
          }),
          config.apiKeyBrevo,
          {
            name: "Immersion Facilitée",
            email: immersionFacileContactEmail,
          },
        )
      : new InMemoryNotificationGateway(timeGateway);

  const { uowPerformer } = createUowPerformer(config, () => pool);

  const generateConventionJwt = makeGenerateJwtES256<"convention">(
    config.jwtPrivateKey,
    3600 * 24 * 30,
  );

  const sendEmailsWithAssessmentCreationLink =
    new SendEmailsWithAssessmentCreationLink(
      uowPerformer,
      notificationGateway,
      timeGateway,
      makeGenerateConventionMagicLinkUrl(config, generateConventionJwt),
      makeCreateNewEvent({
        timeGateway,
        uuidGenerator: new UuidV4Generator(),
      }),
    );

  return sendEmailsWithAssessmentCreationLink.execute();
};

/* eslint-disable @typescript-eslint/no-floating-promises */
handleEndOfScriptNotification(
  "sendEmailsWithAssessmentCreationLinkScript",
  config,
  sendEmailsWithAssessmentCreationLinkScript,
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
      ...(numberOfFailures > 0 ? [`Failures : ${errorsAsString}`] : [""]),
    ].join("\n");
  },
  logger,
);
