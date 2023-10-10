import { partition } from "ramda";
import type { HttpResponse, UnknownSharedRoute } from "shared-routes";
import { EmailType, TemplatedEmail } from "./email/email";

export const expectPromiseToFail = async (promise: Promise<unknown>) => {
  await expect(promise).rejects.toThrow();
};

export const expectPromiseToFailWith = async (
  promise: Promise<unknown>,
  errorMessage: string,
) => {
  await expect(promise).rejects.toThrowError(new Error(errorMessage));
};

export const expectPromiseToFailWithError = async <T extends Error>(
  promise: Promise<unknown>,
  expectedError: T,
) => {
  await expect(promise).rejects.toThrowError(expectedError);
  await expect(promise).rejects.toBeInstanceOf(expectedError.constructor);
};

export const expectPromiseToFailWithErrorMatching = async (
  promise: Promise<unknown>,
  expectedErrorMatch: Record<string, unknown>,
) => {
  await expect(promise).rejects.toThrow();
  await promise.catch((e) => expect(e).toMatchObject(expectedErrorMatch));
};

export const expectArraysToMatch = <T>(actual: T[], expected: Partial<T>[]) => {
  expect(actual).toMatchObject(expected);
};

export const expectArraysToEqual = <T>(actual: T[], expected: T[]) => {
  expect(actual).toEqual(expected);
};

export const expectJwtInMagicLinkAndGetIt = (link: string | unknown) => {
  expect(typeof link).toBe("string");
  expect((link as string).includes("jwt=")).toBeTruthy();
  const split = (link as string).split("jwt=");
  const last = split[split.length - 1];
  expect(last).toBeTruthy();
  return last;
};

export const expectArraysToEqualIgnoringOrder = <T>(
  actual: T[],
  expected: T[],
) => {
  expect(actual).toHaveLength(expected.length);
  expect(actual).toEqual(expect.arrayContaining(expected));
};

export const splitCasesBetweenPassingAndFailing = <
  T extends string,
  P extends T,
>(
  cases: readonly T[],
  passing: readonly P[],
): [T[], T[]] =>
  partition((someCase: T) => passing.includes(someCase as P), cases);

export const expectEmailOfType = <
  T extends EmailType,
  E extends TemplatedEmail = TemplatedEmail,
>(
  email: E,
  expectedEmailType: T,
): Extract<E, { kind: T }> => {
  expect(email.kind).toBe(expectedEmailType);
  return email as Extract<E, { kind: T }>;
};

export const expectToEqual = <T>(actual: T, expected: T) => {
  expect(actual).toEqual(expected);
};

export const expectHttpResponseToEqual = <R extends HttpResponse<any, unknown>>(
  { headers, ...rest }: R,
  expected: Omit<R, "headers"> & Partial<Pick<R, "headers">>,
) => {
  const { headers: expectedHeaders, ...expectedRest } = expected;
  expect(rest).toEqual(expectedRest);
  expect(headers).toMatchObject(expectedHeaders ?? {});
};

export const expectObjectsToMatch = <T>(actual: T, expected: Partial<T>) => {
  expect(actual).toMatchObject(expected);
};

export const expectObjectInArrayToMatch = <T>(
  actual: T[],
  expected: Partial<T>[],
) => {
  expect(actual).toMatchObject(expected);
};

export const displayRouteName = (route: UnknownSharedRoute): string =>
  `${route.method.toUpperCase()} ${route.url} -`;
