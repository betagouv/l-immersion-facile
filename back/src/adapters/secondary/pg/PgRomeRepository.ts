import { Kysely } from "kysely";
import { AppellationAndRomeDto, AppellationCode, RomeDto } from "shared";
import { RomeRepository } from "../../../domain/rome/ports/RomeRepository";
import { createLogger } from "../../../utils/logger";
import { executeKyselyRawSqlQuery, ImmersionDatabase } from "./sql/database";

const logger = createLogger(__filename);

export class PgRomeRepository implements RomeRepository {
  constructor(private transaction: Kysely<ImmersionDatabase>) {}

  public async appellationToCodeMetier(
    romeCodeAppellation: string,
  ): Promise<string | undefined> {
    return executeKyselyRawSqlQuery<{ code_rome: string }>(
      this.transaction,
      `SELECT code_rome
        FROM public_appellations_data
        WHERE ogr_appellation=$1`,
      [romeCodeAppellation],
    )
      .then((queryResult) => {
        const code_rome = queryResult.rows.at(0)?.code_rome;
        if (!code_rome)
          logger.error(
            { romeCodeAppellation, resultFromQuery: queryResult },
            "could not fetch rome code with given appellation",
          );
        return code_rome;
      })
      .catch((e) => {
        logger.error(e);
        return undefined;
      });
  }

  public async getAppellationAndRomeDtosFromAppellationCodes(
    codes: AppellationCode[],
  ): Promise<AppellationAndRomeDto[]> {
    const { rows } = await executeKyselyRawSqlQuery(
      this.transaction,
      `
        SELECT ogr_appellation, libelle_appellation_long, appellations.code_rome, libelle_rome
        FROM public_appellations_data AS appellations
        JOIN public_romes_data AS romes ON  appellations.code_rome = romes.code_rome
        WHERE appellations.ogr_appellation = ANY ($1)
    `,
      [codes],
    );
    return rows.map(convertRowToAppellationDto);
  }

  public async searchAppellation(
    query: string,
  ): Promise<AppellationAndRomeDto[]> {
    const [queryBeginning, lastWord] = prepareQueryParams(query);

    return executeKyselyRawSqlQuery(
      this.transaction,
      `SELECT ogr_appellation, libelle_appellation_long, public_appellations_data.code_rome, libelle_rome
        FROM public_appellations_data 
        JOIN public_romes_data ON  public_appellations_data.code_rome = public_romes_data.code_rome
        WHERE
           (libelle_appellation_long_tsvector @@ to_tsquery('french',$1) AND libelle_appellation_long_without_special_char ILIKE $3)
           OR (libelle_appellation_long_without_special_char ILIKE $2 AND libelle_appellation_long_without_special_char ILIKE $3)
        LIMIT 80`,
      [toTsQuery(queryBeginning), `%${queryBeginning}%`, `%${lastWord}%`],
    )
      .then((res) => res.rows.map(convertRowToAppellationDto))
      .catch((error) => {
        logger.error({ error, query }, "searchAppellation error");
        return [];
      });
  }

  public async searchRome(query: string): Promise<RomeDto[]> {
    const [queryBeginning, lastWord] = prepareQueryParams(query);
    return executeKyselyRawSqlQuery(
      this.transaction,
      `
        WITH matching_rome AS(
            WITH search_corpus AS (
              SELECT code_rome, libelle_rome::text AS searchable_text, libelle_rome_tsvector AS ts_vector FROM public_romes_data
              UNION
              SELECT code_rome, libelle_appellation_long_without_special_char AS searchable_text, libelle_appellation_long_tsvector AS ts_vector FROM  public_appellations_data
            )
            SELECT DISTINCT code_rome
            FROM search_corpus 
            WHERE
              (ts_vector @@ to_tsquery('french',$1) AND searchable_text ILIKE $3)
              OR (searchable_text ILIKE $2 AND searchable_text ILIKE $3)
            LIMIT 80
            )
        SELECT matching_rome.code_rome, libelle_rome
        FROM matching_rome LEFT JOIN public_romes_data ON matching_rome.code_rome = public_romes_data.code_rome`,
      [toTsQuery(queryBeginning), `%${queryBeginning}%`, `%${lastWord}%`],
    )
      .then((queryResult) =>
        queryResult.rows.map(
          (row): RomeDto => ({
            romeCode: row.code_rome,
            romeLabel: row.libelle_rome,
          }),
        ),
      )
      .catch((e) => {
        logger.error(e);
        return [];
      });
  }
}

const convertRowToAppellationDto = (row: any): AppellationAndRomeDto => ({
  appellationCode: row.ogr_appellation?.toString(),
  romeCode: row.code_rome,
  appellationLabel: row.libelle_appellation_long,
  romeLabel: row.libelle_rome,
});

const toTsQuery = (query: string): string => query.split(/\s+/).join(" & ");

const prepareQueryParams = (query: string): [string, string] => {
  const queryWords = query.split(/\s+/);
  const lastWord = removeAccentAndParentheses(
    queryWords[queryWords.length - 1],
  );
  const queryBeginning = removeAccentAndParentheses(
    queryWords.length === 1
      ? queryWords.join(" ")
      : queryWords.slice(0, queryWords.length - 1).join(" "),
  );

  return [queryBeginning, lastWord];
};

const removeAccentAndParentheses = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()]/g, "");
