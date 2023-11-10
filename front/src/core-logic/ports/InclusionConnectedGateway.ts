import { Observable } from "rxjs";
import {
  AbsoluteUrl,
  AgencyId,
  ConventionSupportedJwt,
  InclusionConnectedUser,
  MarkPartnersErroredConventionAsHandledRequest,
  WithSourcePage,
} from "shared";

export interface InclusionConnectedGateway {
  getCurrentUser$(token: string): Observable<InclusionConnectedUser>;
  registerAgenciesToCurrentUser$(
    agencyIds: AgencyId[],
    token: string,
  ): Observable<void>;
  markPartnersErroredConventionAsHandled$(
    params: MarkPartnersErroredConventionAsHandledRequest,
    jwt: ConventionSupportedJwt,
  ): Observable<void>;
  getLogoutUrl$(params: WithSourcePage): Observable<AbsoluteUrl>;
}
