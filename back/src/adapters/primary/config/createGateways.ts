import axios from "axios";
import { Pool } from "pg";
import { exhaustiveCheck, immersionFacileContactEmail } from "shared";
import { createAxiosSharedClient } from "shared-routes/axios";
import { GetAccessTokenResponse } from "../../../domain/convention/ports/PoleEmploiGateway";
import { noRetries } from "../../../domain/core/ports/RetryStrategy";
import { TimeGateway } from "../../../domain/core/ports/TimeGateway";
import { UuidGenerator } from "../../../domain/core/ports/UuidGenerator";
import { DashboardGateway } from "../../../domain/dashboard/port/DashboardGateway";
import { DocumentGateway } from "../../../domain/generic/fileManagement/port/DocumentGateway";
import { NotificationGateway } from "../../../domain/generic/notifications/ports/NotificationGateway";
import { InclusionConnectGateway } from "../../../domain/inclusionConnect/port/InclusionConnectGateway";
import { createLogger } from "../../../utils/logger";
import { HttpAddressGateway } from "../../secondary/addressGateway/HttpAddressGateway";
import { addressesExternalTargets } from "../../secondary/addressGateway/HttpAddressGateway.targets";
import { InMemoryAddressGateway } from "../../secondary/addressGateway/InMemoryAddressGateway";
import { InMemoryCachingGateway } from "../../secondary/core/InMemoryCachingGateway";
import { CustomTimeGateway } from "../../secondary/core/TimeGateway/CustomTimeGateway";
import { RealTimeGateway } from "../../secondary/core/TimeGateway/RealTimeGateway";
import { MetabaseDashboardGateway } from "../../secondary/dashboardGateway/MetabaseDashboardGateway";
import { StubDashboardGateway } from "../../secondary/dashboardGateway/StubDashboardGateway";
import { NotImplementedDocumentGateway } from "../../secondary/documentGateway/NotImplementedDocumentGateway";
import { S3DocumentGateway } from "../../secondary/documentGateway/S3DocumentGateway";
import { EmailableEmailValidationGateway } from "../../secondary/emailValidationGateway/EmailableEmailValidationGateway";
import { emailableValidationTargets } from "../../secondary/emailValidationGateway/EmailableEmailValidationGateway.targets";
import { InMemoryEmailValidationGateway } from "../../secondary/emailValidationGateway/InMemoryEmailValidationGateway";
import { HttpInclusionConnectGateway } from "../../secondary/InclusionConnectGateway/HttpInclusionConnectGateway";
import { makeInclusionConnectExternalRoutes } from "../../secondary/InclusionConnectGateway/inclusionConnectExternalRoutes";
import { InMemoryInclusionConnectGateway } from "../../secondary/InclusionConnectGateway/InMemoryInclusionConnectGateway";
import { BrevoNotificationGateway } from "../../secondary/notificationGateway/BrevoNotificationGateway";
import { brevoNotificationGatewayTargets } from "../../secondary/notificationGateway/BrevoNotificationGateway.targets";
import { InMemoryNotificationGateway } from "../../secondary/notificationGateway/InMemoryNotificationGateway";
import { HttpLaBonneBoiteGateway } from "../../secondary/offer/laBonneBoite/HttpLaBonneBoiteGateway";
import { InMemoryLaBonneBoiteGateway } from "../../secondary/offer/laBonneBoite/InMemoryLaBonneBoiteGateway";
import { createLbbTargets } from "../../secondary/offer/laBonneBoite/LaBonneBoiteTargets";
import { HttpPassEmploiGateway } from "../../secondary/offer/passEmploi/HttpPassEmploiGateway";
import { InMemoryPassEmploiGateway } from "../../secondary/offer/passEmploi/InMemoryPassEmploiGateway";
import { InMemoryPdfGeneratorGateway } from "../../secondary/pdfGeneratorGateway/InMemoryPdfGeneratorGateway";
import { PuppeteerPdfGeneratorGateway } from "../../secondary/pdfGeneratorGateway/PuppeteerPdfGeneratorGateway";
import { HttpPeConnectGateway } from "../../secondary/PeConnectGateway/HttpPeConnectGateway";
import { InMemoryPeConnectGateway } from "../../secondary/PeConnectGateway/InMemoryPeConnectGateway";
import { makePeConnectExternalRoutes } from "../../secondary/PeConnectGateway/peConnectApi.routes";
import { HttpPoleEmploiGateway } from "../../secondary/poleEmploi/HttpPoleEmploiGateway";
import { InMemoryPoleEmploiGateway } from "../../secondary/poleEmploi/InMemoryPoleEmploiGateway";
import { createPoleEmploiRoutes } from "../../secondary/poleEmploi/PoleEmploiRoutes";
import { DeterministShortLinkIdGeneratorGateway } from "../../secondary/shortLinkIdGeneratorGateway/DeterministShortLinkIdGeneratorGateway";
import { NanoIdShortLinkIdGeneratorGateway } from "../../secondary/shortLinkIdGeneratorGateway/NanoIdShortLinkIdGeneratorGateway";
import { AnnuaireDesEntreprisesSiretGateway } from "../../secondary/siret/AnnuaireDesEntreprisesSiretGateway";
import { annuaireDesEntreprisesSiretTargets } from "../../secondary/siret/AnnuaireDesEntreprisesSiretGateway.targets";
import { InMemorySiretGateway } from "../../secondary/siret/InMemorySiretGateway";
import { InseeSiretGateway } from "../../secondary/siret/InseeSiretGateway";
import { HttpSubscribersGateway } from "../../secondary/subscribersGateway/HttpSubscribersGateway";
import { InMemorySubscribersGateway } from "../../secondary/subscribersGateway/InMemorySubscribersGateway";
import { AppConfig, makeEmailAllowListPredicate } from "./appConfig";
import { configureCreateHttpClientForExternalApi } from "./createHttpClientForExternalApi";

