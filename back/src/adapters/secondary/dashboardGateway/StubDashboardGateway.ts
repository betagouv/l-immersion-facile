import {
  AbsoluteUrl,
  AdminDashboardName,
  AgencyId,
  ConventionId,
} from "shared";
import { DashboardGateway } from "../../../domain/dashboard/port/DashboardGateway";
import { createLogger } from "../../../utils/logger";

const logger = createLogger(__filename);

export class StubDashboardGateway implements DashboardGateway {
  getAgencyUserUrl(agencyIds: AgencyId[]): AbsoluteUrl {
    logger.warn("Dashboard gateway not implemented, getAgencyUrl method");
    return `http://stubAgencyDashboard/${agencyIds.join("_")}`;
  }

  getConventionStatusUrl(id: ConventionId): AbsoluteUrl {
    logger.warn(
      "Dashboard gateway not implemented, getConventionStatusUrl method",
    );
    return `http://stubConventionStatusDashboard/${id as string}`;
  }

  getDashboardUrl(dashboardName: AdminDashboardName): AbsoluteUrl {
    logger.warn("Dashboard gateway not implemented, getDashboardUrl method");
    return `http://stubDashboard/${dashboardName}`;
  }

  getErroredConventionsDashboardUrl(agencyIds: AgencyId[]): AbsoluteUrl {
    logger.warn("Dashboard gateway not implemented, getAgencyUrl method");
    return `http://stubErroredConventionDashboard/${agencyIds.join("_")}`;
  }
}
