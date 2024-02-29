import {
  PeAgenciesReferential,
  PeAgencyFromReferenciel,
} from "../../../establishment/ports/PeAgenciesReferential";

export class InMemoryPeAgenciesReferential implements PeAgenciesReferential {
  #peAgencies: PeAgencyFromReferenciel[] = [];

  public async getPeAgencies(): Promise<PeAgencyFromReferenciel[]> {
    return this.#peAgencies;
  }

  public setPeAgencies(peAgencies: PeAgencyFromReferenciel[]) {
    this.#peAgencies = peAgencies;
  }
}
