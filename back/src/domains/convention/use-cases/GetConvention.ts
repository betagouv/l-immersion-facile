import {
  AgencyWithUsersRights,
  ConventionReadDto,
  ConventionRelatedJwtPayload,
  EmailHash,
  Role,
  UserId,
  WithConventionId,
  errors,
  getIcUserRoleForAccessingConvention,
  withConventionIdSchema,
} from "shared";
import {
  isHashMatchConventionEmails,
  isHashMatchNotNotifiedCounsellorOrValidator,
  isHashMatchPeAdvisorEmail,
} from "../../../utils/emailHash";
import { TransactionalUseCase } from "../../core/UseCase";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { getUserWithRights } from "../../inclusion-connected-users/helpers/userRights.helper";

export class GetConvention extends TransactionalUseCase<
  WithConventionId,
  ConventionReadDto,
  ConventionRelatedJwtPayload
> {
  protected inputSchema = withConventionIdSchema;

  protected async _execute(
    { conventionId }: WithConventionId,
    uow: UnitOfWork,
    authPayload?: ConventionRelatedJwtPayload,
  ): Promise<ConventionReadDto> {
    if (!authPayload) throw errors.user.noJwtProvided();

    const convention =
      await uow.conventionQueries.getConventionById(conventionId);
    if (!convention) throw errors.convention.notFound({ conventionId });

    return "emailHash" in authPayload
      ? this.#onConventionDomainPayload({
          emailHash: authPayload.emailHash,
          role: authPayload.role,
          uow,
          convention,
        })
      : this.#onInclusionConnectPayload({
          userId: authPayload.userId,
          uow,
          convention,
        });
  }

  async #onConventionDomainPayload({
    role,
    emailHash,
    convention,
    uow,
  }: {
    role: Role;
    emailHash: EmailHash;
    convention: ConventionReadDto;
    uow: UnitOfWork;
  }): Promise<ConventionReadDto> {
    const agency = await uow.agencyRepository.getById(convention.agencyId);
    if (!agency)
      throw errors.agency.notFound({ agencyId: convention.agencyId });

    const isMatchingEmailHash = await this.#isEmailHashMatch({
      emailHash,
      role,
      convention,
      agency,
      uow,
    });
    if (!isMatchingEmailHash) {
      throw errors.convention.forbiddenMissingRights({
        conventionId: convention.id,
      });
    }

    return convention;
  }

  async #onInclusionConnectPayload({
    userId,
    convention,
    uow,
  }: {
    userId: UserId;
    convention: ConventionReadDto;
    uow: UnitOfWork;
  }): Promise<ConventionReadDto> {
    const user = await getUserWithRights(uow, userId);

    const roles = getIcUserRoleForAccessingConvention(convention, user);
    if (roles.length) return convention;

    const establishment =
      await uow.establishmentAggregateRepository.getEstablishmentAggregateBySiret(
        convention.siret,
      );

    const hasSomeEstablishmentRights = establishment?.userRights.some(
      (userRight) => userRight.userId === user.id,
    );

    if (hasSomeEstablishmentRights) return convention;

    throw errors.convention.forbiddenMissingRights({
      conventionId: convention.id,
      userId: user.id,
    });
  }

  async #isEmailHashMatch({
    emailHash,
    role,
    convention,
    agency,
    uow,
  }: {
    emailHash: EmailHash;
    role: Role;
    convention: ConventionReadDto;
    agency: AgencyWithUsersRights;
    uow: UnitOfWork;
  }): Promise<boolean> {
    const isEmailMatchingPeAdvisor = isHashMatchPeAdvisorEmail({
      convention,
      emailHash,
    });
    if (isEmailMatchingPeAdvisor) return true;

    const isMatchingConventionEmails = await isHashMatchConventionEmails({
      uow,
      role,
      emailHash,
      convention,
      agency,
    });
    if (isMatchingConventionEmails) return true;

    return await isHashMatchNotNotifiedCounsellorOrValidator({
      uow,
      emailHash,
      agency,
      role,
    });
  }
}
