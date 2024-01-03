import { keys } from "ramda";
import {
  AgencyId,
  ApiConsumerId,
  FindSimilarConventionsParams,
  FindSimilarConventionsResponseDto,
  SiretDto,
  sleep,
} from "shared";
import { LookupLocation } from "../../../domain/address/useCases/LookupLocation";
import { LookupStreetAddress } from "../../../domain/address/useCases/LookupStreetAddress";
import {
  GenerateApiConsumerJwt,
  GenerateBackOfficeJwt,
  GenerateConventionJwt,
  GenerateEditFormEstablishmentJwt,
  GenerateInclusionConnectJwt,
} from "../../../domain/auth/jwt";
import { SaveApiConsumer } from "../../../domain/auth/useCases/SaveApiConsumer";
import { BroadcastToPartnersOnConventionUpdates } from "../../../domain/broadcast/useCases/BroadcastToPartnersOnConventionUpdates";
import { DeleteSubscription } from "../../../domain/broadcast/useCases/DeleteSubscription";
import { ListActiveSubscriptions } from "../../../domain/broadcast/useCases/ListActiveSubscriptions";
import { SubscribeToWebhook } from "../../../domain/broadcast/useCases/SubscribeToWebhook";
import { AddConvention } from "../../../domain/convention/useCases/AddConvention";
import { AddAgency } from "../../../domain/convention/useCases/agencies/AddAgency";
import { ListAgenciesByFilter } from "../../../domain/convention/useCases/agencies/ListAgenciesByFilter";
import { PrivateListAgencies } from "../../../domain/convention/useCases/agencies/PrivateListAgencies";
import { RegisterAgencyToInclusionConnectUser } from "../../../domain/convention/useCases/agencies/RegisterAgencyToInclusionConnectUser";
import { UpdateAgency } from "../../../domain/convention/useCases/agencies/UpdateAgency";
import { UpdateAgencyReferingToUpdatedAgency } from "../../../domain/convention/useCases/agencies/UpdateAgencyReferingToUpdatedAgency";
import { UpdateAgencyStatus } from "../../../domain/convention/useCases/agencies/UpdateAgencyStatus";
import { BroadcastToPoleEmploiOnConventionUpdates } from "../../../domain/convention/useCases/broadcast/BroadcastToPoleEmploiOnConventionUpdates";
import { CreateAssessment } from "../../../domain/convention/useCases/CreateAssessment";
import { GetAgencyPublicInfoById } from "../../../domain/convention/useCases/GetAgencyPublicInfoById";
import { GetConvention } from "../../../domain/convention/useCases/GetConvention";
import { GetConventionForApiConsumer } from "../../../domain/convention/useCases/GetConventionForApiConsumer";
import { GetConventionsForApiConsumer } from "../../../domain/convention/useCases/GetConventionsForApiConsumer";
import { DeliverRenewedMagicLink } from "../../../domain/convention/useCases/notifications/DeliverRenewedMagicLink";
import { NotifyActorThatConventionNeedsModifications } from "../../../domain/convention/useCases/notifications/NotifyActorThatConventionNeedsModifications";
import { NotifyAgencyThatAssessmentIsCreated } from "../../../domain/convention/useCases/notifications/NotifyAgencyThatAssessmentIsCreated";
import { NotifyAllActorsOfFinalConventionValidation } from "../../../domain/convention/useCases/notifications/NotifyAllActorsOfFinalConventionValidation";
import { NotifyAllActorsThatConventionIsCancelled as NotifyAllActorsThatConventionIsCancelled } from "../../../domain/convention/useCases/notifications/NotifyAllActorsThatConventionIsCancelled";
import { NotifyAllActorsThatConventionIsDeprecated } from "../../../domain/convention/useCases/notifications/NotifyAllActorsThatConventionIsDeprecated";
import { NotifyAllActorsThatConventionIsRejected } from "../../../domain/convention/useCases/notifications/NotifyAllActorsThatConventionIsRejected";
import { NotifyConventionReminder } from "../../../domain/convention/useCases/notifications/NotifyConventionReminder";
import { NotifyIcUserAgencyRightChanged } from "../../../domain/convention/useCases/notifications/NotifyIcUserAgencyRightChanged";
import { NotifyIcUserAgencyRightRejected } from "../../../domain/convention/useCases/notifications/NotifyIcUserAgencyRightRejected";
import { NotifyLastSigneeThatConventionHasBeenSigned } from "../../../domain/convention/useCases/notifications/NotifyLastSigneeThatConventionHasBeenSigned";
import { NotifyNewConventionNeedsReview } from "../../../domain/convention/useCases/notifications/NotifyNewConventionNeedsReview";
import { NotifySignatoriesThatConventionSubmittedNeedsSignature } from "../../../domain/convention/useCases/notifications/NotifySignatoriesThatConventionSubmittedNeedsSignature";
import { NotifySignatoriesThatConventionSubmittedNeedsSignatureAfterModification } from "../../../domain/convention/useCases/notifications/NotifySignatoriesThatConventionSubmittedNeedsSignatureAfterModification";
import { NotifyToAgencyConventionSubmitted } from "../../../domain/convention/useCases/notifications/NotifyToAgencyConventionSubmitted";
import { MarkPartnersErroredConventionAsHandled } from "../../../domain/convention/useCases/partnersErroredConvention/MarkPartnersErroredConventionAsHandled";
import { RenewConvention } from "../../../domain/convention/useCases/RenewConvention";
import { RenewConventionMagicLink } from "../../../domain/convention/useCases/RenewConventionMagicLink";
import { SendEmailWhenAgencyIsActivated } from "../../../domain/convention/useCases/SendEmailWhenAgencyIsActivated";
import { SendEmailWhenAgencyIsRejected } from "../../../domain/convention/useCases/SendEmailWhenAgencyIsRejected";
import { ShareConventionLinkByEmail } from "../../../domain/convention/useCases/ShareConventionLinkByEmail";
import { SignConvention } from "../../../domain/convention/useCases/SignConvention";
import { UpdateConvention } from "../../../domain/convention/useCases/UpdateConvention";
import { UpdateConventionStatus } from "../../../domain/convention/useCases/UpdateConventionStatus";
import { makeCreateNewEvent } from "../../../domain/core/eventBus/EventBus";
import { ShortLinkId } from "../../../domain/core/ports/ShortLinkQuery";
import { TimeGateway } from "../../../domain/core/ports/TimeGateway";
import { UnitOfWorkPerformer } from "../../../domain/core/ports/UnitOfWork";
import { UuidGenerator } from "../../../domain/core/ports/UuidGenerator";
import { TransactionalUseCase, UseCase } from "../../../domain/core/UseCase";
import { DashboardGateway } from "../../../domain/dashboard/port/DashboardGateway";
import { GetDashboardUrl } from "../../../domain/dashboard/useCases/GetDashboardUrl";
import { ValidateEmail } from "../../../domain/emailValidation/useCases/ValidateEmail";
import { AdminLogin } from "../../../domain/generic/authentication/useCases/AdminLogin";
import { SetFeatureFlag } from "../../../domain/generic/featureFlag/SetFeatureFlag";
import { UploadLogo } from "../../../domain/generic/fileManagement/useCases/UploadLogo";
import { HtmlToPdf } from "../../../domain/generic/htmlToPdf/HtmlToPdf";
import { makeSaveNotificationAndRelatedEvent } from "../../../domain/generic/notifications/entities/Notification";
import { SendNotification } from "../../../domain/generic/notifications/useCases/SendNotification";
import { AuthenticateWithInclusionCode } from "../../../domain/inclusionConnect/useCases/AuthenticateWithInclusionCode";
import { GetInclusionConnectLogoutUrl } from "../../../domain/inclusionConnect/useCases/GetInclusionConnectLogoutUrl";
import { InitiateInclusionConnect } from "../../../domain/inclusionConnect/useCases/InitiateInclusionConnect";
import { GetInclusionConnectedUser } from "../../../domain/inclusionConnectedUsers/useCases/GetInclusionConnectedUser";
import { GetInclusionConnectedUsers } from "../../../domain/inclusionConnectedUsers/useCases/GetInclusionConnectedUsers";
import { RejectIcUserForAgency } from "../../../domain/inclusionConnectedUsers/useCases/RejectIcUserForAgency";
import { UpdateIcUserRoleForAgency } from "../../../domain/inclusionConnectedUsers/useCases/UpdateIcUserRoleForAgency";
import { AddFormEstablishment } from "../../../domain/offer/useCases/AddFormEstablishment";
import { AddFormEstablishmentBatch } from "../../../domain/offer/useCases/AddFormEstablismentsBatch";
import { ContactEstablishment } from "../../../domain/offer/useCases/ContactEstablishment";
import { DeleteEstablishment } from "../../../domain/offer/useCases/DeleteEstablishment";
import { AddExchangeToDiscussionAndTransferEmail } from "../../../domain/offer/useCases/discussions/AddExchangeToDiscussionAndTransferEmail";
import { EditFormEstablishment } from "../../../domain/offer/useCases/EditFormEstablishment";
import { GetOffersByGroupSlug } from "../../../domain/offer/useCases/GetGroupBySlug";
import { GetSearchResultBySiretAndRome } from "../../../domain/offer/useCases/GetSearchResultById";
import { GetSearchResultBySiretAndAppellationCode } from "../../../domain/offer/useCases/GetSearchResultBySiretAndAppellationCode";
import { InsertEstablishmentAggregateFromForm } from "../../../domain/offer/useCases/InsertEstablishmentAggregateFromFormEstablishement";
import { NotifyConfirmationEstablishmentCreated } from "../../../domain/offer/useCases/notifications/NotifyConfirmationEstablishmentCreated";
import { NotifyContactRequest } from "../../../domain/offer/useCases/notifications/NotifyContactRequest";
import { NotifyPassEmploiOnNewEstablishmentAggregateInsertedFromForm } from "../../../domain/offer/useCases/notifications/NotifyPassEmploiOnNewEstablishmentAggregateInsertedFromForm";
import { RequestEditFormEstablishment } from "../../../domain/offer/useCases/RequestEditFormEstablishment";
import { RetrieveFormEstablishmentFromAggregates } from "../../../domain/offer/useCases/RetrieveFormEstablishmentFromAggregates";
import { SearchImmersion } from "../../../domain/offer/useCases/SearchImmersion";
import { UpdateEstablishmentAggregateFromForm } from "../../../domain/offer/useCases/UpdateEstablishmentAggregateFromFormEstablishement";
import { BindConventionToFederatedIdentity } from "../../../domain/peConnect/useCases/BindConventionToFederatedIdentity";
import { LinkPoleEmploiAdvisorAndRedirectToConvention } from "../../../domain/peConnect/useCases/LinkPoleEmploiAdvisorAndRedirectToConvention";
import { NotifyPoleEmploiUserAdvisorOnConventionFullySigned } from "../../../domain/peConnect/useCases/NotifyPoleEmploiUserAdvisorOnConventionFullySigned";
import { ConvertContactEstablishmentPublicV1ToDomain } from "../../../domain/publicApi/useCases/ConvertContactEstablishmentPublicV1ToDomain";
import { ConvertRomeToAppellationForEstablishment } from "../../../domain/publicApi/useCases/ConvertRomeToAppellationForEstablishment";
import { AppellationSearch } from "../../../domain/rome/useCases/AppellationSearch";
import { RomeSearch } from "../../../domain/rome/useCases/RomeSearch";
import { GetSiret } from "../../../domain/sirene/useCases/GetSiret";
import { GetSiretIfNotAlreadySaved } from "../../../domain/sirene/useCases/GetSiretIfNotAlreadySaved";
import { NotFoundError } from "../helpers/httpErrors";
import { AppConfig } from "./appConfig";
import { Gateways } from "./createGateways";
import {
  makeGenerateConventionMagicLinkUrl,
  makeGenerateEditFormEstablishmentUrl,
} from "./magicLinkUrl";

