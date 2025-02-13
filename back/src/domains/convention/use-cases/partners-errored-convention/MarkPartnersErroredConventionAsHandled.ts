import {
  InclusionConnectDomainJwtPayload,
  MarkPartnersErroredConventionAsHandledRequest,
  errors,
  markPartnersErroredConventionAsHandledRequestSchema,
} from "shared";
import { TransactionalUseCase } from "../../../core/UseCase";
import { makeProvider } from "../../../core/authentication/inclusion-connect/port/OAuthGateway";
import { CreateNewEvent } from "../../../core/events/ports/EventBus";
import { TimeGateway } from "../../../core/time-gateway/ports/TimeGateway";
import { UnitOfWork } from "../../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../../core/unit-of-work/ports/UnitOfWorkPerformer";
import { getUserWithRights } from "../../../inclusion-connected-users/helpers/userRights.helper";

export class MarkPartnersErroredConventionAsHandled extends TransactionalUseCase<
  MarkPartnersErroredConventionAsHandledRequest,
  void,
  InclusionConnectDomainJwtPayload
> {
  protected inputSchema = markPartnersErroredConventionAsHandledRequestSchema;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    private readonly createNewEvent: CreateNewEvent,
    private readonly timeGateway: TimeGateway,
  ) {
    super(uowPerformer);
  }

  public async _execute(
    params: MarkPartnersErroredConventionAsHandledRequest,
    uow: UnitOfWork,
    payload: InclusionConnectDomainJwtPayload,
  ): Promise<void> {
    if (!payload) {
      throw errors.user.unauthorized();
    }
    const { userId } = payload;
    const provider = await makeProvider(uow);
    const conventionToMarkAsHandled = await uow.conventionRepository.getById(
      params.conventionId,
    );
    if (!conventionToMarkAsHandled)
      throw errors.convention.notFound({
        conventionId: params.conventionId,
      });

    const currentUser = await uow.userRepository.getById(userId, provider);
    if (!currentUser) throw errors.user.notFound({ userId });

    const userWithRights = await getUserWithRights(uow, currentUser.id);
    const userAgencyRights = userWithRights.agencyRights.find(
      (agencyRight) =>
        agencyRight.agency.id === conventionToMarkAsHandled.agencyId,
    );
    if (!userAgencyRights)
      throw errors.user.noRightsOnAgency({
        userId,
        agencyId: conventionToMarkAsHandled.agencyId,
      });

    const conventionMarkAsHandledAt = this.timeGateway.now().toISOString();

    await uow.broadcastFeedbacksRepository.markPartnersErroredConventionAsHandled(
      params.conventionId,
    );

    await uow.outboxRepository.save(
      this.createNewEvent({
        topic: "PartnerErroredConventionMarkedAsHandled",
        payload: {
          conventionId: params.conventionId,
          userId,
          triggeredBy: {
            kind: "inclusion-connected",
            userId: currentUser.id,
          },
        },
        occurredAt: conventionMarkAsHandledAt,
      }),
    );
  }
}
