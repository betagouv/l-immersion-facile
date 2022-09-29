import { Observable, of, Subject } from "rxjs";
import { AbsoluteUrl, AdminToken } from "shared";
import { AdminGateway } from "src/core-logic/ports/AdminGateway";

export class TestAdminGateway implements AdminGateway {
  login(): Observable<AdminToken> {
    return this.token$;
  }

  public metabaseAgencyEmbed(_: AdminToken): Observable<AbsoluteUrl> {
    return of(`http://plop`);
  }

  public getDashboardConventionUrl(
    _token: AdminToken,
  ): Observable<AbsoluteUrl> {
    return this.conventionDashboardUrl$;
  }

  public token$ = new Subject<string>();
  public conventionDashboardUrl$ = new Subject<AbsoluteUrl>();
}
