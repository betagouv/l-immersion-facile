import { keys } from "ramda";
import { AbsoluteUrl } from "../AbsoluteUrl";
import type { AgencyId, AgencyKind } from "../agency/agency.dto";
import type { Email } from "../email/email.dto";
import { Flavor } from "../typeFlavors";
import { Either, ReplaceTypeAtKey } from "../utils";
import { DateString, DateTimeIsoString } from "../utils/date";

export type ApiConsumerId = Flavor<string, "ApiConsumerId">;

export type ApiConsumerJwtPayload = {
  id: ApiConsumerId;
};

export type ApiConsumerName = Flavor<string, "ApiConsumerName">;

export type ApiConsumerKind = (typeof apiConsumerKinds)[number];
export const apiConsumerKinds = ["READ", "WRITE", "SUBSCRIPTION"] as const;

export type SubscriptionParams = {
  callbackUrl: AbsoluteUrl;
  callbackHeaders: CallbackHeaders;
};

export type ApiConsumerRight<Scope, S extends CreateWebhookSubscription> = {
  kinds: ApiConsumerKind[];
  scope: Scope;
  subscriptions: S[];
};

export type SubscriptionName<
  R extends ApiConsumerRightName,
  Event extends string = never,
> = `${R}.${Event}`;

export type ApiConsumerRightName = (typeof apiConsumerRightNames)[number];

export const apiConsumerRightNames = [
  "searchEstablishment",
  "convention",
] as const;

export type GenericApiConsumerRights<S extends CreateWebhookSubscription> = {
  searchEstablishment: ApiConsumerRight<NoScope, S>;
  convention: ApiConsumerRight<ConventionScope, S>;
};

export type CreateApiConsumerRights =
  GenericApiConsumerRights<CreateWebhookSubscription>;

export type ApiConsumerRights = GenericApiConsumerRights<WebhookSubscription>;

export type NoScope = "no-scope";

export const conventionScopeKeys = ["agencyKinds", "agencyIds"] as const;
export type ConventionScope = Either<
  { agencyKinds: AgencyKind[] },
  { agencyIds: AgencyId[] }
>;

export type CreateApiConsumerParams = {
  id: ApiConsumerId;
  consumer: ApiConsumerName;
  contact: ApiConsumerContact;
  description?: string;
  rights: CreateApiConsumerRights;
};

export type ApiConsumerContact = {
  lastName: string;
  firstName: string;
  job: string;
  phone: string;
  emails: Email[];
};

export const isApiConsumerAllowed = ({
  apiConsumer,
  rightName,
  consumerKind,
}: {
  apiConsumer: ApiConsumer | undefined;
  rightName: ApiConsumerRightName;
  consumerKind: ApiConsumerKind;
}): boolean =>
  !!apiConsumer && apiConsumer.rights[rightName].kinds.includes(consumerKind);

export const authorizedCallbackHeaderKeys = [
  "authorization",
  "X-Gravitee-Api-Key",
  "operateur",
] as const;

type AuthorizedCallbackHeaderKey =
  (typeof authorizedCallbackHeaderKeys)[number];

export type CallbackHeaders = Partial<
  Record<AuthorizedCallbackHeaderKey, string>
>;

export const eventToRightName = (
  event: SubscriptionEvent,
): ApiConsumerRightName => {
  const strategy: Record<SubscriptionEvent, ApiConsumerRightName> = {
    "convention.updated": "convention",
  };
  return strategy[event];
};

export type ApiConsumerSubscriptionId = Flavor<
  string,
  "ApiConsumerSubscriptionId"
>;

export type SubscriptionEvent = SubscriptionName<"convention", "updated">;
export type CreateWebhookSubscription = SubscriptionParams & {
  subscribedEvent: SubscriptionEvent;
};

export type WebhookSubscription = CreateWebhookSubscription & {
  id: ApiConsumerSubscriptionId;
  createdAt: DateTimeIsoString;
};

export type ApiConsumer = ReplaceTypeAtKey<
  CreateApiConsumerParams,
  "rights",
  ApiConsumerRights
> & {
  createdAt: DateString;
  expirationDate: DateString;
};

export const createApiConsumerParamsFromApiConsumer = (
  apiConsumer: ApiConsumer,
): CreateApiConsumerParams => ({
  id: apiConsumer.id,
  rights: {
    convention: {
      kinds: apiConsumer.rights.convention.kinds,
      scope: apiConsumer.rights.convention.scope,
      subscriptions: [],
    },
    searchEstablishment: {
      kinds: apiConsumer.rights.searchEstablishment.kinds,
      scope: apiConsumer.rights.searchEstablishment.scope,
      subscriptions: [],
    },
  },
  consumer: apiConsumer.consumer,
  contact: apiConsumer.contact,
  description: apiConsumer.description,
});

export const findRightNameFromSubscriptionId = (
  apiConsumer: ApiConsumer,
  subscriptionId: ApiConsumerSubscriptionId,
): ApiConsumerRightName | undefined =>
  keys(apiConsumer.rights).find((rightName) =>
    apiConsumer.rights[rightName].subscriptions.find(
      (sub) => sub.id === subscriptionId,
    ),
  );
