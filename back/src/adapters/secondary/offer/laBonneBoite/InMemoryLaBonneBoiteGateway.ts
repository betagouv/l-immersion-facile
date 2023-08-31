import { SearchResultDto } from "shared";
import {
  LaBonneBoiteGateway,
  LaBonneBoiteRequestParams,
} from "../../../../domain/offer/ports/LaBonneBoiteGateway";
import { LaBonneBoiteCompanyDto } from "./LaBonneBoiteCompanyDto";

export class InMemoryLaBonneBoiteGateway implements LaBonneBoiteGateway {
  constructor(
    private _results: LaBonneBoiteCompanyDto[] = [],
    private _error: Error | null = null,
    public nbOfCalls: number = 0,
  ) {}

  public async searchCompanies(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { distanceKm }: LaBonneBoiteRequestParams,
  ): Promise<SearchResultDto[]> {
    this.nbOfCalls = this.nbOfCalls + 1;
    if (this._error) throw this._error;
    return this._results
      .filter(
        (result) =>
          result.props.distance <= distanceKm && result.isCompanyRelevant(),
      )
      .map((result) => result.toSearchResult());
  }

  public setError(error: Error | null) {
    this._error = error;
  }

  // for test purposes only
  public setNextResults(results: LaBonneBoiteCompanyDto[]) {
    this._results = results;
  }
}
