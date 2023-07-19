import { AnyObj, EmptyObj, PathParameters, Url } from "./utilityTypes";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type MethodAndUrl<UrlWithParams = Url> = {
  method: HttpMethod;
  url: UrlWithParams;
  responseType?:
    | "arraybuffer"
    | "blob"
    | "document"
    | "json"
    | "text"
    | "stream";
};

type OptionalFields<Body, QueryParams, Headers, ResponseBody> = {
  validateRequestBody?: (body: unknown) => Body;
  validateQueryParams?: (queryParams: unknown) => QueryParams;
  validateHeaders?: (headers: unknown) => Headers;
  validateResponseBody?: (responseBody: unknown) => ResponseBody;
};

type TargetWithOptionalFields<
  Body = void,
  QueryParams = void,
  Headers = void,
  UrlWithParams = Url,
  ResponseBody = void,
> = MethodAndUrl<UrlWithParams> &
  OptionalFields<Body, QueryParams, Headers, ResponseBody>;

type Target<
  Body = void,
  QueryParams = void,
  Headers = void,
  UrlWithParams = Url,
  ResponseBody = void,
> = MethodAndUrl<UrlWithParams> &
  Required<OptionalFields<Body, QueryParams, Headers, ResponseBody>>;

export type HttpResponse<ResponseBody> = {
  responseBody: ResponseBody;
  status: number;
};

export type UnknownTarget = Target<unknown, unknown, unknown, Url, unknown>;

// prettier-ignore
/* If the body is not void return '{}' (required for union)
 * else return the generic parameter defined for the target
 */
export type HandlerParams<T extends UnknownTarget> =
  (PathParameters<T["url"]> extends EmptyObj ? AnyObj : { urlParams: PathParameters<T["url"]>})
  & (ReturnType<T["validateRequestBody"]> extends void ? AnyObj : { body: ReturnType<T["validateRequestBody"]> })
  & (ReturnType<T["validateQueryParams"]> extends void ? AnyObj : { queryParams: ReturnType<T["validateQueryParams"]> })
  & (ReturnType<T["validateHeaders"]> extends void ? AnyObj : { headers: ReturnType<T["validateHeaders"]> })

export type Handler<T extends UnknownTarget> = (
  params: HandlerParams<T>,
) => Promise<HttpResponse<ReturnType<T["validateResponseBody"]>>>;

export type HttpClient<Targets extends Record<string, UnknownTarget>> = {
  _tag: "http-client";
} & {
  [TargetName in keyof Targets]: (
    // prettier-ignore
    ...params: [
      Target<void, void, void, Targets[TargetName]["url"], any>,
      PathParameters<Targets[TargetName]["url"]>
    ] extends [Targets[TargetName], EmptyObj]
          ? []
          : [HandlerParams<Targets[TargetName]>]
  ) => Promise<
    HttpResponse<ReturnType<Targets[TargetName]["validateResponseBody"]>>
  >;
};
export type HandlerCreator = <T extends UnknownTarget>(target: T) => Handler<T>;

const createThrowIfNotVoid =
  <T>(paramName: string, { method, url }: MethodAndUrl) =>
  (param: unknown): T => {
    if (!param && param !== false) return undefined as T;
    const message = `In route ${method} ${url} : No validation function provided for ${paramName} validation.`;
    const error = new Error(message);

    error.cause = {
      message,
      method,
      url,
      paramName,
    };

    throw error;
  };
export const createTarget = <
  Body = void,
  QueryParams = void,
  Headers = void,
  UrlWithParams extends Url = Url,
  ResponseBody = void,
>(
  target: TargetWithOptionalFields<
    Body,
    QueryParams,
    Headers,
    UrlWithParams,
    ResponseBody
  >,
): Target<Body, QueryParams, Headers, UrlWithParams, ResponseBody> => ({
  validateRequestBody: createThrowIfNotVoid("requestBody", target),
  validateQueryParams: createThrowIfNotVoid("queryParams", target),
  validateHeaders: (headers) => headers as Headers,
  validateResponseBody: createThrowIfNotVoid("responseBody", target),
  ...target,
  responseType: target.responseType ?? "json",
});

export const createTargets = <
  Targets extends Record<string, UnknownTarget>,
>(targets: {
  [TargetName in keyof Targets]: Targets[TargetName];
}) => targets;

export const configureHttpClient =
  (handlerCreator: HandlerCreator) =>
  <Targets extends Record<string, UnknownTarget>>(targets: {
    [TargetName in keyof Targets]: Targets[TargetName];
  }): HttpClient<Targets> =>
    Object.keys(targets).reduce(
      (acc, targetName: keyof typeof targets) => {
        const target = targets[targetName];

        const handler: Handler<any> = async (handlerParams) => {
          const handlerWithParams = handlerCreator({
            ...target,
            url: replaceParamsInUrl(target.url, handlerParams?.urlParams),
          });
          return handlerWithParams(handlerParams as any);
        };

        return {
          ...acc,
          [targetName]: handler,
        };
      },
      { _tag: "http-client" } as HttpClient<Targets>,
    );

export const replaceParamsInUrl = <UrlToReplace extends Url>(
  path: UrlToReplace,
  params: PathParameters<UrlToReplace> = {} as PathParameters<UrlToReplace>,
): Url => {
  const paramNames = Object.keys(params) as (keyof typeof params)[];
  if (paramNames.length === 0) return path;
  return paramNames.reduce(
    (acc, paramName) =>
      acc.replace(`:${paramName.toString()}`, params[paramName]),
    path as any,
  );
};
