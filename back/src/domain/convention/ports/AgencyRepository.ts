import {
  AgencyDto,
  AgencyId,
  GetAgenciesFilter,
  PartialAgencyDto,
} from "shared";

export interface AgencyRepository {
  getBySafir(safirCode: string): Promise<AgencyDto | undefined>;
  insert: (agency: AgencyDto) => Promise<AgencyId | undefined>;
  update: (partialAgency: PartialAgencyDto) => Promise<void>;
  getByIds: (ids: AgencyId[]) => Promise<AgencyDto[]>;
  getById: (ids: AgencyId) => Promise<AgencyDto | undefined>;
  getAgenciesRelatedToAgency(id: AgencyId): Promise<AgencyDto[]>;
  getImmersionFacileAgencyId: () => Promise<AgencyId | undefined>;
  getAgencies: (props: {
    filters?: GetAgenciesFilter;
    limit?: number;
  }) => Promise<AgencyDto[]>;
  getAgencyWhereEmailMatches: (email: string) => Promise<AgencyDto | undefined>;
}

export const someAgenciesMissingMessage = (agencyIds: AgencyId[]) =>
  `Some agencies not found with ids : ${agencyIds.map((id) => `'${id}'`)}.`;
export const referedAgencyMissingMessage = (refersToAgencyId: AgencyId) =>
  `Refered agency with id '${refersToAgencyId}' missing on agency repository.`;
export const agencyMissingMessage = (agencyId: AgencyId): string =>
  `Agency with id '${agencyId}' missing.`;
