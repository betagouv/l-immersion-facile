import {
  SearchMadeEntity,
  SearchMadeId,
} from "../../../domain/immersionOffer/entities/SearchMadeEntity";
import { SearchMadeRepository } from "../../../domain/immersionOffer/ports/SearchMadeRepository";
import { createLogger } from "../../../utils/logger";

const logger = createLogger(__filename);

export class InMemorySearchMadeRepository implements SearchMadeRepository {
  constructor(
    private _searchesMadeEntities: SearchMadeEntity[] = [],
    private _processedSearchesMadeIds: Set<SearchMadeId> = new Set(),
  ) {}

  public async insertSearchMade(searchMadeEntity: SearchMadeEntity) {
    logger.info(searchMadeEntity, "insertSearchMade");
    this._searchesMadeEntities.push(searchMadeEntity);
    if (!searchMadeEntity.needsToBeSearched)
      this._processedSearchesMadeIds.add(searchMadeEntity.id);
    return;
  }

  public async retrievePendingSearches(): Promise<SearchMadeEntity[]> {
    return this._searchesMadeEntities.filter(
      (entity) => !this._processedSearchesMadeIds.has(entity.id),
    );
  }
  public async markSearchAsProcessed(
    searchMadeId: SearchMadeId,
  ): Promise<void> {
    this._processedSearchesMadeIds.add(searchMadeId);
  }

  // for test purposes only
  public setSearchesMade(searchesMade: SearchMadeEntity[]) {
    this._searchesMadeEntities = searchesMade;
  }

  public get searchesMade() {
    return this._searchesMadeEntities;
  }
  public get processedSearchesMadeIds(): Set<SearchMadeId> {
    return this._processedSearchesMadeIds;
  }
}
