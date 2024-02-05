import * as dotenv from "dotenv";
import { trim } from "ramda";
import {
  AbsoluteUrl,
  filterNotFalsy,
  inclusionConnectImmersionRoutes,
  makeGetBooleanVariable,
  makeThrowIfNotAbsoluteUrl,
  makeThrowIfNotDefinedOrDefault,
  makeThrowIfNotInArray,
  makeThrowIfNotOpenCageGeosearchKey,
  ProcessEnv,
} from "shared";
import { DomainTopic } from "../../../domain/core/eventBus/events";
import { InclusionConnectConfig } from "../../../domain/inclusionConnect/useCases/InitiateInclusionConnect";
import { S3Params } from "../../secondary/documentGateway/S3DocumentGateway";
import { EmailableApiKey } from "../../secondary/emailValidationGateway/EmailableEmailValidationGateway.dto";

export type AccessTokenConfig = {
  immersionFacileBaseUrl: AbsoluteUrl;
  peApiUrl: AbsoluteUrl;
  peAuthCandidatUrl: AbsoluteUrl;
  peEnterpriseUrl: AbsoluteUrl;
  clientId: string;
  clientSecret: string;
};

export type AxiosConfig = {
  endpoint: string;
  bearerToken: string;
};

// See "Working with AppConfig" in back/README.md for more details.

export class AppConfig {
  readonly #getBooleanVariable;

  readonly #throwIfNotAbsoluteUrl;

  readonly #throwIfNotDefinedOrDefault;

  readonly #throwIfNotGeosearchApiKey;

  readonly #throwIfNotInArray;

  // eslint-disable-next-line no-restricted-syntax
  private constructor(private readonly env: ProcessEnv) {
    this.#throwIfNotInArray = makeThrowIfNotInArray(env);
    this.#throwIfNotDefinedOrDefault = makeThrowIfNotDefinedOrDefault(env);
    this.#throwIfNotAbsoluteUrl = makeThrowIfNotAbsoluteUrl(env);
    this.#getBooleanVariable = makeGetBooleanVariable(env);
    this.#throwIfNotGeosearchApiKey = makeThrowIfNotOpenCageGeosearchKey(env);
  }

