import { CompiledQuery, Kysely } from "kysely";
import format from "pg-format";
import {
  ConventionId,
  ConventionReadDto,
  conventionReadSchema,
  filterNotFalsy,
  Flavor,
  ListConventionsRequestDto,
  validatedConventionStatuses,
} from "shared";
import {
  ConventionQueries,
  GetConventionByFiltersQueries,
} from "../../../domain/convention/ports/ConventionQueries";
import { ImmersionDatabase } from "./sql/database";
import {
  getReadConventionById,
  selectAllConventionDtosById,
} from "./pgConventionSql";

type WhereClause = Flavor<string, "WhereClause">;

type GetConventionsRequestProperties = {
  whereClauses?: WhereClause[];
  orderByClause?: string;
  limit?: number;
};

export class PgConventionQueries implements ConventionQueries {
  constructor(private transaction: Kysely<ImmersionDatabase>) {}

  public async getAllConventionsForThoseEndingThatDidntReceivedAssessmentLink(
    dateEnd: Date,
  ): Promise<ConventionReadDto[]> {
    return this.getConventionsWhere({
      whereClauses: [
        this.whereConventionsDateEndMatch(dateEnd),
        this.whereConventionsAreValidated(),
        this.whereConventionsAssessmentEmailHasNotBeenAlreadySent(),
      ],
    });
  }

  public async getConventionById(
    id: ConventionId,
  ): Promise<ConventionReadDto | undefined> {
    return getReadConventionById(this.transaction, id);
  }

  getConventionsByFilters({
    startDateGreater,
    startDateLessOrEqual,
    withStatuses,
  }: GetConventionByFiltersQueries): Promise<ConventionReadDto[]> {
    return this.getConventionsWhere({
      whereClauses: [
        withStatuses && withStatuses.length > 0
          ? format("conventions.status IN (%1$L)", withStatuses)
          : undefined,
        startDateLessOrEqual
          ? format("conventions.date_start::date <= %1$L", startDateLessOrEqual)
          : undefined,
        startDateGreater
          ? format("conventions.date_start::date > %1$L", startDateGreater)
          : undefined,
      ].filter(filterNotFalsy),
    });
  }

  private async getConventionsWhere({
    whereClauses,
    orderByClause,
    limit,
  }: GetConventionsRequestProperties): Promise<ConventionReadDto[]> {
    const query = [
      selectAllConventionDtosById,
      whereClauses &&
        whereClauses.length > 0 &&
        `WHERE ${whereClauses.join(" AND ")}`,
      orderByClause,
      limit && `LIMIT ${limit}`,
    ]
      .filter(filterNotFalsy)
      .join("\n");

    const pgResult = await this.transaction.executeQuery<{ dto: any }>(
      CompiledQuery.raw(query),
    );
    return pgResult.rows.map((row) => conventionReadSchema.parse(row.dto));
  }

  public async getLatestConventions({
    status,
    agencyId,
  }: ListConventionsRequestDto): Promise<ConventionReadDto[]> {
    return this.getConventionsWhere({
      whereClauses: [
        status && format("conventions.status = %1$L", status),
        agencyId && format("conventions.agency_id::text = %1$L", agencyId),
      ].filter(filterNotFalsy),
      orderByClause: "ORDER BY date_validation DESC",
      limit: 10,
    });
  }

  private whereConventionsAreValidated(): WhereClause {
    return format("conventions.status IN (%1$L)", validatedConventionStatuses);
  }

  private whereConventionsAssessmentEmailHasNotBeenAlreadySent(): WhereClause {
    return format(
      "conventions.id NOT IN (SELECT (payload ->> 'id')::uuid FROM outbox where topic = 'EmailWithLinkToCreateAssessmentSent' )",
    );
  }

  private whereConventionsDateEndMatch(dateEnd: Date): WhereClause {
    return format("conventions.date_end::date = %1$L", dateEnd);
  }
}
