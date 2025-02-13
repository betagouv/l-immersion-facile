import {
  ConventionDomainPayload,
  ConventionDto,
  ConventionStatus,
  ForbiddenError,
  InclusionConnectDomainJwtPayload,
  NotFoundError,
  Role,
  SignatoryRole,
  UserWithRights,
  WithConventionId,
  WithConventionIdLegacy,
  allSignatoryRoles,
  signConventionDtoWithRole,
  withConventionIdSchema,
} from "shared";
import { TransactionalUseCase } from "../../core/UseCase";
import { DomainTopic } from "../../core/events/events";
import { CreateNewEvent } from "../../core/events/ports/EventBus";
import { TimeGateway } from "../../core/time-gateway/ports/TimeGateway";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../core/unit-of-work/ports/UnitOfWorkPerformer";
import { getUserWithRights } from "../../inclusion-connected-users/helpers/userRights.helper";
import { throwIfTransitionNotAllowed } from "../entities/Convention";

const domainTopicByTargetStatusMap: Partial<
  Record<ConventionStatus, DomainTopic>
> = {
  PARTIALLY_SIGNED: "ConventionPartiallySigned",
  IN_REVIEW: "ConventionFullySigned",
};

const isAllowedToSign = (role: Role): role is SignatoryRole =>
  allSignatoryRoles.includes(role as SignatoryRole);

export class SignConvention extends TransactionalUseCase<
  WithConventionId,
  WithConventionIdLegacy,
  ConventionDomainPayload | InclusionConnectDomainJwtPayload
> {
  protected inputSchema = withConventionIdSchema;

  readonly #createNewEvent: CreateNewEvent;

  readonly #timeGateway: TimeGateway;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    createNewEvent: CreateNewEvent,
    timeGateway: TimeGateway,
  ) {
    super(uowPerformer);
    this.#createNewEvent = createNewEvent;
    this.#timeGateway = timeGateway;
  }

  public async _execute(
    { conventionId }: WithConventionId,
    uow: UnitOfWork,
    jwtPayload: ConventionDomainPayload | InclusionConnectDomainJwtPayload,
  ): Promise<WithConventionIdLegacy> {
    const initialConventionRead =
      await uow.conventionQueries.getConventionById(conventionId);
    if (!initialConventionRead) throw new NotFoundError(conventionId);

    const { role, userWithRights } = await this.#getRoleAndIcUser(
      jwtPayload,
      uow,
      initialConventionRead,
    );

    if (!isAllowedToSign(role))
      throw new ForbiddenError(
        "Only Beneficiary, his current employer, his legal representative or the establishment representative are allowed to sign convention",
      );

    const signedConvention = signConventionDtoWithRole(
      initialConventionRead,
      role,
      this.#timeGateway.now().toISOString(),
    );
    throwIfTransitionNotAllowed({
      roles: [role],
      targetStatus: signedConvention.status,
      conventionRead: initialConventionRead,
    });

    const signedId = await uow.conventionRepository.update(signedConvention);
    if (!signedId) throw new NotFoundError(signedId);

    const domainTopic = domainTopicByTargetStatusMap[signedConvention.status];
    if (domainTopic) {
      const event = this.#createNewEvent({
        topic: domainTopic,
        payload: {
          convention: signedConvention,
          triggeredBy: userWithRights
            ? { kind: "inclusion-connected", userId: userWithRights.id }
            : { kind: "convention-magic-link", role: role },
        },
      });
      await uow.outboxRepository.save(event);
    }

    return { id: signedId };
  }

  async #getRoleAndIcUser(
    jwtPayload: ConventionDomainPayload | InclusionConnectDomainJwtPayload,
    uow: UnitOfWork,
    initialConvention: ConventionDto,
  ): Promise<{ role: Role; userWithRights: UserWithRights | undefined }> {
    if ("role" in jwtPayload)
      return { role: jwtPayload.role, userWithRights: undefined };

    const userWithRights = await getUserWithRights(uow, jwtPayload.userId);

    if (
      userWithRights.email !==
      initialConvention.signatories.establishmentRepresentative.email
    )
      throw new ForbiddenError(
        `User '${userWithRights.id}' is not the establishment representative for convention '${initialConvention.id}'`,
      );
    return {
      role: initialConvention.signatories.establishmentRepresentative.role,
      userWithRights,
    };
  }
}
