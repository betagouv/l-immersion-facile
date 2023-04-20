import { from, Observable } from "rxjs";
import {
  AbsoluteUrl,
  AdminTargets,
  AgencyDto,
  AuthenticatedUser,
  AuthenticatedUserId,
  BackOfficeJwt,
  EstablishmentBatchReport,
  FormEstablishmentBatchDto,
  GetDashboardParams,
  UserAndPassword,
} from "shared";
import { HttpClient } from "http-client";
import { RegisterAgencyWithRoleToUserPayload } from "src/core-logic/domain/agenciesAdmin/agencyAdmin.slice";
import { AdminGateway } from "src/core-logic/ports/AdminGateway";

export class HttpAdminGateway implements AdminGateway {
  constructor(private readonly httpClient: HttpClient<AdminTargets>) {}

  public login(userAndPassword: UserAndPassword): Observable<BackOfficeJwt> {
    return from(
      this.httpClient
        .login({ body: userAndPassword })
        .then(({ responseBody }) => responseBody),
    );
  }

  public getDashboardUrl$(
    params: GetDashboardParams,
    token: BackOfficeJwt,
  ): Observable<AbsoluteUrl> {
    return from(
      this.httpClient
        .getDashboardUrl({
          urlParams: { dashboardName: params.name },
          queryParams: {
            ...(params.name === "agency" ? { agencyId: params.agencyId } : {}),
          },
          headers: {
            authorization: token,
          },
        })
        .then(({ responseBody }) => responseBody),
    );
  }
  public addEstablishmentBatch$(
    establishmentBatch: FormEstablishmentBatchDto,
    token: BackOfficeJwt,
  ): Observable<EstablishmentBatchReport> {
    return from(
      this.httpClient
        .addFormEstablishmentBatch({
          headers: {
            authorization: token,
          },
          body: establishmentBatch,
        })
        .then(({ responseBody }) => responseBody),
    );
  }

  public updateAgencyRoleForUser$(
    _params: RegisterAgencyWithRoleToUserPayload,
    _token: string,
  ): Observable<void> {
    throw new Error("Method not implemented.");
  }

  public getAgenciesToReviewForUser$(
    _userId: AuthenticatedUserId,
    _token: string,
  ): Observable<AgencyDto[]> {
    throw new Error("Method not implemented.");
  }

  public getAgencyUsersToReview$(
    _token: BackOfficeJwt,
  ): Observable<AuthenticatedUser[]> {
    throw new Error("Method not implemented.");
  }
}
