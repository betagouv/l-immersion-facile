import {
  Expression,
  ExpressionWrapper,
  Kysely,
  PostgresDialect,
  RawBuilder,
  Simplify,
  sql,
} from "kysely";
import { Pool } from "pg";
import { Falsy } from "ramda";
import { createLogger } from "../../../utils/logger";
import { notifyErrorObjectToTeam } from "../../../utils/notifyTeam";
import { Database } from "./model/database";

export const jsonBuildObject = <O extends Record<string, Expression<unknown>>>(
  obj: O,
): RawBuilder<
  Simplify<{
    [K in keyof O]: O[K] extends Expression<infer V> ? V : never;
  }>
> =>
  sql`json_build_object(${sql.join(
    Object.keys(obj).flatMap((k) => [sql.lit(k), obj[k]]),
  )})`;

type NullableToUndefined<A> = A extends null ? Exclude<A, null> | undefined : A;

type StripNullRecursive<T> = {
  [K in keyof T]: T[K] extends Record<any, unknown>
    ? StripNullRecursive<T[K]>
    : NullableToUndefined<T[K]>;
};

export const jsonStripNulls = <T>(
  obj: RawBuilder<T>,
): RawBuilder<StripNullRecursive<T>> => sql`json_strip_nulls(${obj})`;

type KyselyOptions = {
  skipErrorLog?: boolean;
};

export const makeKyselyDb = (pool: Pool, options?: KyselyOptions): KyselyDb => {
  const logger = createLogger(__filename);
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
    log(event): void {
      if (options?.skipErrorLog) return;
      if (event.level === "error") {
        const error: any = event.error;
        const params = {
          message: "SQL ERROR",
          durationInSeconds: event.queryDurationMillis / 1000,
          error: {
            error: "message" in error ? error.message : error,
            query: event.query.sql,
            params: event.query.parameters,
          },
        };
        notifyErrorObjectToTeam(params);
        logger.error(params);
      } else if (event.queryDurationMillis > 1_000) {
        logger.warn({
          message: "SQL QUERY TOO LONG",
          durationInSeconds: event.queryDurationMillis / 1000,
          error: { query: event.query.sql },
        });
      }
    },
  });
};

export const cast = <Cast>(query: ExpressionWrapper<any, any, any>) =>
  sql<Cast>`${query}`;

export type KyselyDb = Kysely<Database>;

export const falsyToNull = <T>(value: T | Falsy): T | null =>
  value ? value : null;

//https://github.com/kysely-org/kysely/issues/839
//https://old.kyse.link/?p=s&i=C0yoagEodj9vv4AxE3TH
export function values<R extends Record<string, unknown>, A extends string>(
  records: R[],
  alias: A,
) {
  // Assume there's at least one record and all records
  // have the same keys.
  const keys = Object.keys(records[0]);

  // Transform the records into a list of lists such as
  // ($1, $2, $3), ($4, $5, $6)
  const values = sql.join(
    records.map((r) => sql`(${sql.join(keys.map((k) => r[k]))})`),
  );

  // Create the alias `v(id, v1, v2)` that specifies the table alias
  // AND a name for each column.
  const wrappedAlias = sql.ref(alias);
  const wrappedColumns = sql.join(keys.map(sql.ref));
  const aliasSql = sql`${wrappedAlias}(${wrappedColumns})`;

  // Finally create a single `AliasedRawBuilder` instance of the
  // whole thing. Note that we need to explicitly specify
  // the alias type using `.as<A>` because we are using a
  // raw sql snippet as the alias.
  return sql<R>`(values ${values})`.as<A>(aliasSql);
}
