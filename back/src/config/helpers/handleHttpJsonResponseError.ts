import * as Sentry from "@sentry/node";
import { Request, Response } from "express";
import { HttpError } from "./httpErrors";
import { unhandledError } from "./unhandledError";

type ErrorObject = {
  errorMessage: string;
  status: number;
  issues?: string[];
};
export const handleHttpJsonResponseError = (
  req: Request,
  res: Response,
  error: any,
): Response<any, Record<string, any>> => {
  if (!isManagedError(error)) {
    Sentry.captureException(error);
    return unhandledError(error, req, res);
  }

  if (error instanceof HttpError) {
    Sentry.captureException(error);
    res.status(error.httpCode);
    return res.json({ errors: toValidJSONObjectOrString(error) });
  }

  throw Error("Should never reach there");
};

export const handleHttpJsonResponseErrorForApiV2 = (
  req: Request,
  res: Response,
  error: any,
): Response<any, Record<string, ErrorObject>> => {
  if (!isManagedError(error)) return unhandledError(error, req, res);

  if (error instanceof HttpError) {
    res.status(error.httpCode);
    return res.json({
      ...(error.issues ? { issues: error.issues } : {}),
      message: toValidJSONObjectOrString(error),
      status: error.httpCode,
    });
  }

  throw Error("Should never reach there");
};

const isManagedError = (error: unknown): boolean => error instanceof HttpError;

const toValidJSONObjectOrString = (
  error: HttpError,
): string | { [key: string]: string } => {
  try {
    return JSON.parse(error.message);
  } catch (_) {
    return error.message;
  }
};
