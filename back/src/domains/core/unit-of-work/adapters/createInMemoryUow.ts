import { InMemoryAuthenticatedUserRepository } from "../../../../adapters/secondary/InMemoryAuthenticatedUserRepository";
import { InMemoryConventionPoleEmploiAdvisorRepository } from "../../../../adapters/secondary/InMemoryConventionPoleEmploiAdvisorRepository";
import { InMemoryDeletedEstablishmentRepository } from "../../../../adapters/secondary/InMemoryDeletedEstablishmentRepository";
import { InMemoryEstablishmentLeadQueries } from "../../../../adapters/secondary/InMemoryEstablishmentLeadQueries";
import { InMemoryFormEstablishmentRepository } from "../../../../adapters/secondary/InMemoryFormEstablishmentRepository";
import { InMemoryInclusionConnectedUserRepository } from "../../../../adapters/secondary/InMemoryInclusionConnectedUserRepository";
import { InMemoryNotificationRepository } from "../../../../adapters/secondary/InMemoryNotificationRepository";
import { InMemoryOngoingOAuthRepository } from "../../../../adapters/secondary/InMemoryOngoingOAuthRepository";
import { InMemoryRomeRepository } from "../../../../adapters/secondary/InMemoryRomeRepository";
import { InMemoryDiscussionAggregateRepository } from "../../../../adapters/secondary/offer/InMemoryDiscussionAggregateRepository";
import { InMemoryEstablishmentAggregateRepository } from "../../../../adapters/secondary/offer/InMemoryEstablishmentAggregateRepository";
import { InMemoryEstablishmentLeadRepository } from "../../../../adapters/secondary/offer/InMemoryEstablishmentLeadRepository";
import { InMemoryGroupRepository } from "../../../../adapters/secondary/offer/InMemoryGroupRepository";
import { InMemorySearchMadeRepository } from "../../../../adapters/secondary/offer/InMemorySearchMadeRepository";
import { InMemoryAgencyGroupRepository } from "../../../agency/adapters/InMemoryAgencyGroupRepository";
import { InMemoryAgencyRepository } from "../../../agency/adapters/InMemoryAgencyRepository";
import { InMemoryAssessmentRepository } from "../../../convention/adapters/InMemoryAssessmentRepository";
import { InMemoryConventionExternalIdRepository } from "../../../convention/adapters/InMemoryConventionExternalIdRepository";
import { InMemoryConventionQueries } from "../../../convention/adapters/InMemoryConventionQueries";
import { InMemoryConventionRepository } from "../../../convention/adapters/InMemoryConventionRepository";
import { InMemoryConventionsToSyncRepository } from "../../../convention/adapters/InMemoryConventionsToSyncRepository";
import { InMemoryApiConsumerRepository } from "../../api-consumer/adapters/InMemoryApiConsumerRepository";
import { InMemoryOutboxQueries } from "../../events/adapters/InMemoryOutboxQueries";
import { InMemoryOutboxRepository } from "../../events/adapters/InMemoryOutboxRepository";
import { InMemoryFeatureFlagRepository } from "../../feature-flags/adapters/InMemoryFeatureFlagRepository";
import { InMemorySavedErrorRepository } from "../../saved-errors/adapters/InMemorySavedErrorRepository";
import { InMemoryShortLinkRepository } from "../../short-link/adapters/short-link-repository/InMemoryShortLinkRepository";
import { UnitOfWork } from "../ports/UnitOfWork";

export const createInMemoryUow = () => {
  const outboxRepository = new InMemoryOutboxRepository();
  const outboxQueries = new InMemoryOutboxQueries(outboxRepository);
  const agencyRepository = new InMemoryAgencyRepository();
  const conventionRepository = new InMemoryConventionRepository();
  const conventionQueries = new InMemoryConventionQueries(
    conventionRepository,
    agencyRepository,
    outboxRepository,
  );
  const authenticatedUserRepository = new InMemoryAuthenticatedUserRepository();
  const shortLinkRepository = new InMemoryShortLinkRepository();
  const establishmentLeadRepository = new InMemoryEstablishmentLeadRepository();

  return {
    agencyRepository,
    agencyGroupRepository: new InMemoryAgencyGroupRepository(),
    apiConsumerRepository: new InMemoryApiConsumerRepository(),
    authenticatedUserRepository,
    conventionQueries,
    conventionRepository,
    conventionPoleEmploiAdvisorRepository:
      new InMemoryConventionPoleEmploiAdvisorRepository(),
    conventionsToSyncRepository: new InMemoryConventionsToSyncRepository(),
    discussionAggregateRepository: new InMemoryDiscussionAggregateRepository(),
    establishmentAggregateRepository:
      new InMemoryEstablishmentAggregateRepository(),
    groupRepository: new InMemoryGroupRepository(),
    errorRepository: new InMemorySavedErrorRepository(),
    featureFlagRepository: new InMemoryFeatureFlagRepository(),
    formEstablishmentRepository: new InMemoryFormEstablishmentRepository(),
    assessmentRepository: new InMemoryAssessmentRepository(),
    inclusionConnectedUserRepository:
      new InMemoryInclusionConnectedUserRepository(authenticatedUserRepository),
    establishmentLeadRepository,
    establishmentLeadQueries: new InMemoryEstablishmentLeadQueries(
      establishmentLeadRepository,
      conventionQueries,
    ),
    notificationRepository: new InMemoryNotificationRepository(),
    ongoingOAuthRepository: new InMemoryOngoingOAuthRepository(),
    outboxRepository,
    outboxQueries,
    romeRepository: new InMemoryRomeRepository(),
    searchMadeRepository: new InMemorySearchMadeRepository(),
    shortLinkQuery: shortLinkRepository,
    shortLinkRepository,
    deletedEstablishmentRepository:
      new InMemoryDeletedEstablishmentRepository(),
    conventionExternalIdRepository:
      new InMemoryConventionExternalIdRepository(),
  } satisfies UnitOfWork;
};

export type InMemoryUnitOfWork = ReturnType<typeof createInMemoryUow>;
