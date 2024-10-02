import { AbsoluteUrl } from "../AbsoluteUrl";

type FeatureFlagSeverity = (typeof featureFlagSeverities)[number];

const featureFlagSeverities = ["warning", "error", "success", "info"] as const;

export type FeatureFlagName = (typeof featureFlagNames)[number];

export const featureFlagNames = [
  "enableTemporaryOperation",
  "enableMaintenance",
  "enableSearchByScore",
  "enableProConnect",
] as const;

type FeatureFlagKind = (typeof featureFlagKinds)[number];

const featureFlagKinds = [
  "boolean",
  "textImageAndRedirect",
  "textWithSeverity",
] as const;

type GenericFeatureFlag<K extends FeatureFlagKind, V = void> = {
  kind: K;
  isActive: boolean;
} & (V extends void ? object : { value: V });

type WithFeatureFlagTextValue = { message: string };

type WithImageAndRedirect = {
  imageUrl: AbsoluteUrl;
  imageAlt: string;
  redirectUrl: AbsoluteUrl;
  title: string;
  overtitle: string;
};
type WithSeverityValue = {
  severity: FeatureFlagSeverity;
};

export type FeatureFlagTextWithSeverity = GenericFeatureFlag<
  "textWithSeverity",
  WithFeatureFlagTextValue & WithSeverityValue
>;

export type FeatureFlagTextImageAndRedirect = GenericFeatureFlag<
  "textImageAndRedirect",
  WithFeatureFlagTextValue & WithImageAndRedirect
>;
export type FeatureFlagBoolean = GenericFeatureFlag<"boolean">;

export type FeatureFlag =
  | FeatureFlagBoolean
  | FeatureFlagTextImageAndRedirect
  | FeatureFlagTextWithSeverity;

export type FeatureFlags = {
  // TODO: pas de controle sur les clés ici, on peut mettre ce qu'on veut
  enableMaintenance: FeatureFlagTextWithSeverity;
  enableTemporaryOperation: FeatureFlagTextImageAndRedirect;
  enableSearchByScore: FeatureFlagBoolean;
  enableProConnect: FeatureFlagBoolean;
};

export type SetFeatureFlagParam = {
  flagName: FeatureFlagName;
  featureFlag: FeatureFlag;
};

const makeFeatureFlag =
  <K extends FeatureFlagKind>(kind: K) =>
  (
    isActive: boolean,
    ...value: K extends "textWithSeverity"
      ? [FeatureFlagTextWithSeverity["value"]]
      : K extends "textImageAndRedirect"
        ? [FeatureFlagTextImageAndRedirect["value"]]
        : []
  ): Extract<FeatureFlag, { kind: K }> => {
    if (kind === "boolean")
      return { kind, isActive } as Extract<FeatureFlag, { kind: K }>;
    return {
      kind,
      isActive,
      value: value[0],
    } as Extract<FeatureFlag, { kind: K }>;
  };

export const makeBooleanFeatureFlag = makeFeatureFlag("boolean");
export const makeTextImageAndRedirectFeatureFlag = makeFeatureFlag(
  "textImageAndRedirect",
);
export const makeTextWithSeverityFeatureFlag =
  makeFeatureFlag("textWithSeverity");

export const hasFeatureFlagValue = (
  flag: FeatureFlag | SetFeatureFlagParam["featureFlag"],
): flag is Extract<FeatureFlag, { value: object }> =>
  "value" in flag && flag.value !== undefined;
