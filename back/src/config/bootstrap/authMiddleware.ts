import Bottleneck from "bottleneck";
import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import {
  ApiConsumerName,
  ExtractFromExisting,
  PayloadKey,
  castError,
  currentJwtVersions,
  expiredMagicLinkErrorMessage,
} from "shared";
import { GetApiConsumerById } from "../../domains/core/api-consumer/ports/ApiConsumerRepository";
import { JwtKind, makeVerifyJwtES256 } from "../../domains/core/jwt";
import { TimeGateway } from "../../domains/core/time-gateway/ports/TimeGateway";
import { apiKeyAuthMiddlewareRequestsTotal } from "../../utils/counters";
import { createLogger } from "../../utils/logger";
import { AppConfig } from "./appConfig";

const logger = createLogger(__filename);

const convertRouteToLog = (originalUrl: string) =>
  `/${originalUrl.split("/")[1]}`;

export type AuthorisationStatus =
  | "authorised"
  | "unauthorisedId"
  | "incorrectJwt"
  | "expiredToken"
  | "consumerNotFound"
  | "tooManyRequests"
  | "unauthenticated";

type TotalCountProps = {
  consumerName?: ApiConsumerName;
  authorisationStatus: AuthorisationStatus;
};

const createIncTotalCountForRequest =
  (req: Request) =>
  ({ consumerName, authorisationStatus }: TotalCountProps) => {
    const route = convertRouteToLog(req.originalUrl);
    // TODO : remove prometheus counters
    apiKeyAuthMiddlewareRequestsTotal.inc({
      route,
      method: req.method,
      consumerName,
      authorisationStatus,
    });
    logger.info({
      request: {
        method: req.method,
        path: route,
      },
      authorisationStatus,
      message: `apiKeyAuthMiddlewareRequestsTotal for ${consumerName}`,
    });
  };

const responseError = (
  res: Response,
  message: string,
  status = 403,
): Response<any, Record<string, any>> =>
  res.status(status).json({ status, message: `forbidden: ${message}` });

export const makeMagicLinkAuthMiddleware = (
  config: AppConfig,
  payloadKey: ExtractFromExisting<PayloadKey, "convention" | "establishment">,
): RequestHandler => {
  const { verifyJwt, verifyDeprecatedJwt } = verifyJwtConfig<
    "convention" | "establishment" | "inclusionConnect"
  >(config);
  return (req, res, next) => {
    const maybeJwt = req.headers.authorization;
    if (!maybeJwt) {
      return responseError(res, "unauthenticated", 401);
    }
    try {
      const payload = verifyJwt(maybeJwt);
      // TODO : check that if exp > now, it throws 401
      const currentJwtVersion = currentJwtVersions[payloadKey];

      if (!payload.version || payload.version < currentJwtVersion) {
        return sendNeedsRenewedLinkError(
          res,
          new TokenExpiredError(
            "Token corresponds to an old version, please renew",
            new Date(currentJwtVersions[payloadKey]),
          ),
        );
      }

      req.payloads = { [payloadKey]: payload };

      next();
    } catch (err) {
      const castedError = castError(err);

      if (err instanceof TokenExpiredError) {
        const unsafePayload = jwt.decode(maybeJwt);
        return unsafePayload
          ? sendNeedsRenewedLinkError(res, err)
          : sendAuthenticationError(res, err);
      }

      try {
        verifyDeprecatedJwt(maybeJwt);
        return sendNeedsRenewedLinkError(res, castedError);
      } catch (error) {
        return sendAuthenticationError(res, castError(error));
      }
    }
  };
};

const sendAuthenticationError = (res: Response, error: Error) => {
  logger.error({ error, message: "authentication failed" });
  res.status(401);
  return res.json({
    status: 401,
    message: "Provided token is invalid",
  });
};

const sendNeedsRenewedLinkError = (res: Response, error: Error) => {
  logger.info({ error, message: "unsupported or expired magic link used" });
  res.status(403);
  return error instanceof Error
    ? res.json({
        message:
          error.message === "jwt expired"
            ? expiredMagicLinkErrorMessage
            : error.message,
        needsNewMagicLink: true,
      })
    : res.json({ message: JSON.stringify(error), needsNewMagicLink: true });
};

export const verifyJwtConfig = <K extends JwtKind>(config: AppConfig) => {
  const verifyJwt = makeVerifyJwtES256<K>(config.jwtPublicKey);

  const verifyDeprecatedJwt = config.previousJwtPublicKey
    ? makeVerifyJwtES256<K>(config.previousJwtPublicKey)
    : () => {
        throw new Error("No deprecated JWT private key provided");
      };

  return { verifyJwt, verifyDeprecatedJwt };
};

const responseErrorForV2 = (res: Response, message: string, status = 403) =>
  res.status(status).json({ message, status });

export const makeConsumerMiddleware = (
  getApiConsumerById: GetApiConsumerById,
  timeGateway: TimeGateway,
  config: AppConfig,
) => {
  const verifyJwt = makeVerifyJwtES256<"apiConsumer">(config.apiJwtPublicKey);
  const consumerMiddlewareLimiter = new Bottleneck.Group({
    highWater: 0,
    strategy: Bottleneck.strategy.BLOCK,
    reservoir: config.maxApiConsumerCallsPerSecond,
    reservoirRefreshInterval: 1000,
    reservoirRefreshAmount: config.maxApiConsumerCallsPerSecond,
  });

  return async (
    req: Request<any, any, any, any>,
    res: Response,
    next: NextFunction,
  ) => {
    const incTotalCountForRequest = createIncTotalCountForRequest(req);
    if (!req.headers.authorization) {
      incTotalCountForRequest({ authorisationStatus: "unauthenticated" });
      return responseErrorForV2(res, "unauthenticated", 401);
    }

    try {
      const { id } = verifyJwt(req.headers.authorization);

      const apiConsumer = await getApiConsumerById(id);

      if (!apiConsumer) {
        incTotalCountForRequest({
          authorisationStatus: "consumerNotFound",
        });
        return responseErrorForV2(res, "consumer not found", 401);
      }

      if (new Date(apiConsumer.expirationDate) < timeGateway.now()) {
        incTotalCountForRequest({
          authorisationStatus: "expiredToken",
          consumerName: apiConsumer.name,
        });
        return responseErrorForV2(res, "expired token", 401);
      }

      // only if the OAuth is known, and the id authorized, and not expired we add apiConsumer payload to the request:
      incTotalCountForRequest({
        consumerName: apiConsumer.name,
        authorisationStatus: "authorised",
      });

      const userLimiter = consumerMiddlewareLimiter.key(apiConsumer.id);

      req.apiConsumer = apiConsumer;

      return await userLimiter
        // eslint-disable-next-line @typescript-eslint/require-await
        .schedule(async () => next())
        .catch((error) => {
          logger.error({
            error,
          });
          incTotalCountForRequest({
            authorisationStatus: "tooManyRequests",
          });
          return responseErrorForV2(
            res,
            "Too many requests, please try again later.",
            429,
          );
        });
    } catch (error) {
      const castedError = castError(error);
      logger.error({
        error: castedError,
        message: `makeApiKeyAuthMiddlewareV2 : ${castedError.message}`,
      });
      incTotalCountForRequest({
        authorisationStatus: "incorrectJwt",
      });
      return responseErrorForV2(res, "incorrect Jwt", 401);
    }
  };
};
