import { ConventionReadDto } from "shared";
import { ConventionQueries } from "../../domain/convention/ports/ConventionQueries";
import { EstablishmentLeadEventKind } from "../../domain/offer/entities/EstablishmentLeadEntity";
import { EstablishmentLeadQueries } from "../../domain/offer/ports/EstablishmentLeadQueries";
import { InMemoryEstablishmentLeadRepository } from "./offer/InMemoryEstablishmentLeadRepository";

export class InMemoryEstablishmentLeadQueries
  implements EstablishmentLeadQueries
{
  constructor(
    private readonly establishmentLeadRepository: InMemoryEstablishmentLeadRepository,
    private readonly conventionQueries: ConventionQueries,
  ) {}

  public async getLastConventionsByLastEventKind(
    kind: EstablishmentLeadEventKind,
  ): Promise<ConventionReadDto[]> {
    const sirets =
      await this.establishmentLeadRepository.getSiretsByLastEventKind(kind);
    return this.conventionQueries.getLatestConventionBySirets(sirets);
  }
}
