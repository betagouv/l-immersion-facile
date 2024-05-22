import {
  AgencyId,
  ConventionDto,
  ConventionDtoBuilder,
  ConventionRelatedJwtPayload,
  ConventionStatus,
  Email,
  Role,
  UpdateConventionStatusRequestDto,
  UserId,
  WithConventionIdLegacy,
  backOfficeEmail,
  getRequesterRole,
  reviewedConventionStatuses,
  stringToMd5,
  updateConventionStatusRequestSchema,
  validatedConventionStatuses,
} from "shared";
import {
  ForbiddenError,
  NotFoundError,
} from "../../../config/helpers/httpErrors";
import { agencyMissingMessage } from "../../agency/ports/AgencyRepository";
import { TransactionalUseCase } from "../../core/UseCase";
import { ConventionRequiresModificationPayload } from "../../core/events/eventPayload.dto";
import { DomainTopic } from "../../core/events/events";
import { CreateNewEvent } from "../../core/events/ports/EventBus";
import { TimeGateway } from "../../core/time-gateway/ports/TimeGateway";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../core/unit-of-work/ports/UnitOfWorkPerformer";
import {
  conventionMissingMessage,
  throwIfTransitionNotAllowed,
} from "../entities/Convention";

const domainTopicByTargetStatusMap: Record<
  ConventionStatus,
  DomainTopic | null
> = {
  READY_TO_SIGN: null,
  PARTIALLY_SIGNED: "ConventionPartiallySigned",
  IN_REVIEW: "ConventionFullySigned",
  ACCEPTED_BY_COUNSELLOR: "ConventionAcceptedByCounsellor",
  ACCEPTED_BY_VALIDATOR: "ConventionAcceptedByValidator",
  REJECTED: "ConventionRejected",
  CANCELLED: "ConventionCancelled",
  DRAFT: "ConventionRequiresModification",
  DEPRECATED: "ConventionDeprecated",
};

type UpdateConventionStatusSupportedJwtPayload = ConventionRelatedJwtPayload;

export class UpdateConventionStatus extends TransactionalUseCase<
  UpdateConventionStatusRequestDto,
  WithConventionIdLegacy,
  UpdateConventionStatusSupportedJwtPayload
