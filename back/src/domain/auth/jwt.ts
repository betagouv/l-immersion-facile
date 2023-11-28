import jwt from "jsonwebtoken";
import {
  ApiConsumerJwt,
  ApiConsumerJwtPayload,
  AppSupportedJwt,
  BackOfficeJwt,
  BackOfficeJwtPayload,
  CommonJwtPayload,
  ConventionJwt,
  ConventionJwtPayload,
  EstablishmentJwt,
  EstablishmentJwtPayload,
  InclusionConnectJwt,
  InclusionConnectJwtPayload,
} from "shared";

export type GenerateConventionJwt = GenerateJwtFn<"convention">;
export type GenerateInclusionConnectJwt = GenerateJwtFn<"inclusionConnect">;
export type GenerateEditFormEstablishmentJwt = GenerateJwtFn<"establishment">;
export type GenerateBackOfficeJwt = GenerateJwtFn<"backOffice">;
export type GenerateApiConsumerJwt = GenerateJwtFn<"apiConsumer">;

type JwtTokenMapping<
  K extends string,
  T extends AppSupportedJwt,
  JwtPayload,
> = {
  token: T;
  kind: K;
  payload: JwtPayload;
};

//prettier-ignore
type JwtMap =
  | JwtTokenMapping<"convention", ConventionJwt, ConventionJwtPayload>
  | JwtTokenMapping<"establishment", EstablishmentJwt, EstablishmentJwtPayload>
  | JwtTokenMapping<"inclusionConnect", InclusionConnectJwt, InclusionConnectJwtPayload>
  | JwtTokenMapping<"backOffice", BackOfficeJwt, BackOfficeJwtPayload>
  | JwtTokenMapping<"apiConsumer", ApiConsumerJwt, ApiConsumerJwtPayload>;

export type JwtKind = JwtMap["kind"];

export type GenerateJwtFn<K extends JwtKind> = (
  payload: Extract<JwtMap, { kind: K }>["payload"],
  expiresInSeconds?: number,
) => Extract<JwtMap, { kind: K }>["token"];

export const makeGenerateJwtES256 =
  <K extends JwtKind = never>(
    privateKey: string,
    defaultExpiresInSeconds: number | undefined,
  ): GenerateJwtFn<K> =>
  (payload, expiresInSeconds?: string | number) => {
    const expire =
      !("exp" in payload) &&
      (expiresInSeconds !== undefined || defaultExpiresInSeconds)
        ? { expiresIn: expiresInSeconds ?? defaultExpiresInSeconds }
        : {};
    return jwt.sign(payload, privateKey, {
      algorithm: "ES256",
      ...expire,
      //noTimestamp: true, //Remove iat on payload
    });
  };

type VerifyJwtFn<K extends JwtKind> = (
  jwt: Extract<JwtMap, { kind: K }>["token"],
) => CommonJwtPayload & Extract<JwtMap, { kind: K }>["payload"];

export const makeVerifyJwtES256 = <K extends JwtKind>(
  jwtPublicKey: string,
): VerifyJwtFn<K> =>
  ((jwtString: string) =>
    jwt.verify(jwtString, jwtPublicKey, {
      algorithms: ["ES256"],
      complete: false,
      ignoreExpiration: false,
    })) as any;
