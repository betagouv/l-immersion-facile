import { AxiosResponse } from "axios";
import secondsToMilliseconds from "date-fns/secondsToMilliseconds";
import { AbsoluteUrl } from "shared";
import {
  PoleEmploiConvention,
  PoleEmploiGateway,
} from "../../../../domain/convention/ports/PoleEmploiGateway";
import { AccessTokenGateway } from "../../../../domain/core/ports/AccessTokenGateway";
import { RateLimiter } from "../../../../domain/core/ports/RateLimiter";
import {
  RetryableError,
  RetryStrategy,
} from "../../../../domain/core/ports/RetryStrategy";
import {
  createAxiosInstance,
  isRetryableError,
  logAxiosError,
} from "../../../../utils/axiosUtils";
import { createLogger } from "../../../../utils/logger";
import { notifyAndThrowErrorDiscord } from "../../../../utils/notifyDiscord";

const logger = createLogger(__filename);

export class HttpPoleEmploiGateway implements PoleEmploiGateway {
  private peConventionBroadcastUrl: AbsoluteUrl;

  constructor(
    readonly peApiUrl: AbsoluteUrl,
    private readonly accessTokenGateway: AccessTokenGateway,
    private readonly poleEmploiClientId: string,
    private readonly rateLimiter: RateLimiter,
    private readonly retryStrategy: RetryStrategy,
    private readonly version: number,
  ) {
    this.peConventionBroadcastUrl = `${peApiUrl}/partenaire/immersion-pro/v${version}/demandes-immersion`;
  }

  public async notifyOnConventionUpdated(
    poleEmploiConvention: PoleEmploiConvention,
  ): Promise<void> {
    const response = await this.postPoleEmploiConvention(poleEmploiConvention);

    if (![200, 201].includes(response.status)) {
      notifyAndThrowErrorDiscord(
        new Error(
          `Could not notify Pole-Emploi : ${response.status} ${response.statusText}`,
        ),
      );
    }
  }

  private async postPoleEmploiConvention(
    poleEmploiConvention: PoleEmploiConvention,
  ): Promise<AxiosResponse<void>> {
    return this.retryStrategy.apply(async () => {
      try {
        const axios = createAxiosInstance(logger);
        logger.info({ poleEmploiConvention }, "Sending convention to PE");
        const response = await this.rateLimiter.whenReady(async () => {
          const accessToken = await this.accessTokenGateway.getAccessToken(
            `echangespmsmp api_immersion-prov1`,
          );

          const peResponse = await axios.post(
            this.peConventionBroadcastUrl,
            poleEmploiConvention,
            {
              headers: {
                Authorization: `Bearer ${accessToken.access_token}`,
              },
              timeout: secondsToMilliseconds(10),
            },
          );
          logger.info(
            {
              conventionId: poleEmploiConvention.originalId,
              httpStatus: peResponse.status,
            },
            "Response status from PE",
          );
          return peResponse;
        });
        return response;
      } catch (error: any) {
        logger.error(
          {
            conventionId: poleEmploiConvention.originalId,
            axiosErrorBody: error?.response?.data,
            httpStatus: error?.response?.status,
            error,
          },
          "Error from PE",
        );
        if (isRetryableError(logger, error)) throw new RetryableError(error);
        logAxiosError(logger, error);
        throw error;
      }
    });
  }
}

// https://staging.immersion-facile.beta.gouv.fr/api/to/_gf8jq7G6fP1YbpZFu9jrCazPHCEZNYkhYIk
//
// https://staging.immersion-facile.beta.gouv.fr/api/to/M1KJBhJt9YloMbrQfQ1144MMOE8zNMtjJ0SH
//
// https://staging.immersion-facile.beta.gouv.fr/pilotage-convention?jwt=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJzaW9uIjoxLCJhcHBsaWNhdGlvbklkIjoiNzg3NjJlMTQtN2Y2MC00MWFlLThhYTctYjgxNWZlMGFiNGE4Iiwicm9sZSI6InZhbGlkYXRvciIsImlhdCI6MTY4MzcyMzQ4NSwiZXhwIjoxNjg2NDAxODg1LCJlbWFpbEhhc2giOiJlYmEwNTJiYjk0YzA4MmYwNjQ0MDA1NzEzZjMxYWNiMSJ9.xvsq0UXKgPkyEuvsEhATkkY0VcO_cnplMtxSX9lkFXCQGwS9qP-yVKQm0jrstQBVOKeLILL5XTNcZFwSBRsXLA