export const createUseCases = (
  config: AppConfig,
  gateways: Gateways,
  generateConventionJwt: GenerateConventionJwt,
  generateEditEstablishmentJwt: GenerateEditFormEstablishmentJwt,
  generateBackOfficeJwt: GenerateBackOfficeJwt,
  generateAuthenticatedUserToken: GenerateInclusionConnectJwt,
  generateApiConsumerJwt: GenerateApiConsumerJwt,
  uowPerformer: UnitOfWorkPerformer,
  uuidGenerator: UuidGenerator,
) => {
  const createNewEvent = makeCreateNewEvent({
    timeGateway: gateways.timeGateway,
    uuidGenerator,
    quarantinedTopics: config.quarantinedTopics,
  });
  const saveNotificationAndRelatedEvent = makeSaveNotificationAndRelatedEvent(
    uuidGenerator,
    gateways.timeGateway,
    createNewEvent,
  );
  const addFormEstablishment = new AddFormEstablishment(
    uowPerformer,
    createNewEvent,
    gateways.siret,
  );

  const generateConventionMagicLinkUrl = makeGenerateConventionMagicLinkUrl(
    config,
    generateConventionJwt,
  );

  const addConvention = new AddConvention(
    uowPerformer,
    createNewEvent,
    gateways.siret,
  );

  return {
    ...instantiatedUseCasesFromClasses({
      addExchangeToDiscussionAndSendEmail:
        new AddExchangeToDiscussionAndTransferEmail(
          uowPerformer,
          saveNotificationAndRelatedEvent,
          config.immersionFacileDomain,
          gateways.notification,
        ),
      convertContactEstablishmentPublicV1ToDomain:
        new ConvertContactEstablishmentPublicV1ToDomain(uowPerformer),
      sendNotification: new SendNotification(
        uowPerformer,
        gateways.notification,
      ),
      convertRomeToAppellationForEstablishment:
        new ConvertRomeToAppellationForEstablishment(uowPerformer),
      registerAgencyToInclusionConnectUser:
        new RegisterAgencyToInclusionConnectUser(uowPerformer, createNewEvent),
      updateIcUserRoleForAgency: new UpdateIcUserRoleForAgency(
        uowPerformer,
        createNewEvent,
      ),
      notifyIcUserAgencyRightChanged: new NotifyIcUserAgencyRightChanged(
        uowPerformer,
        saveNotificationAndRelatedEvent,
      ),
      rejectIcUserForAgency: new RejectIcUserForAgency(
        uowPerformer,
        createNewEvent,
      ),
      notifyIcUserAgencyRightRejected: new NotifyIcUserAgencyRightRejected(
        uowPerformer,
        saveNotificationAndRelatedEvent,
      ),
      getIcUsers: new GetInclusionConnectedUsers(uowPerformer),
      getInclusionConnectedUser: new GetInclusionConnectedUser(
        uowPerformer,
        gateways.dashboardGateway,
        gateways.timeGateway,
      ),
      initiateInclusionConnect: new InitiateInclusionConnect(
        uowPerformer,
        uuidGenerator,
        config.inclusionConnectConfig,
      ),
      authenticateWithInclusionCode: new AuthenticateWithInclusionCode(
        uowPerformer,
        createNewEvent,
        gateways.inclusionConnectGateway,
        uuidGenerator,
        generateAuthenticatedUserToken,
        config.immersionFacileBaseUrl,
        config.inclusionConnectConfig,
      ),
      inclusionConnectLogout: new GetInclusionConnectLogoutUrl(
        config.immersionFacileBaseUrl,
        config.inclusionConnectConfig,
      ),
      bindConventionToFederatedIdentity: new BindConventionToFederatedIdentity(
        uowPerformer,
        createNewEvent,
      ),
      uploadLogo: new UploadLogo(
        uowPerformer,
        gateways.documentGateway,
        uuidGenerator,
      ),
      htmlToPdf: new HtmlToPdf(gateways.pdfGeneratorGateway),

      // Address
      lookupStreetAddress: new LookupStreetAddress(gateways.addressApi),
      lookupLocation: new LookupLocation(gateways.addressApi),

      // Admin
      adminLogin: new AdminLogin(
        config.backofficeUsername,
        config.backofficePassword,
        generateBackOfficeJwt,
        () => sleep(config.nodeEnv !== "test" ? 500 : 0),
        gateways.timeGateway,
      ),
      addFormEstablishmentBatch: new AddFormEstablishmentBatch(
        addFormEstablishment,
        uowPerformer,
      ),

      // Conventions
      createAssessment: new CreateAssessment(uowPerformer, createNewEvent),
      addConvention,
      getConvention: new GetConvention(uowPerformer),
      getConventionForApiConsumer: new GetConventionForApiConsumer(
        uowPerformer,
      ),
      getConventionsForApiConsumer: new GetConventionsForApiConsumer(
        uowPerformer,
      ),
      linkPoleEmploiAdvisorAndRedirectToConvention:
        new LinkPoleEmploiAdvisorAndRedirectToConvention(
          uowPerformer,
          gateways.peConnectGateway,
          config.immersionFacileBaseUrl,
        ),

      updateConvention: new UpdateConvention(uowPerformer, createNewEvent),
      updateConventionStatus: new UpdateConventionStatus(
        uowPerformer,
        createNewEvent,
        gateways.timeGateway,
      ),
      signConvention: new SignConvention(
        uowPerformer,
        createNewEvent,
        gateways.timeGateway,
      ),
      renewConventionMagicLink: new RenewConventionMagicLink(
        uowPerformer,
        createNewEvent,
        generateConventionMagicLinkUrl,
        config,
        gateways.timeGateway,
        gateways.shortLinkGenerator,
      ),
      renewConvention: new RenewConvention(uowPerformer, addConvention),
      notifyConventionReminder: new NotifyConventionReminder(
        uowPerformer,
        gateways.timeGateway,
        saveNotificationAndRelatedEvent,
        generateConventionMagicLinkUrl,
        gateways.shortLinkGenerator,
        config,
      ),

      markPartnersErroredConventionAsHandled:
        new MarkPartnersErroredConventionAsHandled(
          uowPerformer,
          createNewEvent,
          gateways.timeGateway,
        ),

      // immersionOffer
      searchImmersion: new SearchImmersion(
        uowPerformer,
        gateways.laBonneBoiteGateway,
        uuidGenerator,
      ),
      getOffersByGroupSlug: new GetOffersByGroupSlug(uowPerformer),
      getSearchResultBySiretAndAppellationCode:
        new GetSearchResultBySiretAndAppellationCode(uowPerformer),
      getSearchImmersionResultBySiretAndRome: new GetSearchResultBySiretAndRome(
        uowPerformer,
      ),

      addFormEstablishment,

      editFormEstablishment: new EditFormEstablishment(
        uowPerformer,
        createNewEvent,
      ),
      retrieveFormEstablishmentFromAggregates:
        new RetrieveFormEstablishmentFromAggregates(uowPerformer),
      updateEstablishmentAggregateFromForm:
        new UpdateEstablishmentAggregateFromForm(
          uowPerformer,
          gateways.addressApi,
          uuidGenerator,
          gateways.timeGateway,
        ),
      insertEstablishmentAggregateFromForm:
        new InsertEstablishmentAggregateFromForm(
          uowPerformer,
          gateways.siret,
          gateways.addressApi,
          uuidGenerator,
          gateways.timeGateway,
          createNewEvent,
        ),
      deleteEstablishment: new DeleteEstablishment(
        uowPerformer,
        gateways.timeGateway,
        saveNotificationAndRelatedEvent,
      ),
      contactEstablishment: new ContactEstablishment(
        uowPerformer,
        createNewEvent,
        uuidGenerator,
        gateways.timeGateway,
        config.minimumNumberOfDaysBetweenSimilarContactRequests,
      ),
      requestEditFormEstablishment: new RequestEditFormEstablishment(
        uowPerformer,
        saveNotificationAndRelatedEvent,
        gateways.timeGateway,
        makeGenerateEditFormEstablishmentUrl(
          config,
          generateEditEstablishmentJwt,
        ),
      ),

      notifyPassEmploiOnNewEstablishmentAggregateInsertedFromForm:
        new NotifyPassEmploiOnNewEstablishmentAggregateInsertedFromForm(
          gateways.passEmploiGateway,
        ),

      // siret
      getSiret: new GetSiret(gateways.siret),
      getSiretIfNotAlreadySaved: new GetSiretIfNotAlreadySaved(
        uowPerformer,
        gateways.siret,
      ),

      // romes
      appellationSearch: new AppellationSearch(uowPerformer),
      romeSearch: new RomeSearch(uowPerformer),

      // email validation
      validateEmail: new ValidateEmail(gateways.emailValidationGateway),

      // agencies
      listAgenciesByFilter: new ListAgenciesByFilter(uowPerformer),
      privateListAgencies: new PrivateListAgencies(uowPerformer),
      getAgencyPublicInfoById: new GetAgencyPublicInfoById(uowPerformer),
      sendEmailWhenAgencyIsActivated: new SendEmailWhenAgencyIsActivated(
        uowPerformer,
        saveNotificationAndRelatedEvent,
      ),
      sendEmailWhenAgencyIsRejected: new SendEmailWhenAgencyIsRejected(
        uowPerformer,
        saveNotificationAndRelatedEvent,
      ),
      updateAgencyReferingToUpdatedAgency:
        new UpdateAgencyReferingToUpdatedAgency(uowPerformer, createNewEvent),
      // METABASE
      ...dashboardUseCases(gateways.dashboardGateway, gateways.timeGateway),
      // notifications
      notifySignatoriesThatConventionSubmittedNeedsSignature:
        new NotifySignatoriesThatConventionSubmittedNeedsSignature(
          uowPerformer,
          gateways.timeGateway,
          gateways.shortLinkGenerator,
          generateConventionMagicLinkUrl,
          config,
          saveNotificationAndRelatedEvent,
        ),
      notifySignatoriesThatConventionSubmittedNeedsSignatureAfterNotification:
        new NotifySignatoriesThatConventionSubmittedNeedsSignatureAfterModification(
          uowPerformer,
          gateways.timeGateway,
          gateways.shortLinkGenerator,
          config,
          saveNotificationAndRelatedEvent,
          generateConventionMagicLinkUrl,
        ),
      notifyLastSigneeThatConventionHasBeenSigned:
        new NotifyLastSigneeThatConventionHasBeenSigned(
          uowPerformer,
          saveNotificationAndRelatedEvent,
          generateConventionMagicLinkUrl,
          gateways.timeGateway,
        ),
      notifyAllActorsOfFinalConventionValidation:
        new NotifyAllActorsOfFinalConventionValidation(
          uowPerformer,
          saveNotificationAndRelatedEvent,
          generateConventionMagicLinkUrl,
          gateways.timeGateway,
          gateways.shortLinkGenerator,
          config,
        ),
      notifyNewConventionNeedsReview: new NotifyNewConventionNeedsReview(
        uowPerformer,
        saveNotificationAndRelatedEvent,
        generateConventionMagicLinkUrl,
        gateways.timeGateway,
        gateways.shortLinkGenerator,
        config,
      ),
      notifyToAgencyConventionSubmitted: new NotifyToAgencyConventionSubmitted(
        uowPerformer,
        saveNotificationAndRelatedEvent,
        generateConventionMagicLinkUrl,
        gateways.timeGateway,
        gateways.shortLinkGenerator,
        config,
      ),
      notifyAllActorsThatConventionIsRejected:
        new NotifyAllActorsThatConventionIsRejected(
          uowPerformer,
          saveNotificationAndRelatedEvent,
        ),
      notifyAllActorsThatConventionIsCancelled:
        new NotifyAllActorsThatConventionIsCancelled(
          uowPerformer,
          saveNotificationAndRelatedEvent,
        ),

      notifyAllActorsThatConventionIsDeprecated:
        new NotifyAllActorsThatConventionIsDeprecated(
          uowPerformer,
          saveNotificationAndRelatedEvent,
        ),
      notifyActorThatConventionNeedsModifications:
        new NotifyActorThatConventionNeedsModifications(
          uowPerformer,
          saveNotificationAndRelatedEvent,
          generateConventionMagicLinkUrl,
          gateways.timeGateway,
          gateways.shortLinkGenerator,
          config,
        ),
      deliverRenewedMagicLink: new DeliverRenewedMagicLink(
        uowPerformer,
        saveNotificationAndRelatedEvent,
      ),
      notifyConfirmationEstablishmentCreated:
        new NotifyConfirmationEstablishmentCreated(
          uowPerformer,
          saveNotificationAndRelatedEvent,
        ),
      notifyContactRequest: new NotifyContactRequest(
        uowPerformer,
        saveNotificationAndRelatedEvent,
        config.immersionFacileDomain,
      ),
      notifyPoleEmploiUserAdvisorOnConventionFullySigned:
        new NotifyPoleEmploiUserAdvisorOnConventionFullySigned(
          uowPerformer,
          saveNotificationAndRelatedEvent,
          generateConventionMagicLinkUrl,
          gateways.timeGateway,
        ),
      notifyAgencyThatAssessmentIsCreated:
        new NotifyAgencyThatAssessmentIsCreated(
          uowPerformer,
          saveNotificationAndRelatedEvent,
        ),
      broadcastToPoleEmploiOnConventionUpdates:
        new BroadcastToPoleEmploiOnConventionUpdates(
          uowPerformer,
          gateways.poleEmploiGateway,
          gateways.timeGateway,
          { resyncMode: false },
        ),
      broadcastToPartnersOnConventionUpdates:
        new BroadcastToPartnersOnConventionUpdates(
          uowPerformer,
          gateways.subscribersGateway,
        ),
      listActiveSubscriptions: new ListActiveSubscriptions(uowPerformer),
      subscribeToWebhook: new SubscribeToWebhook(
        uowPerformer,
        uuidGenerator,
        gateways.timeGateway,
      ),
      deleteSubscription: new DeleteSubscription(uowPerformer),
      shareConventionByEmail: new ShareConventionLinkByEmail(
        uowPerformer,
        saveNotificationAndRelatedEvent,
        gateways.shortLinkGenerator,
        config,
      ),
      addAgency: new AddAgency(uowPerformer, createNewEvent),
      updateAgencyStatus: new UpdateAgencyStatus(uowPerformer, createNewEvent),
      updateAgencyAdmin: new UpdateAgency(uowPerformer, createNewEvent),
      setFeatureFlag: new SetFeatureFlag(uowPerformer),
      saveApiConsumer: new SaveApiConsumer(
        uowPerformer,
        createNewEvent,
        generateApiConsumerJwt,
        gateways.timeGateway,
      ),
    }),
    ...instantiatedUseCasesFromFunctions({
      getFeatureFlags: (_: void) =>
        uowPerformer.perform((uow) => uow.featureFlagRepository.getAll()),
      getLink: (shortLinkId: ShortLinkId) =>
        uowPerformer.perform((uow) => uow.shortLinkQuery.getById(shortLinkId)),
      getApiConsumerById: (id: ApiConsumerId) =>
        uowPerformer.perform((uow) => uow.apiConsumerRepository.getById(id)),
      getAllApiConsumers: () =>
        uowPerformer.perform((uow) => uow.apiConsumerRepository.getAll()),
      getAgencyById: (id: AgencyId) =>
        uowPerformer.perform(async (uow) => {
          const [agency] = await uow.agencyRepository.getByIds([id]);
          return agency;
        }),
      isFormEstablishmentWithSiretAlreadySaved: (siret: SiretDto) =>
        uowPerformer.perform((uow) =>
          uow.establishmentAggregateRepository.hasEstablishmentWithSiret(siret),
        ),
      getImmersionFacileAgencyIdByKind: (_: void) =>
        uowPerformer.perform(async (uow) => {
          const agencyId =
            await uow.agencyRepository.getImmersionFacileAgencyId();
          if (!agencyId) {
            throw new NotFoundError(
              `No agency found with kind immersion-facilitee`,
            );
          }
          return agencyId;
        }),
      getLastNotifications: (_: void) =>
        uowPerformer.perform((uow) =>
          uow.notificationRepository.getLastNotifications(),
        ),
      findSimilarConventions: (
        params: FindSimilarConventionsParams,
      ): Promise<FindSimilarConventionsResponseDto> =>
        uowPerformer.perform(async (uow) => ({
          similarConventionIds:
            await uow.conventionQueries.findSimilarConventions(params),
        })),
    }),
  } satisfies Record<string, InstantiatedUseCase<any, any, any>>;
};

