import { AbsoluteUrl, GetDashboardParams, getDashboardParams } from "shared";
import { ForbiddenError } from "../../../adapters/primary/helpers/httpErrors";
import { TimeGateway } from "../../core/ports/TimeGateway";
import { UseCase } from "../../core/UseCase";
import { DashboardGateway } from "../port/DashboardGateway";

export class GetDashboardUrl extends UseCase<GetDashboardParams, AbsoluteUrl> {
  protected inputSchema = getDashboardParams;

  readonly #dashboardGateway: DashboardGateway;

  readonly #timeGateway: TimeGateway;

  constructor(dashboardGateway: DashboardGateway, timeGateway: TimeGateway) {
    super();

    this.#dashboardGateway = dashboardGateway;
    this.#timeGateway = timeGateway;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async _execute(params: GetDashboardParams): Promise<AbsoluteUrl> {
    if (params.name === "agency")
      return this.#dashboardGateway.getAgencyUserUrl(
        [params.agencyId],
        this.#timeGateway.now(),
      );
    if (params.name === "conventionStatus")
      return this.#dashboardGateway.getConventionStatusUrl(
        params.conventionId,
        this.#timeGateway.now(),
      );
    if (params.name === "establishmentRepresentativeConventions")
      throw new ForbiddenError(
        "establishmentRepresentativeConventions is not available for GetDashboardUrl",
      );
    return this.#dashboardGateway.getDashboardUrl(
      params.name,
      this.#timeGateway.now(),
    );
  }
}
