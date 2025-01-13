import {
  AbsoluteUrl,
  authFailed,
  frontRoutes,
  queryParamsAsString,
} from "shared";
import { z } from "zod";
import { TransactionalUseCase } from "../../../UseCase";
import { UnitOfWork } from "../../../unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../../unit-of-work/ports/UnitOfWorkPerformer";
import { AccessTokenDto } from "../dto/AccessToken.dto";
import {
  ConventionFtConnectFields,
  FtUserAndAdvisor,
  toPartialConventionDtoWithPeIdentity,
} from "../dto/FtConnect.dto";
import { chooseValidAdvisor } from "../entities/ConventionFranceTravailAdvisorEntity";
import { FtConnectGateway } from "../port/FtConnectGateway";

export class LinkPoleEmploiAdvisorAndRedirectToConvention extends TransactionalUseCase<
  string,
  AbsoluteUrl
> {
  protected inputSchema = z.string();

  readonly #peConnectGateway: FtConnectGateway;

  readonly #baseUrlForRedirect: AbsoluteUrl;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    peConnectGateway: FtConnectGateway,
    baseUrlForRedirect: AbsoluteUrl,
  ) {
    super(uowPerformer);

    this.#baseUrlForRedirect = baseUrlForRedirect;
    this.#peConnectGateway = peConnectGateway;
  }

  protected async _execute(
    authorizationCode: string,
    uow: UnitOfWork,
  ): Promise<AbsoluteUrl> {
    const accessToken =
      await this.#peConnectGateway.getAccessToken(authorizationCode);
    return accessToken
      ? this.#onAccessToken(accessToken, uow)
      : this.#makeRedirectUrl({
          fedIdProvider: "peConnect",
          fedId: authFailed,
        });
  }

  #makeRedirectUrl(fields: Partial<ConventionFtConnectFields>): AbsoluteUrl {
    return `${this.#baseUrlForRedirect}/${
      frontRoutes.conventionImmersionRoute
    }?${queryParamsAsString<Partial<ConventionFtConnectFields>>(fields)}`;
  }

  async #onAccessToken(accessToken: AccessTokenDto, uow: UnitOfWork) {
    const userAndAdvisors =
      await this.#peConnectGateway.getUserAndAdvisors(accessToken);
    if (!userAndAdvisors)
      return this.#makeRedirectUrl({
        fedIdProvider: "peConnect",
        fedId: authFailed,
      });
    const { user, advisors } = userAndAdvisors;

    const peUserAndAdvisor: FtUserAndAdvisor = {
      user,
      advisor: user.isJobseeker
        ? chooseValidAdvisor(user, advisors)
        : undefined,
    };

    if (peUserAndAdvisor.user.isJobseeker)
      await uow.conventionPoleEmploiAdvisorRepository.openSlotForNextConvention(
        peUserAndAdvisor,
      );

    return this.#makeRedirectUrl(toPartialConventionDtoWithPeIdentity(user));
  }
}