const logger = createLogger(__filename);

export type GetPgPoolFn = () => Pool;
export const createGetPgPoolFn = (config: AppConfig): GetPgPoolFn => {
  let pgPool: Pool;
  return () => {
    if (config.repositories !== "PG" && config.romeRepository !== "PG")
      throw new Error(
        `Unexpected pg pool creation: REPOSITORIES=${config.repositories},
         ROME_GATEWAY=${config.romeRepository}`,
      );
    if (!pgPool) {
      const { host, pathname } = new URL(config.pgImmersionDbUrl);
      logger.info({ host, pathname }, "creating postgresql connection pool");
      pgPool = new Pool({
        connectionString: config.pgImmersionDbUrl,
        application_name: "Immersion Backend",
        max: 25,
        statement_timeout: 30_000,
        // statement_timeout is important as it avoids never ending queries.
        // We have had problems with eventBus not triggered due to never ending PG queries
      });
    }
    return pgPool;
  };
};

// prettier-ignore
export type Gateways = ReturnType<typeof createGateways> extends Promise<infer T>
  ? T
  : never;

export const createGateways = async (
  config: AppConfig,
  uuidGenerator: UuidGenerator,
  // eslint-disable-next-line @typescript-eslint/require-await
) => {
  logger.info({
    notificationGateway: config.notificationGateway,
    repositories: config.repositories,
    romeRepository: config.romeRepository,
    siretGateway: config.siretGateway,
    apiAddress: config.apiAddress,
  });

  const timeGateway =
    config.timeGateway === "CUSTOM"
      ? new CustomTimeGateway()
      : new RealTimeGateway();

  const poleEmploiGateway =
    config.poleEmploiGateway === "HTTPS"
      ? new HttpPoleEmploiGateway(
          createAxiosSharedClient(
            createPoleEmploiRoutes(config.peApiUrl),
            axios.create({ timeout: config.externalAxiosTimeout }),
            { skipResponseValidation: true },
          ),
          new InMemoryCachingGateway<GetAccessTokenResponse>(
            timeGateway,
            "expires_in",
          ),
          config.peApiUrl,
          config.poleEmploiAccessTokenConfig,
          noRetries,
        )
      : new InMemoryPoleEmploiGateway();

  return {
    addressApi: createAddressGateway(config),
    dashboardGateway: createDashboardGateway(config),
    documentGateway: createDocumentGateway(config),
    notification: createNotificationGateway(config, timeGateway),
    emailValidationGateway: createEmailValidationGateway(config),

    inclusionConnectGateway: createInclusionConnectGateway(config),
    laBonneBoiteGateway:
      config.laBonneBoiteGateway === "HTTPS"
        ? new HttpLaBonneBoiteGateway(
            configureCreateHttpClientForExternalApi(
              axios.create({
                timeout: config.externalAxiosTimeout,
              }),
            )(createLbbTargets(config.peApiUrl)),
            poleEmploiGateway,
            config.poleEmploiClientId,
          )
        : new InMemoryLaBonneBoiteGateway(),
    subscribersGateway:
      config.subscribersGateway === "HTTPS"
        ? new HttpSubscribersGateway(
            axios.create({
              timeout: config.externalAxiosTimeout,
            }),
          )
        : new InMemorySubscribersGateway(),
    passEmploiGateway:
      config.passEmploiGateway === "HTTPS"
        ? new HttpPassEmploiGateway(config.passEmploiUrl, config.passEmploiKey)
        : new InMemoryPassEmploiGateway(),
    pdfGeneratorGateway:
      config.pdfGeneratorGateway === "PUPPETEER"
        ? new PuppeteerPdfGeneratorGateway(uuidGenerator)
        : new InMemoryPdfGeneratorGateway(),
    peConnectGateway: createPoleEmploiConnectGateway(config),
    poleEmploiGateway,
    timeGateway,
    siret: getSiretGateway(config.siretGateway, config, timeGateway),
    shortLinkGenerator:
      config.shortLinkIdGeneratorGateway === "NANO_ID"
        ? new NanoIdShortLinkIdGeneratorGateway()
        : new DeterministShortLinkIdGeneratorGateway(),
  };
};

