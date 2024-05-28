import { filter } from "ramda";
import {
  ApiConsumer,
  ConventionReadDto,
  WithConventionDto,
  isApiConsumerAllowed,
  pipeWithValue,
  withConventionSchema,
} from "shared";
import { NotFoundError } from "../../../../config/helpers/httpErrors";
import { createLogger } from "../../../../utils/logger";
import { isConventionInScope } from "../../../convention/entities/Convention";
import { TransactionalUseCase } from "../../UseCase";
import { TimeGateway } from "../../time-gateway/ports/TimeGateway";
import { UnitOfWork } from "../../unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../unit-of-work/ports/UnitOfWorkPerformer";
import { getReferedAgency } from "../helpers/agency";
import { SubscribersGateway } from "../ports/SubscribersGateway";

const logger = createLogger(__filename);

const isConsumerSubscribedToConventionUpdated = (apiConsumer: ApiConsumer) => {
  const conventionUpdatedCallbackParams =
    apiConsumer.rights.convention.subscriptions.find(
      (sub) => sub.subscribedEvent === "convention.updated",
    );
  return !!conventionUpdatedCallbackParams;
};

export class BroadcastToPartnersOnConventionUpdates extends TransactionalUseCase<WithConventionDto> {
  protected inputSchema = withConventionSchema;

  readonly #subscribersGateway: SubscribersGateway;

  readonly #timeGateway: TimeGateway;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    subscribersGateway: SubscribersGateway,
    timeGateway: TimeGateway,
  ) {
    super(uowPerformer);
    this.#subscribersGateway = subscribersGateway;
    this.#timeGateway = timeGateway;
  }

  protected async _execute({ convention }: WithConventionDto, uow: UnitOfWork) {
    const agency = await uow.agencyRepository.getById(convention.agencyId);
    if (!agency) {
      throw new NotFoundError(
        `Agency with Id ${convention.agencyId} not found`,
      );
    }
    const {
      acquisitionCampaign: _,
      acquisitionKeyword: __,
      ...conventionWithoutAcquisitionParams
    } = convention;

    const conventionRead: ConventionReadDto = {
      ...conventionWithoutAcquisitionParams,
      agencyName: agency.name,
      agencyDepartment: agency.address.departmentCode,
      agencyKind: agency.kind,
      agencySiret: agency.agencySiret,
      agencyRefersTo: agency.refersToAgencyId
        ? await getReferedAgency(uow, agency.refersToAgencyId)
        : undefined,
      agencyCounsellorEmails: agency.counsellorEmails,
      agencyValidatorEmails: agency.validatorEmails,
    };

    const apiConsumers = pipeWithValue(
      await uow.apiConsumerRepository.getAll(),
      filter<ApiConsumer>(
        (apiConsumer) =>
          isApiConsumerAllowed({
            apiConsumer,
            rightName: "convention",
            consumerKind: "SUBSCRIPTION",
          }) &&
          isConventionInScope(conventionRead, apiConsumer) &&
          isConsumerSubscribedToConventionUpdated(apiConsumer),
      ),
    );

    await Promise.all(
      apiConsumers.map(this.#notifySubscriber(uow, conventionRead)),
    );
  }

  #notifySubscriber(uow: UnitOfWork, conventionRead: ConventionReadDto) {
    return async (apiConsumer: ApiConsumer) => {
      const conventionUpdatedCallbackParams =
        apiConsumer.rights.convention.subscriptions.find(
          (sub) => sub.subscribedEvent === "convention.updated",
        );

      if (!conventionUpdatedCallbackParams) {
        throw new Error(
          `No callback params found for convention.updated : apiConsumer : ${apiConsumer.id} | convention : ${conventionRead.id}`,
        );
      }

      const response = await this.#subscribersGateway.notify(
        {
          payload: {
            convention: conventionRead,
          },
          subscribedEvent: "convention.updated",
        },
        {
          callbackUrl: conventionUpdatedCallbackParams.callbackUrl,
          callbackHeaders: conventionUpdatedCallbackParams.callbackHeaders,
        },
      );

      if (response.title === "Partner subscription errored") {
        logger.error(response);

        await uow.errorRepository.save({
          consumerId: apiConsumer.id,
          consumerName: apiConsumer.name,
          handledByAgency: false,
          feedback: response.feedback,
          occurredAt: this.#timeGateway.now(),
          params: {
            callbackUrl: response.callbackUrl,
            conventionId: response.conventionId,
            conventionStatus: response.conventionStatus,
            httpStatus: response.status,
          },
          serviceName: "BroadcastToPartnersOnConventionUpdates",
        });

        return;
      }

      logger.info(response);
      return;
    };
  }
}
