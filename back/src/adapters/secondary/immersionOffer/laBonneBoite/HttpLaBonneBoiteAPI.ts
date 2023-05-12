import { AxiosResponse } from "axios";
import Bottleneck from "bottleneck";
import { secondsToMilliseconds } from "date-fns";
import { AbsoluteUrl } from "shared";
import { AccessTokenGateway } from "../../../../domain/core/ports/AccessTokenGateway";
import {
  LaBonneBoiteAPI,
  LaBonneBoiteRequestParams,
} from "../../../../domain/immersionOffer/ports/LaBonneBoiteAPI";
import {
  LaBonneBoiteCompanyProps,
  LaBonneBoiteCompanyVO,
} from "../../../../domain/immersionOffer/valueObjects/LaBonneBoiteCompanyVO";
import { createAxiosInstance } from "../../../../utils/axiosUtils";
import { createLogger } from "../../../../utils/logger";

const logger = createLogger(__filename);

type HttpGetLaBonneBoiteCompanyParams = {
  commune_id?: string; // INSEE of municipality near which we are looking
  departments?: number[]; // List of departments
  contract?: "dpae" | "alternance";
  latitude?: number; // required if commune_id and deparments are undefined
  longitude?: number; // required if commune_id and deparments are undefined
  distance?: number; // in KM, used only if (latitude, longitude) is given
  rome_codes: string;
  naf_codes?: string; // list of naf codes separeted with a comma, eg : "9499Z,5610C"
  headcount?: "all" | "big" | "small"; // Size of company (big if more than 50 employees). Default to "all"
  page: number; // Page index
  page_size: number; // Nb of results per page
  sort?: "score" | "distance";
};

type HttpGetLaBonneBoiteCompanyResponse = {
  companies: LaBonneBoiteCompanyProps[];
};

const MAX_PAGE_SIZE = 100;
const MAX_DISTANCE_IN_KM = 100;

const lbbMaxQueryPerSeconds = 1;

export class HttpLaBonneBoiteAPI implements LaBonneBoiteAPI {
  private urlGetCompany: AbsoluteUrl;

  constructor(
    readonly peApiUrl: AbsoluteUrl,
    private readonly accessTokenGateway: AccessTokenGateway,
    private readonly poleEmploiClientId: string,
  ) {
    this.urlGetCompany = `${peApiUrl}/partenaire/labonneboite/v1/company/`;
  }

  public async searchCompanies(
    searchParams: LaBonneBoiteRequestParams,
  ): Promise<LaBonneBoiteCompanyVO[]> {
    const requestParams: HttpGetLaBonneBoiteCompanyParams = {
      distance: MAX_DISTANCE_IN_KM,
      longitude: searchParams.lon,
      latitude: searchParams.lat,
      page: 1,
      page_size: MAX_PAGE_SIZE,
      rome_codes: searchParams.rome,
      sort: "distance",
    };
    const response = await this.getCompanyResponse(requestParams);

    return response.data.companies.map(
      (props: LaBonneBoiteCompanyProps) => new LaBonneBoiteCompanyVO(props),
    );
  }
  private async getCompanyResponse(
    params: HttpGetLaBonneBoiteCompanyParams,
  ): Promise<AxiosResponse<HttpGetLaBonneBoiteCompanyResponse>> {
    const axios = createAxiosInstance(logger);

    return this.limiter.schedule(async () => {
      const accessToken = await this.accessTokenGateway.getAccessToken(
        `application_${this.poleEmploiClientId} api_labonneboitev1`,
      );

      return axios.get(this.urlGetCompany, {
        headers: {
          Authorization: createAuthorization(accessToken.access_token),
        },
        timeout: secondsToMilliseconds(10),
        params,
      });
    });
  }

  private limiter = new Bottleneck({
    reservoir: lbbMaxQueryPerSeconds,
    reservoirIncreaseInterval: 1000, // number of ms
    reservoirRefreshAmount: lbbMaxQueryPerSeconds,
  });
}

const createAuthorization = (accessToken: string) => `Bearer ${accessToken}`;
