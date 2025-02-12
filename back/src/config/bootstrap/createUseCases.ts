import { keys } from "ramda";
import {
  ApiConsumerId,
  FindSimilarConventionsParams,
  FindSimilarConventionsResponseDto,
  NotFoundError,
  ShortLinkId,
  SiretDto,
} from "shared";
import { AddAgency } from "../../domains/agency/use-cases/AddAgency";
import { makeGetAgencyById } from "../../domains/agency/use-cases/GetAgencyById";
import { ListAgencyOptionsByFilter } from "../../domains/agency/use-cases/ListAgenciesByFilter";
import { PrivateListAgencies } from "../../domains/agency/use-cases/PrivateListAgencies";
import { RegisterAgencyToInclusionConnectUser } from "../../domains/agency/use-cases/RegisterAgencyToInclusionConnectUser";
import { UpdateAgency } from "../../domains/agency/use-cases/UpdateAgency";
import { UpdateAgencyReferringToUpdatedAgency } from "../../domains/agency/use-cases/UpdateAgencyReferringToUpdatedAgency";
import { UpdateAgencyStatus } from "../../domains/agency/use-cases/UpdateAgencyStatus";
import { AddConvention } from "../../domains/convention/use-cases/AddConvention";
import { AddValidatedConventionNps } from "../../domains/convention/use-cases/AddValidatedConventionNps";
import { makeCreateAssessment } from "../../domains/convention/use-cases/CreateAssessment";
import { GetAgencyPublicInfoById } from "../../domains/convention/use-cases/GetAgencyPublicInfoById";
import { makeGetApiConsumersByConvention } from "../../domains/convention/use-cases/GetApiConsumersByConvention";
import { makeGetAssessmentByConventionId } from "../../domains/convention/use-cases/GetAssessmentByConventionId";
import { GetConvention } from "../../domains/convention/use-cases/GetConvention";
import { GetConventionForApiConsumer } from "../../domains/convention/use-cases/GetConventionForApiConsumer";
import { GetConventionsForApiConsumer } from "../../domains/convention/use-cases/GetConventionsForApiConsumer";
import { RenewConvention } from "../../domains/convention/use-cases/RenewConvention";
import { RenewConventionMagicLink } from "../../domains/convention/use-cases/RenewConventionMagicLink";
import { SendEmailWhenAgencyIsRejected } from "../../domains/convention/use-cases/SendEmailWhenAgencyIsRejected";
import { SendEmailWhenNewAgencyOfTypeOtherAdded } from "../../domains/convention/use-cases/SendEmailWhenNewAgencyOfTypeOtherAdded";
import { SendEmailsWhenAgencyIsActivated } from "../../domains/convention/use-cases/SendEmailsWhenAgencyIsActivated";
import { ShareConventionLinkByEmail } from "../../domains/convention/use-cases/ShareConventionLinkByEmail";
import { SignConvention } from "../../domains/convention/use-cases/SignConvention";
import { UpdateConvention } from "../../domains/convention/use-cases/UpdateConvention";
import { UpdateConventionStatus } from "../../domains/convention/use-cases/UpdateConventionStatus";
import { makeBroadcastConventionAgain } from "../../domains/convention/use-cases/broadcast/BroadcastConventionAgain";
import { BroadcastToFranceTravailOnConventionUpdates } from "../../domains/convention/use-cases/broadcast/BroadcastToFranceTravailOnConventionUpdates";
import { DeliverRenewedMagicLink } from "../../domains/convention/use-cases/notifications/DeliverRenewedMagicLink";
import { NotifyActorThatConventionNeedsModifications } from "../../domains/convention/use-cases/notifications/NotifyActorThatConventionNeedsModifications";
import { NotifyAgencyDelegationContact } from "../../domains/convention/use-cases/notifications/NotifyAgencyDelegationContact";
import { NotifyAgencyThatAssessmentIsCreated } from "../../domains/convention/use-cases/notifications/NotifyAgencyThatAssessmentIsCreated";
import { NotifyAllActorsOfFinalConventionValidation } from "../../domains/convention/use-cases/notifications/NotifyAllActorsOfFinalConventionValidation";
import { NotifyAllActorsThatConventionIsCancelled } from "../../domains/convention/use-cases/notifications/NotifyAllActorsThatConventionIsCancelled";
import { NotifyAllActorsThatConventionIsDeprecated } from "../../domains/convention/use-cases/notifications/NotifyAllActorsThatConventionIsDeprecated";
import { NotifyAllActorsThatConventionIsRejected } from "../../domains/convention/use-cases/notifications/NotifyAllActorsThatConventionIsRejected";
import { NotifyConventionReminder } from "../../domains/convention/use-cases/notifications/NotifyConventionReminder";
import { NotifyIcUserAgencyRightChanged } from "../../domains/convention/use-cases/notifications/NotifyIcUserAgencyRightChanged";
import { NotifyIcUserAgencyRightRejected } from "../../domains/convention/use-cases/notifications/NotifyIcUserAgencyRightRejected";
import { NotifyLastSigneeThatConventionHasBeenSigned } from "../../domains/convention/use-cases/notifications/NotifyLastSigneeThatConventionHasBeenSigned";
import { NotifyNewConventionNeedsReview } from "../../domains/convention/use-cases/notifications/NotifyNewConventionNeedsReview";
import { NotifySignatoriesThatConventionSubmittedNeedsSignature } from "../../domains/convention/use-cases/notifications/NotifySignatoriesThatConventionSubmittedNeedsSignature";
import { NotifySignatoriesThatConventionSubmittedNeedsSignatureAfterModification } from "../../domains/convention/use-cases/notifications/NotifySignatoriesThatConventionSubmittedNeedsSignatureAfterModification";
import { NotifyToAgencyConventionSubmitted } from "../../domains/convention/use-cases/notifications/NotifyToAgencyConventionSubmitted";
import { MarkPartnersErroredConventionAsHandled } from "../../domains/convention/use-cases/partners-errored-convention/MarkPartnersErroredConventionAsHandled";
import { TransactionalUseCase, UseCase } from "../../domains/core/UseCase";
import { LookupLocation } from "../../domains/core/address/use-cases/LookupLocation";
import { LookupStreetAddress } from "../../domains/core/address/use-cases/LookupStreetAddress";
import { BroadcastToPartnersOnConventionUpdates } from "../../domains/core/api-consumer/use-cases/BroadcastToPartnersOnConventionUpdates";
import { DeleteSubscription } from "../../domains/core/api-consumer/use-cases/DeleteSubscription";
import { makeListActiveSubscriptions } from "../../domains/core/api-consumer/use-cases/ListActiveSubscriptions";
import { SaveApiConsumer } from "../../domains/core/api-consumer/use-cases/SaveApiConsumer";
import { SubscribeToWebhook } from "../../domains/core/api-consumer/use-cases/SubscribeToWebhook";
import { BindConventionToFederatedIdentity } from "../../domains/core/authentication/ft-connect/use-cases/BindConventionToFederatedIdentity";
import { LinkFranceTravailAdvisorAndRedirectToConvention } from "../../domains/core/authentication/ft-connect/use-cases/LinkFranceTravailAdvisorAndRedirectToConvention";
import { NotifyFranceTravailUserAdvisorOnConventionFullySigned } from "../../domains/core/authentication/ft-connect/use-cases/NotifyFranceTravailUserAdvisorOnConventionFullySigned";
import { AuthenticateWithInclusionCode } from "../../domains/core/authentication/inclusion-connect/use-cases/AuthenticateWithInclusionCode";
import { makeGetInclusionConnectLogoutUrl } from "../../domains/core/authentication/inclusion-connect/use-cases/GetInclusionConnectLogoutUrl";
import { InitiateInclusionConnect } from "../../domains/core/authentication/inclusion-connect/use-cases/InitiateInclusionConnect";
import { DashboardGateway } from "../../domains/core/dashboard/port/DashboardGateway";
import { GetDashboardUrl } from "../../domains/core/dashboard/useCases/GetDashboardUrl";
import { ValidateEmail } from "../../domains/core/email-validation/use-cases/ValidateEmail";
import { makeCreateNewEvent } from "../../domains/core/events/ports/EventBus";
import { SetFeatureFlag } from "../../domains/core/feature-flags/use-cases/SetFeatureFlag";
import { UploadFile } from "../../domains/core/file-storage/useCases/UploadFile";
import {
  GenerateApiConsumerJwt,
  GenerateConventionJwt,
  GenerateEditFormEstablishmentJwt,
  GenerateInclusionConnectJwt,
} from "../../domains/core/jwt";
import { makeGetNafSuggestions } from "../../domains/core/naf/use-cases/GetNafSuggestions";
import {
  makeSaveNotificationAndRelatedEvent,
  makeSaveNotificationsBatchAndRelatedEvent,
} from "../../domains/core/notifications/helpers/Notification";
import { SendNotification } from "../../domains/core/notifications/useCases/SendNotification";
import { SendNotificationInBatch } from "../../domains/core/notifications/useCases/SendNotificationInBatch";
import { HtmlToPdf } from "../../domains/core/pdf-generation/use-cases/HtmlToPdf";
import { AppellationSearch } from "../../domains/core/rome/use-cases/AppellationSearch";
import { RomeSearch } from "../../domains/core/rome/use-cases/RomeSearch";
import { GetSiret } from "../../domains/core/sirene/use-cases/GetSiret";
import { GetSiretIfNotAlreadySaved } from "../../domains/core/sirene/use-cases/GetSiretIfNotAlreadySaved";
import { makeGetEstablishmentStats } from "../../domains/core/statistics/use-cases/GetEstablishmentStats";
import { TimeGateway } from "../../domains/core/time-gateway/ports/TimeGateway";
import { UnitOfWorkPerformer } from "../../domains/core/unit-of-work/ports/UnitOfWorkPerformer";
import { UuidGenerator } from "../../domains/core/uuid-generator/ports/UuidGenerator";
import { AddEstablishmentLead } from "../../domains/establishment/use-cases/AddEstablishmentLead";
import { AddFormEstablishment } from "../../domains/establishment/use-cases/AddFormEstablishment";
import { AddFormEstablishmentBatch } from "../../domains/establishment/use-cases/AddFormEstablismentsBatch";
import { makeAssessmentReminder } from "../../domains/establishment/use-cases/AssessmentReminder";
import { ContactEstablishment } from "../../domains/establishment/use-cases/ContactEstablishment";
import { makeContactRequestReminder } from "../../domains/establishment/use-cases/ContactRequestReminder";
import { DeleteEstablishment } from "../../domains/establishment/use-cases/DeleteEstablishment";
import { makeGetExternalSearchResult } from "../../domains/establishment/use-cases/GetExternalSearchResult";
import { GetOffersByGroupSlug } from "../../domains/establishment/use-cases/GetGroupBySlug";
import { GetSearchResultBySearchQuery } from "../../domains/establishment/use-cases/GetSearchResultBySearchQuery";
import { InsertEstablishmentAggregateFromForm } from "../../domains/establishment/use-cases/InsertEstablishmentAggregateFromFormEstablishement";
import { LegacyContactEstablishment } from "../../domains/establishment/use-cases/LegacyContactEstablishment";
import { MarkEstablishmentLeadAsRegistrationAccepted } from "../../domains/establishment/use-cases/MarkEstablishmentLeadAsRegistrationAccepted";
import { MarkEstablishmentLeadAsRegistrationRejected } from "../../domains/establishment/use-cases/MarkEstablishmentLeadAsRegistrationRejected";
import { RequestEditFormEstablishment } from "../../domains/establishment/use-cases/RequestEditFormEstablishment";
import { RetrieveFormEstablishmentFromAggregates } from "../../domains/establishment/use-cases/RetrieveFormEstablishmentFromAggregates";
import { SearchImmersion } from "../../domains/establishment/use-cases/SearchImmersion";
import { UpdateEstablishmentAggregateFromForm } from "../../domains/establishment/use-cases/UpdateEstablishmentAggregateFromFormEstablishement";
import { AddExchangeToDiscussion } from "../../domains/establishment/use-cases/discussions/AddExchangeToDiscussion";
import { GetDiscussionByIdForEstablishment } from "../../domains/establishment/use-cases/discussions/GetDiscussionByIdForEstablishment";
import { makeMarkDiscussionLinkedToConvention } from "../../domains/establishment/use-cases/discussions/MarkDiscussionLinkedToConvention";
import { makeRejectDiscussionAndSendNotification } from "../../domains/establishment/use-cases/discussions/RejectDiscussionAndSendNotification";
import { SendExchangeToRecipient } from "../../domains/establishment/use-cases/discussions/SendExchangeToRecipient";
import { NotifyConfirmationEstablishmentCreated } from "../../domains/establishment/use-cases/notifications/NotifyConfirmationEstablishmentCreated";
import { NotifyContactRequest } from "../../domains/establishment/use-cases/notifications/NotifyContactRequest";
import { NotifyPassEmploiOnNewEstablishmentAggregateInsertedFromForm } from "../../domains/establishment/use-cases/notifications/NotifyPassEmploiOnNewEstablishmentAggregateInsertedFromForm";
import { makeCreateUserForAgency } from "../../domains/inclusion-connected-users/use-cases/CreateUserForAgency";
import { GetInclusionConnectedUser } from "../../domains/inclusion-connected-users/use-cases/GetInclusionConnectedUser";
import { GetInclusionConnectedUsers } from "../../domains/inclusion-connected-users/use-cases/GetInclusionConnectedUsers";
import { makeGetUsers } from "../../domains/inclusion-connected-users/use-cases/GetUsers";
import { LinkFranceTravailUsersToTheirAgencies } from "../../domains/inclusion-connected-users/use-cases/LinkFranceTravailUsersToTheirAgencies";
import { RejectIcUserForAgency } from "../../domains/inclusion-connected-users/use-cases/RejectIcUserForAgency";
import { makeRemoveUserFromAgency } from "../../domains/inclusion-connected-users/use-cases/RemoveUserFromAgency";
import { UpdateUserForAgency } from "../../domains/inclusion-connected-users/use-cases/UpdateUserForAgency";
import { makeUpdateMarketingEstablishmentContactList } from "../../domains/marketing/use-cases/UpdateMarketingEstablishmentContactsList";
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
  generateConventionLongDurationJwt: GenerateConventionJwt,
  generateEditEstablishmentJwt: GenerateEditFormEstablishmentJwt,
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

  const saveNotificationsBatchAndRelatedEvent =
    makeSaveNotificationsBatchAndRelatedEvent(
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

  const generateConventionStatusLinkUrl = makeGenerateConventionMagicLinkUrl(
    config,
    generateConventionLongDurationJwt,
  );

  const addConvention = new AddConvention(
    uowPerformer,
    createNewEvent,
    gateways.siret,
  );

  return {
    ...instantiatedUseCasesFromClasses({
      addExchangeToDiscussion: new AddExchangeToDiscussion(
        uowPerformer,
        createNewEvent,
        config.immersionFacileDomain,
      ),
      sendExchangeToRecipient: new SendExchangeToRecipient(
        uowPerformer,
        saveNotificationAndRelatedEvent,
        config.immersionFacileDomain,
        gateways.notification,
      ),
      getDiscussionByIdForEstablishment: new GetDiscussionByIdForEstablishment(
        uowPerformer,
      ),
      sendNotification: new SendNotification(
        uowPerformer,
        gateways.notification,
      ),
      sendNotificationsInBatch: new SendNotificationInBatch(
        uowPerformer,
        gateways.notification,
      ),
      registerAgencyToInclusionConnectUser:
        new RegisterAgencyToInclusionConnectUser(uowPerformer, createNewEvent),
      updateUserForAgency: new UpdateUserForAgency(
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
        gateways.oAuthGateway,
      ),
      authenticateWithInclusionCode: new AuthenticateWithInclusionCode(
        uowPerformer,
        createNewEvent,
        gateways.oAuthGateway,
        uuidGenerator,
        generateAuthenticatedUserToken,
        config.immersionFacileBaseUrl,
        gateways.timeGateway,
      ),
      linkFranceTravailUsersToTheirAgencies:
        new LinkFranceTravailUsersToTheirAgencies(uowPerformer),
      bindConventionToFederatedIdentity: new BindConventionToFederatedIdentity(
        uowPerformer,
        createNewEvent,
      ),
      uploadFile: new UploadFile(gateways.documentGateway, uuidGenerator),
      htmlToPdf: new HtmlToPdf(gateways.pdfGeneratorGateway),

      addValidatedConventionNPS: new AddValidatedConventionNps(uowPerformer),

      // Address
      lookupStreetAddress: new LookupStreetAddress(gateways.addressApi),
      lookupLocation: new LookupLocation(gateways.addressApi),

      addFormEstablishmentBatch: new AddFormEstablishmentBatch(
        addFormEstablishment,
        uowPerformer,
      ),

      // Conventions
      addConvention,
      getConvention: new GetConvention(uowPerformer),
      getConventionForApiConsumer: new GetConventionForApiConsumer(
        uowPerformer,
      ),
      getConventionsForApiConsumer: new GetConventionsForApiConsumer(
        uowPerformer,
      ),
      linkFranceTravailAdvisorAndRedirectToConvention:
        new LinkFranceTravailAdvisorAndRedirectToConvention(
          uowPerformer,
          gateways.ftConnectGateway,
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
        saveNotificationsBatchAndRelatedEvent,
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
      retrieveFormEstablishmentFromAggregates:
        new RetrieveFormEstablishmentFromAggregates(uowPerformer),
      updateEstablishmentAggregateFromForm:
        new UpdateEstablishmentAggregateFromForm(
          uowPerformer,
          gateways.addressApi,
          uuidGenerator,
          gateways.timeGateway,
          createNewEvent,
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
        config.immersionFacileDomain,
      ),
      legacyContactEstablishment: new LegacyContactEstablishment(
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
      appellationSearch: new AppellationSearch(
        uowPerformer,
        gateways.appellationsGateway,
      ),
      romeSearch: new RomeSearch(uowPerformer),

      // email validation
      validateEmail: new ValidateEmail(gateways.emailValidationGateway),

      // agencies
      listAgencyOptionsByFilter: new ListAgencyOptionsByFilter(uowPerformer),
      privateListAgencies: new PrivateListAgencies(uowPerformer),
      getAgencyPublicInfoById: new GetAgencyPublicInfoById(uowPerformer),
      sendEmailsWhenAgencyIsActivated: new SendEmailsWhenAgencyIsActivated(
        uowPerformer,
        saveNotificationAndRelatedEvent,
      ),
      sendEmailWhenNewAgencyOfTypeOtherAdded:
        new SendEmailWhenNewAgencyOfTypeOtherAdded(
          uowPerformer,
          saveNotificationAndRelatedEvent,
        ),
      sendEmailWhenAgencyIsRejected: new SendEmailWhenAgencyIsRejected(
        uowPerformer,
        saveNotificationAndRelatedEvent,
      ),
      updateAgencyReferringToUpdatedAgency:
        new UpdateAgencyReferringToUpdatedAgency(uowPerformer, createNewEvent),
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
          generateConventionStatusLinkUrl,
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
      notifyFranceTravailUserAdvisorOnConventionFullySigned:
        new NotifyFranceTravailUserAdvisorOnConventionFullySigned(
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
      notifyAgencyDelegationContact: new NotifyAgencyDelegationContact(
        uowPerformer,
        saveNotificationAndRelatedEvent,
      ),
      broadcastToFranceTravailOnConventionUpdates:
        new BroadcastToFranceTravailOnConventionUpdates(
          uowPerformer,
          gateways.franceTravailGateway,
          gateways.timeGateway,
          { resyncMode: false },
        ),
      broadcastToPartnersOnConventionUpdates:
        new BroadcastToPartnersOnConventionUpdates(
          uowPerformer,
          gateways.subscribersGateway,
          gateways.timeGateway,
          config.apiConsumerNamesUsingRomeV3,
        ),
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
      addAgency: new AddAgency(
        uowPerformer,
        createNewEvent,
        gateways.siret,
        gateways.timeGateway,
        uuidGenerator,
      ),
      updateAgencyStatus: new UpdateAgencyStatus(uowPerformer, createNewEvent),
      updateAgency: new UpdateAgency(uowPerformer, createNewEvent),
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
      isFormEstablishmentWithSiretAlreadySaved: (siret: SiretDto) =>
        uowPerformer.perform((uow) =>
          uow.establishmentAggregateRepository.hasEstablishmentAggregateWithSiret(
            siret,
          ),
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

    assessmentReminder: makeAssessmentReminder({
      uowPerformer,
      deps: {
        timeGateway: gateways.timeGateway,
        saveNotificationAndRelatedEvent,
        generateConventionMagicLinkUrl,
      },
    }),
    getAgencyById: makeGetAgencyById({
      uowPerformer,
    }),
    inclusionConnectLogout: makeGetInclusionConnectLogoutUrl({
      uowPerformer,
      deps: { oAuthGateway: gateways.oAuthGateway },
    }),
    createAssessment: makeCreateAssessment({
      uowPerformer,
      deps: { createNewEvent },
    }),
    getAssessmentByConventionId: makeGetAssessmentByConventionId({
      uowPerformer,
    }),
    listActiveSubscriptions: makeListActiveSubscriptions({
      uowPerformer,
    }),
    createUserForAgency: makeCreateUserForAgency({
      uowPerformer,
      deps: {
        timeGateway: gateways.timeGateway,
        createNewEvent,
      },
    }),
    removeUserFromAgency: makeRemoveUserFromAgency({
      uowPerformer,
      deps: { createNewEvent },
    }),
    broadcastConventionAgain: makeBroadcastConventionAgain({
      uowPerformer,
      deps: { createNewEvent, timeGateway: gateways.timeGateway },
    }),
    getApiConsumersByConvention: makeGetApiConsumersByConvention({
      uowPerformer,
    }),
    markDiscussionLinkedToConvention: makeMarkDiscussionLinkedToConvention({
      uowPerformer,
    }),
    contactRequestReminder: makeContactRequestReminder({
      deps: {
        domain: config.immersionFacileDomain,
        saveNotificationAndRelatedEvent,
        timeGateway: gateways.timeGateway,
      },
      uowPerformer,
    }),
    getEstablishmentStats: makeGetEstablishmentStats({
      uowPerformer,
    }),
    rejectDiscussionAndSendNotification:
      makeRejectDiscussionAndSendNotification({
        uowPerformer,
        deps: {
          replyDomain: `reply.${config.immersionFacileDomain}`,
          saveNotificationAndRelatedEvent,
          timeGateway: gateways.timeGateway,
        },
      }),
    updateMarketingEstablishmentContactList:
      makeUpdateMarketingEstablishmentContactList({
        deps: {
          establishmentMarketingGateway: gateways.establishmentMarketingGateway,
          timeGateway: gateways.timeGateway,
        },
        uowPerformer,
      }),
    getUsers: makeGetUsers({
      uowPerformer,
    }),
    getExternalSearchResult: makeGetExternalSearchResult({
      deps: {
        laBonneBoiteGateway: gateways.laBonneBoiteGateway,
      },
      uowPerformer,
    }),
    nafSuggestions: makeGetNafSuggestions({ uowPerformer }),
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
  T extends Record<string, (...params: any[]) => Promise<unknown>>,
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