  // https://opencagedata.com/
  public get apiAddress() {
    return this.#throwIfNotInArray({
      variableName: "ADDRESS_API_GATEWAY",
      authorizedValues: ["IN_MEMORY", "OPEN_CAGE_DATA"],
    });
  }

  // https://adresse.data.gouv.fr/
  public get apiJwtPrivateKey() {
    return this.#throwIfNotDefinedOrDefault("API_JWT_PRIVATE_KEY");
  }

  // == Address Api gateway choice between 2 providers ==
  public get apiJwtPublicKey() {
    return this.#throwIfNotDefinedOrDefault("API_JWT_PUBLIC_KEY");
  }

  // == Notification gateway provider api keys ==
  public get apiKeyBrevo() {
    return this.#throwIfNotDefinedOrDefault("BREVO_API_KEY");
  }

  public get apiKeyOpenCageDataGeocoding() {
    return this.#throwIfNotDefinedOrDefault("API_KEY_OPEN_CAGE_DATA_GEOCODING");
  }

  public get apiKeyOpenCageDataGeosearch() {
    return this.#throwIfNotGeosearchApiKey("API_KEY_OPEN_CAGE_DATA_GEOSEARCH");
  }

  public get backofficePassword() {
    return this.#throwIfNotDefinedOrDefault("BACKOFFICE_PASSWORD");
  }

  // == Backoffice ==
  public get backofficeUsername() {
    return this.#throwIfNotDefinedOrDefault("BACKOFFICE_USERNAME");
  }

  public get cellarS3Params(): S3Params | undefined {
    if (this.documentGateway === "S3") {
      return {
        endPoint: this.#throwIfNotDefinedOrDefault("CELLAR_ADDON_HOST"),
        accessKeyId: this.#throwIfNotDefinedOrDefault("CELLAR_ADDON_KEY_ID"),
        secretAccessKey: this.#throwIfNotDefinedOrDefault(
          "CELLAR_ADDON_KEY_SECRET",
        ),
        bucketName: this.#throwIfNotDefinedOrDefault("CELLAR_BUCKET"),
      };
    }
  }

  // Visible for testing.
  public get configParams() {
    return this.env;
  }

  // == Sirene repository ==
  public static createFromEnv(
    readDotEnv = true,
    configParams = process.env,
  ): AppConfig {
    if (readDotEnv) dotenv.config({ path: `${__dirname}/../../../../.env` });
    return new AppConfig(configParams);
  }

  // == Metabase
  public get dashboard() {
    return this.#throwIfNotInArray({
      variableName: "DASHBOARD_GATEWAY",
      authorizedValues: ["METABASE", "NONE"],
      defaultValue: "NONE",
    });
  }

  public get discordPipelineReportsWebhookUrl() {
    return this.env.DISCORD_PIPELINE_REPORTS_WEBHOOK_URL;
  }

  // == Discord notifications ==
  public get discordWebhookUrl(): string | undefined {
    return this.env.DISCORD_WEBHOOK_URL;
  }

  public get documentGateway() {
    return this.#throwIfNotInArray({
      authorizedValues: ["NONE", "S3"],
      variableName: "DOCUMENT_GATEWAY",
      defaultValue: "NONE",
    });
  }

  // == Email gateway provider api keys ==
  public get emailableApiKey(): EmailableApiKey {
    return this.#throwIfNotDefinedOrDefault("EMAILABLE_API_KEY");
  }

  // == Email notifications ==
  public get emailAllowList() {
    return parseStringList(this.env.EMAIL_ALLOW_LIST);
  }

  public get emailDomainBlackList(): string[] {
    const emailDomainBlackListRaw = this.#throwIfNotDefinedOrDefault(
      "EMAIL_DOMAIN_BLACK_LIST",
      "",
    );

    if (!emailDomainBlackListRaw) return [];
    return emailDomainBlackListRaw.split(",");
  }

  // == Email validation gateway ==
  public get emailValidationGateway() {
    return this.#throwIfNotInArray({
      variableName: "EMAIL_VALIDATION_GATEWAY",
      authorizedValues: ["IN_MEMORY", "EMAILABLE"],
      defaultValue: "IN_MEMORY",
    });
  }

  public get envType() {
    return this.#throwIfNotInArray({
      variableName: "ENV_TYPE",
      authorizedValues: ["dev", "staging", "production", "local"],
      defaultValue: "local",
    });
  }

  // == Event Bus ==
  public get eventCrawlerPeriodMs() {
    return parseInteger(this.env.EVENT_CRAWLER_PERIOD_MS, 0);
  }

  public get externalAxiosTimeout(): number {
    return parseInt(
      this.#throwIfNotDefinedOrDefault("EXTERNAL_AXIOS_TIMEOUT", "10000"),
    );
  }

  // == Magic links ==
  public get immersionFacileBaseUrl(): AbsoluteUrl {
    return this.immersionFacileDomain.includes("localhost")
      ? `http://${this.immersionFacileDomain}`
      : `https://${this.immersionFacileDomain}`;
  }

  public get immersionFacileDomain(): string {
    return this.#throwIfNotDefinedOrDefault("DOMAIN");
  }

  public get inboundEmailAllowedIps() {
    return parseStringList(
      this.#throwIfNotDefinedOrDefault("INBOUND_EMAIL_ALLOWED_IPS"),
    );
  }

  public get inclusionConnectConfig(): InclusionConnectConfig {
    return this.inclusionConnectGateway === "HTTPS"
      ? {
          clientId: this.#throwIfNotDefinedOrDefault(
            "INCLUSION_CONNECT_CLIENT_ID",
          ),
          clientSecret: this.#throwIfNotDefinedOrDefault(
            "INCLUSION_CONNECT_CLIENT_SECRET",
          ),
          immersionRedirectUri: `${this.immersionFacileBaseUrl}/api${inclusionConnectImmersionRoutes.afterLoginRedirection.url}`,
          inclusionConnectBaseUri: this.#throwIfNotAbsoluteUrl(
            "INCLUSION_CONNECT_BASE_URI",
          ),
          scope: "openid profile email",
        }
      : {
          clientId: this.#throwIfNotDefinedOrDefault(
            "INCLUSION_CONNECT_CLIENT_ID",
            "fake id",
          ),
          clientSecret: this.#throwIfNotDefinedOrDefault(
            "INCLUSION_CONNECT_CLIENT_SECRET",
            "fake secret",
          ),
          immersionRedirectUri: `${this.immersionFacileBaseUrl}/api${inclusionConnectImmersionRoutes.afterLoginRedirection.url}`,
          inclusionConnectBaseUri: this.#throwIfNotDefinedOrDefault(
            "INCLUSION_CONNECT_BASE_URI",
            "https://fake.url",
          ) as AbsoluteUrl,
          scope: "openid profile email",
        };
  }

  // == Inclusion Connect gateway ==
  public get inclusionConnectGateway() {
    return this.#throwIfNotInArray({
      variableName: "INCLUSION_CONNECT_GATEWAY",
      authorizedValues: ["IN_MEMORY", "HTTPS"],
      defaultValue: "IN_MEMORY",
    });
  }

  public get inseeHttpConfig(): AxiosConfig {
    return {
      endpoint: this.#throwIfNotDefinedOrDefault("SIRENE_ENDPOINT"),
      bearerToken: this.#throwIfNotDefinedOrDefault("SIRENE_BEARER_TOKEN"),
    };
  }

  public get jwtPrivateKey() {
    return this.#throwIfNotDefinedOrDefault("JWT_PRIVATE_KEY");
  }

  public get jwtPublicKey() {
    return this.#throwIfNotDefinedOrDefault("JWT_PUBLIC_KEY");
  }

  public get laBonneBoiteGateway() {
    return this.#throwIfNotInArray({
      variableName: "LA_BONNE_BOITE_GATEWAY",
      authorizedValues: ["IN_MEMORY", "HTTPS"],
    });
  }

  public get maxApiConsumerCallsPerSecond() {
    return parseInteger(this.env.MAX_API_CONSUMER_CALLS_PER_SECOND, 5);
  }

  public get maxConventionsToSyncWithPe() {
    return parseInt(
      this.#throwIfNotDefinedOrDefault("MAX_CONVENTIONS_TO_SYNC_WITH_PE", "50"),
    );
  }

  public get metabase() {
    return {
      metabaseUrl: this.#throwIfNotDefinedOrDefault(
        "METABASE_URL",
      ) as AbsoluteUrl,
      metabaseApiKey: this.#throwIfNotDefinedOrDefault("METABASE_API_KEY"),
    };
  }

  public get minimumNumberOfDaysBetweenSimilarContactRequests(): number {
    return parseInt(
      this.#throwIfNotDefinedOrDefault(
        "MINIMUM_NUMBER_OF_DAYS_BETWEEN_SIMILAR_CONTACT_REQUESTS",
        "7",
      ),
    );
  }

  public get nodeEnv() {
    return this.#throwIfNotInArray({
      variableName: "NODE_ENV",
      authorizedValues: ["test", "local", "production"],
    });
  }

  public get nodeProcessReportInterval(): number {
    return parseInt(
      this.#throwIfNotDefinedOrDefault("NODE_PROCESS_REPORT_INTERVAL", "30000"),
    );
  }

  // == Notification gateway ==
  public get notificationGateway() {
    return this.#throwIfNotInArray({
      variableName: "NOTIFICATION_GATEWAY",
      authorizedValues: ["IN_MEMORY", "BREVO"],
    });
  }

  public get passEmploiGateway() {
    return this.#throwIfNotInArray({
      variableName: "PASS_EMPLOI_GATEWAY",
      authorizedValues: ["IN_MEMORY", "HTTPS"],
    });
  }

  public get passEmploiKey() {
    return this.#throwIfNotDefinedOrDefault("PASS_EMPLOI_KEY");
  }

  public get passEmploiUrl() {
    return this.#throwIfNotDefinedOrDefault("PASS_EMPLOI_URL");
  }

  public get pdfGenerator() {
    return {
      baseUrl: this.#throwIfNotAbsoluteUrl("PDF_GENERATOR_BASE_URL"),
      apiKey: this.#throwIfNotDefinedOrDefault("PDF_GENERATOR_API_KEY"),
    };
  }

  public get pdfGeneratorGateway() {
    return this.#throwIfNotInArray({
      variableName: "PDF_GENERATOR_GATEWAY",
      authorizedValues: ["IN_MEMORY", "SCALINGO"],
    });
  }

  public get peApiUrl(): AbsoluteUrl {
    return this.#throwIfNotAbsoluteUrl("POLE_EMPLOI_API_URL");
  }

  public get peAuthCandidatUrl(): AbsoluteUrl {
    return this.#throwIfNotAbsoluteUrl(
      "POLE_EMPLOI_AUTHENTIFICATION_CANDIDAT_URL",
    );
  }

  // == PE Connect gateway ==
  public get peConnectGateway() {
    return this.#throwIfNotInArray({
      variableName: "PE_CONNECT_GATEWAY",
      authorizedValues: ["IN_MEMORY", "HTTPS"],
      defaultValue: "IN_MEMORY",
    });
  }

  public get peEnterpriseUrl(): AbsoluteUrl {
    return this.#throwIfNotAbsoluteUrl("POLE_EMPLOI_ENTREPRISE_URL");
  }

  public get pgImmersionDbUrl() {
    return this.#throwIfNotDefinedOrDefault("DATABASE_URL");
  }

  public get poleEmploiAccessTokenConfig(): AccessTokenConfig {
    return {
      immersionFacileBaseUrl: this.immersionFacileBaseUrl,
      peApiUrl: this.peApiUrl,
      peAuthCandidatUrl: this.peAuthCandidatUrl,
      peEnterpriseUrl: this.peEnterpriseUrl,
      clientId: this.poleEmploiClientId,
      clientSecret: this.poleEmploiClientSecret,
    };
  }

  public get poleEmploiClientId() {
    return this.#throwIfNotDefinedOrDefault("POLE_EMPLOI_CLIENT_ID");
  }

  public get poleEmploiClientSecret() {
    return this.#throwIfNotDefinedOrDefault("POLE_EMPLOI_CLIENT_SECRET");
  }

  public get poleEmploiGateway() {
    return this.#throwIfNotInArray({
      variableName: "POLE_EMPLOI_GATEWAY",
      authorizedValues: ["IN_MEMORY", "HTTPS"],
    });
  }

  public get previousJwtPrivateKey() {
    return this.env.JWT_PREVIOUS_PRIVATE_KEY;
  }

  public get previousJwtPublicKey() {
    return this.env.JWT_PREVIOUS_PUBLIC_KEY;
  }

  public get quarantinedTopics(): DomainTopic[] {
    return parseStringList(this.env.QUARANTINED_TOPICS).filter(
      filterNotFalsy,
    ) as DomainTopic[];
  }

  // == Data repositories ==
  public get repositories() {
    return this.#throwIfNotInArray({
      variableName: "REPOSITORIES",
      authorizedValues: ["IN_MEMORY", "PG"],
      defaultValue: "IN_MEMORY",
    });
  }

  // == Rome gateway ==
  public get romeRepository() {
    return this.#throwIfNotInArray({
      variableName: "ROME_GATEWAY",
      authorizedValues: ["IN_MEMORY", "PG"],
      defaultValue: "IN_MEMORY",
    });
  }

  public get shortLinkIdGeneratorGateway() {
    return this.#throwIfNotInArray({
      variableName: "SHORT_LINK_ID_GENERATOR_GATEWAY",
      authorizedValues: ["NANO_ID", "DETERMINIST"],
    });
  }

  public get siretGateway() {
    return this.#throwIfNotInArray({
      variableName: "SIRENE_REPOSITORY",
      authorizedValues: [
        "IN_MEMORY",
        "HTTPS", // Deprecated, use Insee instead
        "INSEE",
        "ANNUAIRE_DES_ENTREPRISES",
      ],
      defaultValue: "IN_MEMORY",
    });
  }

  public get skipEmailAllowlist() {
    return this.#getBooleanVariable("SKIP_EMAIL_ALLOW_LIST");
  }

  public get subscribersGateway() {
    return this.#throwIfNotInArray({
      variableName: "SUBSCRIBERS_GATEWAY",
      authorizedValues: ["IN_MEMORY", "HTTPS"],
      defaultValue: "IN_MEMORY",
    });
  }

  public get timeGateway() {
    return this.#throwIfNotInArray({
      variableName: "TIME_GATEWAY",
      authorizedValues: ["CUSTOM", "REAL"],
      defaultValue: "REAL",
    });
  }

  public get updateEstablishmentFromInseeConfig() {
    return {
      maxEstablishmentsPerBatch: parseInt(
        this.#throwIfNotDefinedOrDefault(
          "MAX_ESTABLISHMENTS_PER_BATCH",
          "1000",
        ),
      ),
      maxEstablishmentsPerFullRun: parseInt(
        this.#throwIfNotDefinedOrDefault(
          "MAX_ESTABLISHMENTS_PER_FULL_RUN",
          "5000",
        ),
      ),
      numberOfDaysAgoToCheckForInseeUpdates: parseInt(
        this.#throwIfNotDefinedOrDefault(
          "NUMBER_OF_DAYS_AGO_TO_CHECK_FOR_INSEE_UPDATES",
          "30",
        ),
      ),
    };
  }
}

// Parsers

const parseInteger = (str: string | undefined, defaultValue: number): number =>
  str ? parseInt(str) : defaultValue;

// Format: <string>,<string>,...
const parseStringList = (str: string | undefined, separator = ","): string[] =>
  (str || "").split(separator).map(trim).filter(filterNotFalsy);

// Email allow list from env variable
export const makeEmailAllowListPredicate = ({
  skipEmailAllowList,
  emailAllowList,
}: {
  skipEmailAllowList: boolean;
  emailAllowList: string[];
}): ((recipient: string) => boolean) =>
  skipEmailAllowList
    ? (_recipient: string) => true
    : (recipient: string): boolean => emailAllowList.includes(recipient);