> {
  protected inputSchema = updateConventionStatusRequestSchema;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    private readonly createNewEvent: CreateNewEvent,
    private readonly timeGateway: TimeGateway,
  ) {
    super(uowPerformer);
  }

  public async _execute(
    params: UpdateConventionStatusRequestDto,
    uow: UnitOfWork,
    payload: UpdateConventionStatusSupportedJwtPayload,
  ): Promise<WithConventionIdLegacy> {
    const conventionRead = await uow.conventionQueries.getConventionById(
      params.conventionId,
    );
    if (!conventionRead)
      throw new NotFoundError(conventionMissingMessage(params.conventionId));

    const agency = await uow.agencyRepository.getById(conventionRead.agencyId);

    if (!agency)
      throw new NotFoundError(agencyMissingMessage(conventionRead.agencyId));

    const roles =
      "role" in payload
        ? [payload.role]
        : await this.#rolesFromUserId(uow, payload.userId, conventionRead);

    throwIfTransitionNotAllowed({
      roles,
      targetStatus: params.status,
      conventionRead,
    });

    const conventionUpdatedAt = this.timeGateway.now().toISOString();

    const statusJustification =
      params.status === "CANCELLED" ||
      params.status === "REJECTED" ||
      params.status === "DRAFT" ||
      params.status === "DEPRECATED"
        ? params.statusJustification
        : undefined;

    const conventionBuilder = new ConventionDtoBuilder(conventionRead)
      .withStatus(params.status)
      .withDateValidation(
        validatedConventionStatuses.includes(params.status)
          ? conventionUpdatedAt
          : undefined,
      )
      .withDateApproval(
        reviewedConventionStatuses.includes(params.status)
          ? conventionUpdatedAt
          : undefined,
      )
      .withStatusJustification(statusJustification);

    const hasCounsellor =
      params.status === "ACCEPTED_BY_COUNSELLOR" &&
      (params.lastname || params.firstname);
    if (hasCounsellor) {
      conventionBuilder.withCounsellor({
        firstname: params.firstname,
        lastname: params.lastname,
      });
    }

    const hasValidator =
      params.status === "ACCEPTED_BY_VALIDATOR" &&
      (params.lastname || params.firstname);
    if (hasValidator)
      conventionBuilder.withValidator({
        firstname: params.firstname,
        lastname: params.lastname,
      });

    if (params.status === "DRAFT") conventionBuilder.notSigned();

    const updatedConvention: ConventionDto = conventionBuilder.build();

    const updatedId = await uow.conventionRepository.update(updatedConvention);
    if (!updatedId) throw new NotFoundError(updatedId);

    const domainTopic = domainTopicByTargetStatusMap[params.status];
    if (domainTopic)
      await uow.outboxRepository.save({
        ...(params.status === "DRAFT"
          ? this.#createRequireModificationEvent(
              params.modifierRole === "validator" ||
                params.modifierRole === "counsellor"
                ? {
                    requesterRole: getRequesterRole(roles),
                    convention: updatedConvention,
                    justification: params.statusJustification,
                    modifierRole: params.modifierRole,
                    agencyActorEmail: await this.#getAgencyActorEmail(
                      uow,
                      payload,
                      conventionRead,
                    ),
                  }
                : {
                    requesterRole: getRequesterRole(roles),
                    convention: updatedConvention,
                    justification: params.statusJustification,
                    modifierRole: params.modifierRole,
                  },
            )
          : this.#createEvent(updatedConvention, domainTopic)),
        occurredAt: conventionUpdatedAt,
      });

    return { id: updatedId };
  }

  async #rolesFromUserId(
    uow: UnitOfWork,
    userId: UserId,
    convention: ConventionDto,
  ): Promise<Role[]> {
    const user = await uow.inclusionConnectedUserRepository.getById(userId);
    if (!user)
      throw new NotFoundError(
        `User '${userId}' not found on inclusion connected user repository.`,
      );

    if (user.isBackofficeAdmin) return ["backOffice"];

    if (user.email === convention.signatories.establishmentRepresentative.email)
      return ["establishment-representative"];

    const userAgencyRight = user.agencyRights.find(
      (agencyRight) => agencyRight.agency.id === convention.agencyId,
    );
    if (!userAgencyRight)
      throw new ForbiddenError(
        `User '${userId}' has no role on agency '${convention.agencyId}'.`,
      );

    return userAgencyRight.roles;
  }

  async #agencyEmailFromUserIdAndAgencyId(
    uow: UnitOfWork,
    userId: UserId,
    agencyId: AgencyId,
  ): Promise<string> {
    const user = await uow.inclusionConnectedUserRepository.getById(userId);
    if (!user)
      throw new NotFoundError(
        `User '${userId}' not found on inclusion connected user repository.`,
      );
    const userAgencyRights = user.agencyRights.find(
      (agencyRight) => agencyRight.agency.id === agencyId,
    );
    if (!userAgencyRights)
      throw new ForbiddenError(
        `User '${userId}' has no role on agency '${agencyId}'.`,
      );
    return user.email;
  }

  #createEvent(updatedConventionDto: ConventionDto, domainTopic: DomainTopic) {
    return this.createNewEvent({
      topic: domainTopic,
      payload: { convention: updatedConventionDto },
    });
  }

  #createRequireModificationEvent(
    payload: ConventionRequiresModificationPayload,
  ) {
    return this.createNewEvent({
      topic: "ConventionRequiresModification",
      payload,
    });
  }

  #getAgencyActorEmail = async (
    uow: UnitOfWork,
    payload: UpdateConventionStatusSupportedJwtPayload,
    originalConvention: ConventionDto,
  ): Promise<string> => {
    const getEmailFromEmailHash = async (
      agencyId: AgencyId,
      emailHash: string,
    ): Promise<Email> => {
      const agencies = await uow.agencyRepository.getByIds([agencyId]);
      const agency = agencies.at(0);
      if (!agency)
        throw new NotFoundError(`No agency found with id ${agencyId}`);

      const agencyEmails = [
        ...agency.validatorEmails,
        ...agency.counsellorEmails,
      ];

      const email = agencyEmails.find(
        (agencyEmail) => stringToMd5(agencyEmail) === emailHash,
      );

      if (!email)
        throw new NotFoundError(
          `Mail not found for agency with id: ${agencyId} on agency repository.`,
        );

      return email;
    };

    if (!("role" in payload)) {
      const agencyIcUserEmail = await this.#agencyEmailFromUserIdAndAgencyId(
        uow,
        payload.userId,
        originalConvention.agencyId,
      );
      return agencyIcUserEmail;
    }

    return "emailHash" in payload
      ? getEmailFromEmailHash(originalConvention.agencyId, payload.emailHash)
      : backOfficeEmail;
  };
}