const dashboardUseCases = (
  gateway: DashboardGateway,
  timeGateway: TimeGateway,
) => ({
  getDashboard: new GetDashboardUrl(gateway, timeGateway),
});

export type UseCases = ReturnType<typeof createUseCases>;

export type InstantiatedUseCase<
  Input = void,
  Output = void,
  JwtPayload = void,
> = {
  useCaseName: string;
  execute: (param: Input, jwtPayload?: JwtPayload) => Promise<Output>;
};

const instantiatedUseCaseFromClass = <Input, Output, JwtPayload>(
  useCase:
    | TransactionalUseCase<Input, Output, JwtPayload>
    | UseCase<Input, Output, JwtPayload>,
): InstantiatedUseCase<Input, Output, JwtPayload> => ({
  execute: (p, jwtPayload) => useCase.execute(p, jwtPayload),
  useCaseName: useCase.constructor.name,
});

const createInstantiatedUseCase = <Input = void, Output = void>(params: {
  useCaseName: string;
  execute: (params: Input) => Promise<Output>;
}): InstantiatedUseCase<Input, Output, unknown> => params;

const instantiatedUseCasesFromFunctions = <
  T extends Record<string, (params: any) => Promise<unknown>>,
>(
  lamdas: T,
): {
  [K in keyof T]: T[K] extends (p: infer Input) => Promise<infer Output>
    ? InstantiatedUseCase<Input, Output, any>
    : never;
} =>
  keys(lamdas).reduce(
    (acc, key) => ({
      ...acc,
      [key]: createInstantiatedUseCase({
        useCaseName: key as string,
        execute: lamdas[key],
      }),
    }),
    {} as any,
  );

const instantiatedUseCasesFromClasses = <
  T extends Record<
    string,
    TransactionalUseCase<any, any, any> | UseCase<any, any, any>
  >,
>(
  useCases: T,
): {
  [K in keyof T]: T[K] extends TransactionalUseCase<
    infer Input,
    infer Output,
    infer JwtPayload
  >
    ? InstantiatedUseCase<Input, Output, JwtPayload>
    : T[K] extends UseCase<infer Input2, infer Output2, infer JwtPayload2>
    ? InstantiatedUseCase<Input2, Output2, JwtPayload2>
    : never;
} =>
  keys(useCases).reduce(
    (acc, useCaseKey) => ({
      ...acc,
      [useCaseKey]: instantiatedUseCaseFromClass(useCases[useCaseKey]),
    }),
    {} as any,
  );
