import { from, Observable } from "rxjs";
import { match, P } from "ts-pattern";
import {
  AbsoluteUrl,
  ConventionDto,
  ConventionId,
  ConventionJwt,
  ConventionMagicLinkRoutes,
  ConventionReadDto,
  ConventionSupportedJwt,
  FindSimilarConventionsParams,
  InclusionConnectJwt,
  RenewConventionParams,
  ShareLinkByEmailDto,
  UnauthenticatedConventionRoutes,
  UpdateConventionStatusRequestDto,
} from "shared";
import { HttpClient } from "shared-routes";
import {
  logBodyAndThrow,
  otherwiseThrow,
} from "src/core-logic/adapters/otherwiseThrow";
import { FetchConventionRequestedPayload } from "src/core-logic/domain/convention/convention.slice";
import { ConventionGateway } from "src/core-logic/ports/ConventionGateway";

export class HttpConventionGateway implements ConventionGateway {
  constructor(
    private readonly magicLinkHttpClient: HttpClient<ConventionMagicLinkRoutes>,
    private readonly unauthenticatedHttpClient: HttpClient<UnauthenticatedConventionRoutes>,
  ) {}

  public createConvention$(conventionDto: ConventionDto): Observable<void> {
    return from(
      this.unauthenticatedHttpClient
        .createConvention({
          body: conventionDto,
        })
        .then((response) =>
          match(response)
            .with({ status: 200 }, () => undefined)
            .otherwise(otherwiseThrow),
        ),
    );
  }

  public getConventionStatusDashboardUrl$(
    jwt: string,
  ): Observable<AbsoluteUrl> {
    return from(
      this.magicLinkHttpClient
        .getConventionStatusDashboard({
          headers: { authorization: jwt },
        })
        .then((response) =>
          match(response)
            .with({ status: 200 }, ({ body }) => body)
            .otherwise(otherwiseThrow),
        ),
    );
  }

  public getSimilarConventions$(
    findSimilarConventionsParams: FindSimilarConventionsParams,
  ): Observable<ConventionId[]> {
    return from(
      this.unauthenticatedHttpClient
        .findSimilarConventions({
          queryParams: findSimilarConventionsParams,
        })
        .then((response) =>
          match(response)
            .with({ status: 200 }, ({ body }) => body.similarConventionIds)
            .otherwise(otherwiseThrow),
        ),
    );
  }

  public renewConvention$(
    params: RenewConventionParams,
    jwt: ConventionSupportedJwt,
  ): Observable<void> {
    return from(
      this.magicLinkHttpClient
        .renewConvention({
          body: params,
          headers: { authorization: jwt },
        })
        .then((response) =>
          match(response)
            .with({ status: 200 }, () => undefined)
            .with({ status: P.union(400, 403) }, logBodyAndThrow)
            .otherwise(otherwiseThrow),
        ),
    );
  }

  public async renewMagicLink(
    expiredJwt: string,
    originalUrl: string,
  ): Promise<void> {
    await this.unauthenticatedHttpClient.renewMagicLink({
      queryParams: {
        expiredJwt,
        originalUrl: encodeURIComponent(originalUrl),
      },
    });
  }

  public retrieveFromToken$(
    payload: FetchConventionRequestedPayload,
  ): Observable<ConventionReadDto | undefined> {
    return from(
      this.magicLinkHttpClient
        .getConvention({
          headers: { authorization: payload.jwt },
          urlParams: { conventionId: payload.conventionId },
        })
        .then((response) =>
          match(response)
            .with({ status: 200 }, ({ body }) => body)
            .with({ status: 404 }, () => undefined)
            .otherwise(otherwiseThrow),
        ),
    );
  }

  public shareConventionLinkByEmail(
    conventionDto: ShareLinkByEmailDto,
  ): Promise<boolean> {
    return this.unauthenticatedHttpClient
      .shareConvention({
        body: conventionDto,
      })
      .then((response) =>
        match(response)
          .with({ status: 200 }, () => true)
          .with({ status: 400 }, () => false)
          .otherwise(otherwiseThrow),
      );
  }

  public signConvention$(
    conventionId: ConventionId,
    jwt: ConventionJwt | InclusionConnectJwt,
  ): Observable<void> {
    return from(
      this.magicLinkHttpClient
        .signConvention({
          headers: { authorization: jwt },
          urlParams: { conventionId },
        })
        .then((response) =>
          match(response)
            .with({ status: 200 }, () => undefined)
            .with({ status: 403 }, logBodyAndThrow)
            .otherwise(otherwiseThrow),
        ),
    );
  }

  public updateConvention$(
    convention: ConventionDto,
    jwt: string,
  ): Observable<void> {
    return from(
      this.magicLinkHttpClient
        .updateConvention({
          body: { convention },
          urlParams: { conventionId: convention.id },
          headers: { authorization: jwt },
        })
        .then((response) =>
          match(response)
            .with({ status: 200 }, () => undefined)
            .otherwise(otherwiseThrow),
        ),
    );
  }

  public updateConventionStatus$(
    params: UpdateConventionStatusRequestDto,
    jwt: string,
  ): Observable<void> {
    return from(
      this.magicLinkHttpClient
        .updateConventionStatus({
          body: params,
          headers: { authorization: jwt },
        })
        .then((response) =>
          match(response)
            .with({ status: 200 }, () => undefined)
            .otherwise(otherwiseThrow),
        ),
    );
  }
}
