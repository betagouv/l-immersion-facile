import { z } from "zod";
import { OpacifiedLogger } from "../../utils/logger";

export abstract class HttpError extends Error {
  public abstract httpCode: number;

  constructor(
    message?: any,
    public readonly issues?: string[],
  ) {
    super(message);
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export class UnauthorizedError extends HttpError {
  public httpCode = 401;

  constructor() {
    super("Veuillez vous authentifier");
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

const makeForbiddenMessage = (reason?: string): string =>
  reason ?? "Accès refusé";

export class ForbiddenError extends HttpError {
  public httpCode = 403;

  constructor(reason?: string) {
    super(makeForbiddenMessage(reason));
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class FeatureDisabledError extends HttpError {
  public httpCode = 424;

  constructor(disableService?: string) {
    super(`${disableService} is disabled`);
    Object.setPrototypeOf(this, FeatureDisabledError.prototype);
  }
}

export class NotFoundError extends HttpError {
  public httpCode = 404;

  constructor(msg?: any) {
    super(msg);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class BadRequestError extends HttpError {
  public httpCode = 400;

  constructor(msg?: any, issues?: string[]) {
    super(msg, issues);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class ConflictError extends HttpError {
  public httpCode = 409;

  constructor(msg: any) {
    super(msg);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class TooManyRequestApiError extends HttpError {
  public httpCode = 429;

  constructor(public serviceName: string) {
    super(`Le service ${serviceName} a subit trop de solicitation`);
    Object.setPrototypeOf(this, TooManyRequestApiError.prototype);
  }
}

export class UpgradeRequired extends HttpError {
  public httpCode = 426;

  constructor(msg: any) {
    super(msg);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class UnavailableApiError extends HttpError {
  public httpCode = 503;

  constructor(public serviceName: string) {
    super(`Le service ${serviceName} n'est pas disponible`);
    Object.setPrototypeOf(this, UnavailableApiError.prototype);
  }
}

export const validateAndParseZodSchema = <T>(
  inputSchema: z.Schema<T>,
  data: any,
  logger: OpacifiedLogger,
): T => {
  try {
    return inputSchema.parse(data);
  } catch (e) {
    logger.error({ data, message: "ValidateAndParseZodSchema failed" });
    throw new BadRequestError(e);
  }
};

export const validateAndParseZodSchemaV2 = <T>(
  inputSchema: z.Schema<T>,
  data: unknown,
  logger: OpacifiedLogger,
): T => {
  try {
    return inputSchema.parse(data);
  } catch (e) {
    logger.error({ data, message: "ValidateAndParseZodSchema failed" });
    const error = e as z.ZodError;
    const issues = error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new BadRequestError("Schema validation failed", issues);
  }
};
