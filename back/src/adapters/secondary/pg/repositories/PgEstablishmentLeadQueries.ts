import { andThen } from "ramda";
import { ConventionReadDto, filter, pipeWithValue } from "shared";
import { isSiretsListFilled } from "../../../../domain/offer/entities/EstablishmentLeadEntity";
import { EstablishmentLeadQueries } from "../../../../domain/offer/ports/EstablishmentLeadQueries";
import { EstablishmentLeadReminderParams } from "../../../../domain/offer/useCases/SendEstablishmentLeadReminderScript";
import { KyselyDb } from "../kysely/kyselyUtils";
import { validateConventionReadResults } from "./PgConventionQueries";
import { getEstablishmentLeadSiretsByUniqLastEventKindBuilder } from "./PgEstablishmentLeadRepository";
import {
  createConventionReadQueryBuilder,
  makeGetLastConventionWithSiretInList,
} from "./pgConventionSql";

export class PgEstablishmentLeadQueries implements EstablishmentLeadQueries {
  constructor(private transaction: KyselyDb) {}

  public async getLastConventionsByUniqLastEventKind(
    params: EstablishmentLeadReminderParams,
  ): Promise<ConventionReadDto[]> {
    const withSiretList =
      await getEstablishmentLeadSiretsByUniqLastEventKindBuilder(
        this.transaction,
        params,
      ).execute();

    const sirets = withSiretList.map(({ siret }) => siret);

    if (!isSiretsListFilled(sirets)) return [];

    return pipeWithValue(
      createConventionReadQueryBuilder(this.transaction),
      makeGetLastConventionWithSiretInList(sirets),
      (builder) => builder.execute(),
      andThen(filter((conv) => conv.rn === "1")),
      andThen(validateConventionReadResults),
    );
  }
}
