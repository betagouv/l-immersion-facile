import { IdToken } from "../inclusionConnect/inclusionConnect.dto";
import { InclusionConnectJwt } from "../tokens/jwt.dto";
import { Flavor } from "../typeFlavors";

export type FederatedIdentityProvider =
  (typeof federatedIdentityProviders)[number];

export const federatedIdentityProviders = [
  "inclusionConnect",
  "peConnect",
] as const;

type GenericFederatedIdentity<
  Provider extends FederatedIdentityProvider,
  T extends FtConnectToken | InclusionConnectJwt,
  P = void,
> = Provider extends "peConnect"
  ? {
      provider: Provider;
      token: T;
      payload?: P;
    }
  : {
      provider: Provider;
      token: T;
      payload?: P;
      idToken: IdToken;
    };

export const authFailed = "AuthFailed";
export const notJobSeeker = "NotJobSeeker";

export type FtExternalId = Flavor<string, "PeExternalId">;

type PeConnectAdvisorForBeneficiary = {
  advisor: {
    email: string;
    firstName: string;
    lastName: string;
    type: "PLACEMENT" | "CAPEMPLOI" | "INDEMNISATION";
  };
};

export type FtConnectToken =
  | FtExternalId
  | typeof authFailed
  | typeof notJobSeeker;

export type PeConnectIdentity = GenericFederatedIdentity<
  "peConnect",
  FtConnectToken,
  PeConnectAdvisorForBeneficiary
>;
export const isPeConnectIdentity = (
  federatedIdentity: FederatedIdentity | undefined,
): federatedIdentity is PeConnectIdentity =>
  federatedIdentity?.provider === "peConnect";

export type InclusionConnectIdentity = GenericFederatedIdentity<
  "inclusionConnect",
  InclusionConnectJwt
>;

export type FederatedIdentity = InclusionConnectIdentity | PeConnectIdentity;
