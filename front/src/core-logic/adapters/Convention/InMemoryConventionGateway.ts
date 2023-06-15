import { from, Observable, Subject } from "rxjs";
import {
  AbsoluteUrl,
  AgencyOption,
  BackOfficeJwt,
  ConventionDto,
  ConventionDtoBuilder,
  ConventionId,
  ConventionReadDto,
  Role,
  ShareLinkByEmailDto,
  sleep,
  UpdateConventionStatusRequestDto,
} from "shared";
import { FetchConventionRequestedPayload } from "src/core-logic/domain/convention/convention.slice";
import { ConventionGateway } from "src/core-logic/ports/ConventionGateway";

const CONVENTION_DRAFT_TEST = new ConventionDtoBuilder()
  .withStatus("DRAFT")
  .build();

const CONVENTION_VALIDATED_TEST = new ConventionDtoBuilder()
  .withStatus("ACCEPTED_BY_VALIDATOR")
  .build();

export class InMemoryConventionGateway implements ConventionGateway {
  public constructor(private simulatedLatency?: number) {}

  public retrieveFromToken$(
    payload: FetchConventionRequestedPayload,
  ): Observable<ConventionReadDto | undefined> {
    return this.simulatedLatency
      ? from(this.getMagicLink(payload))
      : this.convention$;
  }

  public newConvention$(_convention: ConventionDto): Observable<void> {
    this.addConventionCallCount++;
    return this.addConventionResult$;
  }

  public async retreiveById(id: ConventionId): Promise<ConventionReadDto> {
    this.simulatedLatency && (await sleep(this.simulatedLatency));
    return this.inferConventionReadDto(this._conventions[id]);
  }

  // Same as GET above, but using a magic link
  private async getMagicLink({
    conventionId,
  }: FetchConventionRequestedPayload): Promise<ConventionReadDto> {
    this.simulatedLatency && (await sleep(this.simulatedLatency));
    return this.inferConventionReadDto(this._conventions[conventionId]);
  }

  public updateConvention$(
    _conventionDto: ConventionDto,
    _jwt: string,
  ): Observable<void> {
    this.updateConventionCallCount++;
    return this.updateConventionResult$;
  }

  public updateConventionStatus$(
    _params: UpdateConventionStatusRequestDto,
    _conventionId: ConventionId,
    _jwt: string,
  ): Observable<void> {
    return this.conventionModificationResult$;
  }

  public signConvention$(_jwt: string): Observable<void> {
    return this.conventionSignedResult$;
  }

  public async generateMagicLink(
    _: BackOfficeJwt,
    _convention: ConventionId,
    role: Role,
  ): Promise<string> {
    return `magic/link/with/role/${role}`;
  }

  public async renewMagicLink(
    _expiredJwt: string,
    _originalUrl: string,
  ): Promise<void> {
    // This is supposed to ask the backend to send a new email to the owner of the expired magic link.
    // Since this operation makes no sense for local development, the implementation here is left empty.
    this.simulatedLatency && (await sleep(this.simulatedLatency));
    throw new Error("500 Not Implemented In InMemory Gateway");
  }

  public async shareConventionLinkByEmail(
    _shareLinkByEmailDTO: ShareLinkByEmailDto,
  ): Promise<boolean> {
    return true;
  }

  public getConventionStatusDashboardUrl$(_jwt: string) {
    return this.conventionDashboardUrl$;
  }

  private inferConventionReadDto(convention: ConventionDto): ConventionReadDto {
    return {
      ...convention,
      agencyName: this._agencies[convention.agencyId]?.name ?? "agency-name",
      agencyDepartment: "75",
    };
  }

  // For testing purpose
  public convention$ = new Subject<ConventionReadDto | undefined>();
  public conventionSignedResult$ = new Subject<void>();
  public conventionModificationResult$ = new Subject<void>();
  public addConventionResult$ = new Subject<void>();
  public updateConventionResult$ = new Subject<void>();
  public conventionDashboardUrl$ = new Subject<AbsoluteUrl>();

  public addConventionCallCount = 0;
  public updateConventionCallCount = 0;

  private _conventions: { [id: string]: ConventionDto } = {
    [CONVENTION_DRAFT_TEST.id]: CONVENTION_DRAFT_TEST,
    [CONVENTION_VALIDATED_TEST.id]: CONVENTION_VALIDATED_TEST,
  };
  private _agencies: { [id: string]: AgencyOption } = {};
}
