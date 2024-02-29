import { keys } from "ramda";
import {
  AgencyId,
  ApiConsumerId,
  FindSimilarConventionsParams,
  FindSimilarConventionsResponseDto,
  SiretDto,
  sleep,
} from "shared";
import { BroadcastToPartnersOnConventionUpdates } from "../../../domains/broadcast/useCases/BroadcastToPartnersOnConventionUpdates";
import { DeleteSubscription } from "../../../domains/broadcast/useCases/DeleteSubscription";
import { ListActiveSubscriptions } from "../../../domains/broadcast/useCases/ListActiveSubscriptions";
import { SubscribeToWebhook } from "../../../domains/broadcast/useCases/SubscribeToWebhook";
import { AddConvention } from "../../../domains/convention/useCases/AddConvention";
import { CreateAssessment } from "../../../domains/convention/useCases/CreateAssessment";
import { GetAgencyPublicInfoById } from "../../../domains/convention/useCases/GetAgencyPublicInfoById";
import { GetConvention } from "../../../domains/convention/useCases/GetConvention";
import { GetConventionForApiConsumer } from "../../../domains/convention/useCases/GetConventionForApiConsumer";
import { GetConventionsForApiConsumer } from "../../../domains/convention/useCases/GetConventionsForApiConsumer";
import { RenewConvention } from "../../../domains/convention/useCases/RenewConvention";
import { RenewConventionMagicLink } from "../../../domains/convention/useCases/RenewConventionMagicLink";
import { SendEmailWhenAgencyIsActivated } from "../../../domains/convention/useCases/SendEmailWhenAgencyIsActivated";
import { SendEmailWhenAgencyIsRejected } from "../../../domains/convention/useCases/SendEmailWhenAgencyIsRejected";
import { ShareConventionLinkByEmail } from "../../../domains/convention/useCases/ShareConventionLinkByEmail";
import { SignConvention } from "../../../domains/convention/useCases/SignConvention";
import { UpdateConvention } from "../../../domains/convention/useCases/UpdateConvention";
import { UpdateConventionStatus } from "../../../domains/convention/useCases/UpdateConventionStatus";
import { AddAgency } from "../../../domains/convention/useCases/agencies/AddAgency";
import { ListAgenciesByFilter } from "../../../domains/convention/useCases/agencies/ListAgenciesByFilter";
import { PrivateListAgencies } from "../../../domains/convention/useCases/agencies/PrivateListAgencies";
import { RegisterAgencyToInclusionConnectUser } from "../../../domains/convention/useCases/agencies/RegisterAgencyToInclusionConnectUser";
import { UpdateAgency } from "../../../domains/convention/useCases/agencies/UpdateAgency";
import { UpdateAgencyReferingToUpdatedAgency } from "../../../domains/convention/useCases/agencies/UpdateAgencyReferingToUpdatedAgency";
import { UpdateAgencyStatus } from "../../../domains/convention/useCases/agencies/UpdateAgencyStatus";
import { BroadcastToPoleEmploiOnConventionUpdates } from "../../../domains/convention/useCases/broadcast/BroadcastToPoleEmploiOnConventionUpdates";
import { DeliverRenewedMagicLink } from "../../../domains/convention/useCases/notifications/DeliverRenewedMagicLink";
import { NotifyActorThatConventionNeedsModifications } from "../../../domains/convention/useCases/notifications/NotifyActorThatConventionNeedsModifications";
import { NotifyAgencyThatAssessmentIsCreated } from "../../../domains/convention/useCases/notifications/NotifyAgencyThatAssessmentIsCreated";
import { NotifyAllActorsOfFinalConventionValidation } from "../../../domains/convention/useCases/notifications/NotifyAllActorsOfFinalConventionValidation";
import { NotifyAllActorsThatConventionIsCancelled } from "../../../domains/convention/useCases/notifications/NotifyAllActorsThatConventionIsCancelled";
import { NotifyAllActorsThatConventionIsDeprecated } from "../../../domains/convention/useCases/notifications/NotifyAllActorsThatConventionIsDeprecated";
import { NotifyAllActorsThatConventionIsRejected } from "../../../domains/convention/useCases/notifications/NotifyAllActorsThatConventionIsRejected";
import { NotifyConventionReminder } from "../../../domains/convention/useCases/notifications/NotifyConventionReminder";
import { NotifyIcUserAgencyRightChanged } from "../../../domains/convention/useCases/notifications/NotifyIcUserAgencyRightChanged";
import { NotifyIcUserAgencyRightRejected } from "../../../domains/convention/useCases/notifications/NotifyIcUserAgencyRightRejected";
import { NotifyLastSigneeThatConventionHasBeenSigned } from "../../../domains/convention/useCases/notifications/NotifyLastSigneeThatConventionHasBeenSigned";
import { NotifyNewConventionNeedsReview } from "../../../domains/convention/useCases/notifications/NotifyNewConventionNeedsReview";
import { NotifySignatoriesThatConventionSubmittedNeedsSignature } from "../../../domains/convention/useCases/notifications/NotifySignatoriesThatConventionSubmittedNeedsSignature";
import { NotifySignatoriesThatConventionSubmittedNeedsSignatureAfterModification } from "../../../domains/convention/useCases/notifications/NotifySignatoriesThatConventionSubmittedNeedsSignatureAfterModification";
import { NotifyToAgencyConventionSubmitted } from "../../../domains/convention/useCases/notifications/NotifyToAgencyConventionSubmitted";
import { MarkPartnersErroredConventionAsHandled } from "../../../domains/convention/useCases/partnersErroredConvention/MarkPartnersErroredConventionAsHandled";
import { TransactionalUseCase, UseCase } from "../../../domains/core/UseCase";
import { LookupLocation } from "../../../domains/core/address/use-cases/LookupLocation";
import { LookupStreetAddress } from "../../../domains/core/address/use-cases/LookupStreetAddress";
import { SaveApiConsumer } from "../../../domains/core/api-consumer/use-cases/SaveApiConsumer";
import { AdminLogin } from "../../../domains/core/authentication/admin-backoffice/use-cases/AdminLogin";
import { AuthenticateWithInclusionCode } from "../../../domains/core/authentication/inclusion-connect/use-cases/AuthenticateWithInclusionCode";
import { GetInclusionConnectLogoutUrl } from "../../../domains/core/authentication/inclusion-connect/use-cases/GetInclusionConnectLogoutUrl";
import { InitiateInclusionConnect } from "../../../domains/core/authentication/inclusion-connect/use-cases/InitiateInclusionConnect";
import { BindConventionToFederatedIdentity } from "../../../domains/core/authentication/pe-connect/use-cases/BindConventionToFederatedIdentity";
import { LinkPoleEmploiAdvisorAndRedirectToConvention } from "../../../domains/core/authentication/pe-connect/use-cases/LinkPoleEmploiAdvisorAndRedirectToConvention";
import { NotifyPoleEmploiUserAdvisorOnConventionFullySigned } from "../../../domains/core/authentication/pe-connect/use-cases/NotifyPoleEmploiUserAdvisorOnConventionFullySigned";
import { DashboardGateway } from "../../../domains/core/dashboard/port/DashboardGateway";
import { GetDashboardUrl } from "../../../domains/core/dashboard/useCases/GetDashboardUrl";
import { ValidateEmail } from "../../../domains/core/email-validation/use-cases/ValidateEmail";
import { makeCreateNewEvent } from "../../../domains/core/events/ports/EventBus";
import { SetFeatureFlag } from "../../../domains/core/feature-flags/use-cases/SetFeatureFlag";
import { UploadFile } from "../../../domains/core/file-storage/useCases/UploadFile";
import {
  GenerateApiConsumerJwt,
  GenerateBackOfficeJwt,
  GenerateConventionJwt,
  GenerateEditFormEstablishmentJwt,
  GenerateInclusionConnectJwt,
} from "../../../domains/core/jwt";
import { makeSaveNotificationAndRelatedEvent } from "../../../domains/core/notifications/helpers/Notification";
import { SendNotification } from "../../../domains/core/notifications/useCases/SendNotification";
import { HtmlToPdf } from "../../../domains/core/pdf-generation/use-cases/HtmlToPdf";
import { ShortLinkId } from "../../../domains/core/short-link/ports/ShortLinkQuery";
import { TimeGateway } from "../../../domains/core/time-gateway/ports/TimeGateway";
import { UnitOfWorkPerformer } from "../../../domains/core/unit-of-work/ports/UnitOfWorkPerformer";
import { UuidGenerator } from "../../../domains/core/uuid-generator/ports/UuidGenerator";
import { GetInclusionConnectedUser } from "../../../domains/inclusionConnectedUsers/useCases/GetInclusionConnectedUser";
import { GetInclusionConnectedUsers } from "../../../domains/inclusionConnectedUsers/useCases/GetInclusionConnectedUsers";
import { LinkFranceTravailUsersToTheirAgencies } from "../../../domains/inclusionConnectedUsers/useCases/LinkFranceTravailUsersToTheirAgencies";
import { RejectIcUserForAgency } from "../../../domains/inclusionConnectedUsers/useCases/RejectIcUserForAgency";
import { UpdateIcUserRoleForAgency } from "../../../domains/inclusionConnectedUsers/useCases/UpdateIcUserRoleForAgency";
import { AddEstablishmentLead } from "../../../domains/offer/useCases/AddEstablishmentLead";
import { AddFormEstablishment } from "../../../domains/offer/useCases/AddFormEstablishment";
import { AddFormEstablishmentBatch } from "../../../domains/offer/useCases/AddFormEstablismentsBatch";
import { ContactEstablishment } from "../../../domains/offer/useCases/ContactEstablishment";
import { DeleteEstablishment } from "../../../domains/offer/useCases/DeleteEstablishment";
import { EditFormEstablishment } from "../../../domains/offer/useCases/EditFormEstablishment";
import { GetOffersByGroupSlug } from "../../../domains/offer/useCases/GetGroupBySlug";
import { GetSearchResultBySearchQuery } from "../../../domains/offer/useCases/GetSearchResultBySearchQuery";
import { InsertEstablishmentAggregateFromForm } from "../../../domains/offer/useCases/InsertEstablishmentAggregateFromFormEstablishement";
import { MarkEstablishmentLeadAsRegistrationAccepted } from "../../../domains/offer/useCases/MarkEstablishmentLeadAsRegistrationAccepted";
import { MarkEstablishmentLeadAsRegistrationRejected } from "../../../domains/offer/useCases/MarkEstablishmentLeadAsRegistrationRejected";
import { RequestEditFormEstablishment } from "../../../domains/offer/useCases/RequestEditFormEstablishment";
import { RetrieveFormEstablishmentFromAggregates } from "../../../domains/offer/useCases/RetrieveFormEstablishmentFromAggregates";
import { SearchImmersion } from "../../../domains/offer/useCases/SearchImmersion";
import { UpdateEstablishmentAggregateFromForm } from "../../../domains/offer/useCases/UpdateEstablishmentAggregateFromFormEstablishement";
import { AddExchangeToDiscussionAndTransferEmail } from "../../../domains/offer/useCases/discussions/AddExchangeToDiscussionAndTransferEmail";
import { NotifyConfirmationEstablishmentCreated } from "../../../domains/offer/useCases/notifications/NotifyConfirmationEstablishmentCreated";
import { NotifyContactRequest } from "../../../domains/offer/useCases/notifications/NotifyContactRequest";
import { NotifyPassEmploiOnNewEstablishmentAggregateInsertedFromForm } from "../../../domains/offer/useCases/notifications/NotifyPassEmploiOnNewEstablishmentAggregateInsertedFromForm";
import { ConvertRomeToAppellationForEstablishment } from "../../../domains/publicApi/useCases/ConvertRomeToAppellationForEstablishment";
import { AppellationSearch } from "../../../domains/rome/useCases/AppellationSearch";
import { RomeSearch } from "../../../domains/rome/useCases/RomeSearch";
import { GetSiret } from "../../../domains/sirene/useCases/GetSiret";
import { GetSiretIfNotAlreadySaved } from "../../../domains/sirene/useCases/GetSiretIfNotAlreadySaved";
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
      linkFranceTravailUsersToTheirAgencies:
        new LinkFranceTravailUsersToTheirAgencies(uowPerformer),
      inclusionConnectLogout: new GetInclusionConnectLogoutUrl(
        config.immersionFacileBaseUrl,
        config.inclusionConnectConfig,
      ),
      bindConventionToFederatedIdentity: new BindConventionToFederatedIdentity(
        uowPerformer,
        createNewEvent,
      ),
      uploadFile: new UploadFile(gateways.documentGateway, uuidGenerator),
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
        gateways.timeGateway,
      ),
      getOffersByGroupSlug: new GetOffersByGroupSlug(uowPerformer),
      getSearchResultBySearchQuery: new GetSearchResultBySearchQuery(
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
      addEstablishmentLead: new AddEstablishmentLead(
        uowPerformer,
        gateways.timeGateway,
      ),
      markEstablishmentLeadAsRegistrationAccepted:
        new MarkEstablishmentLeadAsRegistrationAccepted(
          uowPerformer,
          gateways.timeGateway,
        ),
      markEstablishmentLeadAsRegistrationRejected:
        new MarkEstablishmentLeadAsRegistrationRejected(
          uowPerformer,
          gateways.timeGateway,
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
      addAgency: new AddAgency(uowPerformer, createNewEvent, gateways.siret),
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
              "No agency found with kind immersion-facilitee",
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
