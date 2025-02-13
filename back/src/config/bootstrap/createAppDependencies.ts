import { AbsoluteUrl, frontRoutes } from "shared";
import { InMemoryEventBus } from "../../domains/core/events/adapters/InMemoryEventBus";
import {
  GenerateApiConsumerJwt,
  GenerateConventionJwt,
  GenerateEditFormEstablishmentJwt,
  GenerateInclusionConnectJwt,
  makeGenerateJwtES256,
} from "../../domains/core/jwt";
import { createUowPerformer } from "../../domains/core/unit-of-work/adapters/createUowPerformer";
import { UuidV4Generator } from "../../domains/core/uuid-generator/adapters/UuidGeneratorImplementations";
import {
  makeHandleManagedRedirectResponseError,
  makeHandleRawRedirectResponseError,
} from "../helpers/handleRedirectResponseError";
import { AppConfig } from "./appConfig";
import {
  makeConsumerMiddleware,
  makeMagicLinkAuthMiddleware,
} from "./authMiddleware";
import { createEventCrawler } from "./createEventCrawler";
import { createGateways, createGetPgPoolFn } from "./createGateways";
import { createUseCases } from "./createUseCases";
import { makeInclusionConnectAuthMiddleware } from "./inclusionConnectAuthMiddleware";

const uuidGenerator = new UuidV4Generator();

export type AppDependencies = ReturnType<
  typeof createAppDependencies
> extends Promise<infer T>
  ? T
  : never;

export const createAppDependencies = async (config: AppConfig) => {
  const getPgPoolFn = createGetPgPoolFn(config);
  const gateways = await createGateways(config, uuidGenerator);

  const { uowPerformer, inMemoryUow } = createUowPerformer(config, getPgPoolFn);

  const eventBus = new InMemoryEventBus(
    gateways.timeGateway,
    uowPerformer,
    config.nodeEnv === "test",
  );

  const oneHourInSeconds = 3600;
  const oneDayInSecond = oneHourInSeconds * 24;
  const thirtyDaysInSecond = oneDayInSecond * 30;
  const sixMonthsInSecond = oneDayInSecond * 6 * 30;

  const generateEditEstablishmentJwt: GenerateEditFormEstablishmentJwt =
    makeGenerateJwtES256<"establishment">(config.jwtPrivateKey, oneDayInSecond);
  const generateApiConsumerJwt: GenerateApiConsumerJwt =
    makeGenerateJwtES256<"apiConsumer">(
      config.apiJwtPrivateKey,
      undefined, // no expiration
    );
  const generateInclusionConnectJwt: GenerateInclusionConnectJwt =
    makeGenerateJwtES256<"inclusionConnect">(
      config.jwtPrivateKey,
      oneHourInSeconds,
    );
  const generateConventionJwt: GenerateConventionJwt =
    makeGenerateJwtES256<"convention">(
      config.jwtPrivateKey,
      thirtyDaysInSecond,
    );

  const generateConventionLongDurationJwt: GenerateConventionJwt =
    makeGenerateJwtES256<"convention">(config.jwtPrivateKey, sixMonthsInSecond);

  const redirectErrorUrl: AbsoluteUrl = `${config.immersionFacileBaseUrl}/${frontRoutes.error}`;
  const errorHandlers = {
    handleManagedRedirectResponseError:
      makeHandleManagedRedirectResponseError(redirectErrorUrl),
    handleRawRedirectResponseError:
      makeHandleRawRedirectResponseError(redirectErrorUrl),
  };

  const useCases = createUseCases(
    config,
    gateways,
    generateConventionJwt,
    generateConventionLongDurationJwt,
    generateEditEstablishmentJwt,
    generateInclusionConnectJwt,
    generateApiConsumerJwt,
    uowPerformer,
    uuidGenerator,
  );

  return {
    config,
    useCases,
    gateways,
    conventionMagicLinkAuthMiddleware: makeMagicLinkAuthMiddleware(
      config,
      "convention",
    ),
    errorHandlers,
    establishmentMagicLinkAuthMiddleware: makeMagicLinkAuthMiddleware(
      config,
      "establishment",
    ),
    apiConsumerMiddleware: makeConsumerMiddleware(
      useCases.getApiConsumerById.execute,
      gateways.timeGateway,
      config,
    ),
    inclusionConnectAuthMiddleware: await makeInclusionConnectAuthMiddleware(
      config.jwtPublicKey,
      uowPerformer,
      gateways.dashboardGateway,
      gateways.timeGateway,
    ),
    generateEditEstablishmentJwt,
    generateConventionJwt,
    generateApiConsumerJwt,
    generateInclusionConnectJwt,
    eventBus,
    eventCrawler: createEventCrawler(config, uowPerformer, eventBus),
    uuidGenerator,
    inMemoryUow,
    uowPerformer,
    getPgPoolFn,
  };
};
