import { KyselyDb } from "../../../../config/pg/kysely/kyselyUtils";
import { PgAgencyGroupRepository } from "../../../agency/adapters/PgAgencyGroupRepository";
import { PgAgencyRepository } from "../../../agency/adapters/PgAgencyRepository";
import { PgDelegationContactRepository } from "../../../agency/adapters/PgDelegationContactRepository";
import { PgAssessmentRepository } from "../../../convention/adapters/PgAssessmentRepository";
import { PgConventionExternalIdRepository } from "../../../convention/adapters/PgConventionExternalIdRepository";
import { PgConventionQueries } from "../../../convention/adapters/PgConventionQueries";
import { PgConventionRepository } from "../../../convention/adapters/PgConventionRepository";
import { PgConventionsToSyncRepository } from "../../../convention/adapters/PgConventionsToSyncRepository";
import { PgNpsRepository } from "../../../convention/adapters/PgNpsRepository";
import { PgDeletedEstablishmentRepository } from "../../../establishment/adapters/PgDeletedEstablishmentRepository";
import { PgDiscussionRepository } from "../../../establishment/adapters/PgDiscussionRepository";
import { PgEstablishmentAggregateRepository } from "../../../establishment/adapters/PgEstablishmentAggregateRepository";
import { PgEstablishmentLeadQueries } from "../../../establishment/adapters/PgEstablishmentLeadQueries";
import { PgEstablishmentLeadRepository } from "../../../establishment/adapters/PgEstablishmentLeadRepository";
import { PgGroupRepository } from "../../../establishment/adapters/PgGroupRepository";
import { PgSearchMadeRepository } from "../../../establishment/adapters/PgSearchMadeRepository";
import { PgEstablishmentMarketingRepository } from "../../../marketing/adapters/PgEstablishmentMarketingRepository";
import { PgApiConsumerRepository } from "../../api-consumer/adapters/PgApiConsumerRepository";
import { PgConventionFranceTravailAdvisorRepository } from "../../authentication/ft-connect/adapters/PgConventionFranceTravailAdvisorRepository";
import { PgOngoingOAuthRepository } from "../../authentication/inclusion-connect/adapters/PgOngoingOAuthRepository";
import { PgUserRepository } from "../../authentication/inclusion-connect/adapters/PgUserRepository";
import { PgOutboxQueries } from "../../events/adapters/PgOutboxQueries";
import { PgOutboxRepository } from "../../events/adapters/PgOutboxRepository";
import { PgFeatureFlagRepository } from "../../feature-flags/adapters/PgFeatureFlagRepository";
import { PgNafRepository } from "../../naf/adapters/PgNafRepository";
import { PgNotificationRepository } from "../../notifications/adapters/PgNotificationRepository";
import { PgRomeRepository } from "../../rome/adapters/PgRomeRepository";
import { PgBroadcastFeedbacksRepository } from "../../saved-errors/adapters/PgBroadcastFeedbacksRepository";
import { PgShortLinkRepository } from "../../short-link/adapters/short-link-repository/PgShortLinkRepository";
import { PgStatisticQueries } from "../../statistics/adapters/PgStatisticQueries";
import { UnitOfWork } from "../ports/UnitOfWork";

export const createPgUow = (transaction: KyselyDb): UnitOfWork => {
  const shortLinkRepository = new PgShortLinkRepository(transaction);
  return {
    agencyRepository: new PgAgencyRepository(transaction),
    agencyGroupRepository: new PgAgencyGroupRepository(transaction),
    apiConsumerRepository: new PgApiConsumerRepository(transaction),
    userRepository: new PgUserRepository(transaction),
    conventionFranceTravailAdvisorRepository:
      new PgConventionFranceTravailAdvisorRepository(transaction),
    conventionExternalIdRepository: new PgConventionExternalIdRepository(
      transaction,
    ),
    conventionQueries: new PgConventionQueries(transaction),
    conventionRepository: new PgConventionRepository(transaction),
    conventionsToSyncRepository: new PgConventionsToSyncRepository(transaction),
    delegationContactRepository: new PgDelegationContactRepository(transaction),
    deletedEstablishmentRepository: new PgDeletedEstablishmentRepository(
      transaction,
    ),
    discussionRepository: new PgDiscussionRepository(transaction),
    broadcastFeedbacksRepository: new PgBroadcastFeedbacksRepository(
      transaction,
    ),
    establishmentAggregateRepository: new PgEstablishmentAggregateRepository(
      transaction,
    ),
    establishmentLeadRepository: new PgEstablishmentLeadRepository(transaction),
    establishmentLeadQueries: new PgEstablishmentLeadQueries(transaction),
    groupRepository: new PgGroupRepository(transaction),
    featureFlagRepository: new PgFeatureFlagRepository(transaction),
    assessmentRepository: new PgAssessmentRepository(transaction),
    npsRepository: new PgNpsRepository(transaction),
    notificationRepository: new PgNotificationRepository(transaction),
    ongoingOAuthRepository: new PgOngoingOAuthRepository(transaction),
    outboxQueries: new PgOutboxQueries(transaction),
    outboxRepository: new PgOutboxRepository(transaction),
    romeRepository: new PgRomeRepository(transaction),
    searchMadeRepository: new PgSearchMadeRepository(transaction),
    establishmentMarketingRepository: new PgEstablishmentMarketingRepository(
      transaction,
    ),
    shortLinkQuery: shortLinkRepository,
    shortLinkRepository,
    statisticQueries: new PgStatisticQueries(transaction),
    nafRepository: new PgNafRepository(transaction),
  };
};