const getSiretGateway = (
  provider: AppConfig["siretGateway"],
  config: AppConfig,
  timeGateway: TimeGateway,
) => {
  const gatewayByProvider = {
    HTTPS: () =>
      new InseeSiretGateway(config.inseeHttpConfig, timeGateway, noRetries),
    INSEE: () =>
      new InseeSiretGateway(config.inseeHttpConfig, timeGateway, noRetries),
    IN_MEMORY: () => new InMemorySiretGateway(),
    ANNUAIRE_DES_ENTREPRISES: () =>
      new AnnuaireDesEntreprisesSiretGateway(
        configureCreateHttpClientForExternalApi(
          axios.create({
            timeout: config.externalAxiosTimeout,
          }),
        )(annuaireDesEntreprisesSiretTargets),
        new InseeSiretGateway(config.inseeHttpConfig, timeGateway, noRetries),
      ),
  };
  return gatewayByProvider[provider]();
};

const createNotificationGateway = (
  config: AppConfig,
  timeGateway: TimeGateway,
): NotificationGateway => {
  if (config.notificationGateway === "IN_MEMORY")
    return new InMemoryNotificationGateway(timeGateway);

  const brevoNotificationGateway = new BrevoNotificationGateway(
    configureCreateHttpClientForExternalApi(
      axios.create({
        timeout: config.externalAxiosTimeout,
      }),
    )(brevoNotificationGatewayTargets),
    makeEmailAllowListPredicate({
      skipEmailAllowList: config.skipEmailAllowlist,
      emailAllowList: config.emailAllowList,
    }),
    config.apiKeyBrevo,
    {
      name: "Immersion Facilitée",
      email: immersionFacileContactEmail,
    },
  );

  if (config.notificationGateway === "BREVO") {
    return brevoNotificationGateway;
  }

  return exhaustiveCheck(config.notificationGateway, {
    variableName: "config.notificationGateway",
    throwIfReached: true,
  });
};

const createPoleEmploiConnectGateway = (config: AppConfig) =>
  config.peConnectGateway === "HTTPS"
    ? new HttpPeConnectGateway(
        createAxiosSharedClient(
          makePeConnectExternalRoutes({
            peApiUrl: config.peApiUrl,
            peAuthCandidatUrl: config.peAuthCandidatUrl,
          }),
          axios.create({
            timeout: config.externalAxiosTimeout,
          }),
          { skipResponseValidation: true },
        ),
        {
          immersionFacileBaseUrl: config.immersionFacileBaseUrl,
          poleEmploiClientId: config.poleEmploiClientId,
          poleEmploiClientSecret: config.poleEmploiClientSecret,
        },
      )
    : new InMemoryPeConnectGateway();

const createInclusionConnectGateway = (
  config: AppConfig,
): InclusionConnectGateway =>
  config.inclusionConnectGateway === "HTTPS"
    ? new HttpInclusionConnectGateway(
        createAxiosSharedClient(
          makeInclusionConnectExternalRoutes(
            config.inclusionConnectConfig.inclusionConnectBaseUri,
          ),
          axios.create({
            timeout: config.externalAxiosTimeout,
          }),
          { skipResponseValidation: true },
        ),

        config.inclusionConnectConfig,
      )
    : new InMemoryInclusionConnectGateway();

const createAddressGateway = (config: AppConfig) =>
  ({
    IN_MEMORY: () => new InMemoryAddressGateway(),
    OPEN_CAGE_DATA: () =>
      new HttpAddressGateway(
        configureCreateHttpClientForExternalApi(
          axios.create({
            timeout: config.externalAxiosTimeout,
          }),
        )(addressesExternalTargets),
        config.apiKeyOpenCageDataGeocoding,
        config.apiKeyOpenCageDataGeosearch,
      ),
  }[config.apiAddress]());

const createEmailValidationGateway = (config: AppConfig) =>
  ({
    IN_MEMORY: () => new InMemoryEmailValidationGateway(),
    EMAILABLE: () =>
      new EmailableEmailValidationGateway(
        configureCreateHttpClientForExternalApi(
          axios.create({
            timeout: config.externalAxiosTimeout,
          }),
        )(emailableValidationTargets),
        config.emailableApiKey,
      ),
  }[config.emailValidationGateway]());

const createDocumentGateway = (config: AppConfig): DocumentGateway => {
  switch (config.documentGateway) {
    case "S3":
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return new S3DocumentGateway(config.cellarS3Params!);
    case "NONE":
      return new NotImplementedDocumentGateway();
    default: {
      const exhaustiveCheck: never = config.documentGateway;
      logger.error(
        "Should not have been reached (Document Gateway declaration)",
      );
      return exhaustiveCheck;
    }
  }
};

const createDashboardGateway = (config: AppConfig): DashboardGateway =>
  config.dashboard === "METABASE"
    ? new MetabaseDashboardGateway(
        config.metabase.metabaseUrl,
        config.metabase.metabaseApiKey,
      )
    : new StubDashboardGateway();
