import { Observable } from "rxjs";
import {
  ConventionDto,
  ConventionId,
  ConventionJwt,
  ConventionReadDto,
  ConventionSupportedJwt,
  DashboardUrlAndName,
  FindSimilarConventionsParams,
  InclusionConnectJwt,
  RenewConventionParams,
  ShareLinkByEmailDto,
  UpdateConventionStatusRequestDto,
} from "shared";
import { FetchConventionRequestedPayload } from "../domain/convention/convention.slice";

export interface ConventionGateway {
  retrieveFromToken$(
    payload: FetchConventionRequestedPayload,
  ): Observable<ConventionReadDto | undefined>;
  getConventionStatusDashboardUrl$(
    jwt: string,
  ): Observable<DashboardUrlAndName>;

  createConvention$(conventionDto: ConventionDto): Observable<void>;
  getSimilarConventions$(
    findSimilarConventionsParams: FindSimilarConventionsParams,
  ): Observable<ConventionId[]>;
  updateConvention$(
    conventionDto: ConventionDto,
    jwt: string,
  ): Observable<void>;
  updateConventionStatus$(
    params: UpdateConventionStatusRequestDto,
    jwt: ConventionSupportedJwt,
  ): Observable<void>;
  signConvention$(
    conventionId: ConventionId,
    jwt: ConventionJwt | InclusionConnectJwt,
  ): Observable<void>;
  shareConventionLinkByEmail(
    shareLinkByEmailDto: ShareLinkByEmailDto,
  ): Promise<boolean>;
  renewMagicLink(expiredJwt: string, originalUrl: string): Promise<void>;
  renewConvention$(
    params: RenewConventionParams,
    jwt: ConventionSupportedJwt,
  ): Observable<void>;
}
