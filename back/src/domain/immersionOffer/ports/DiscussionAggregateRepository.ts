import { SiretDto } from "shared";
import {
  DiscussionAggregate,
  DiscussionId,
} from "../entities/DiscussionAggregate";

export interface DiscussionAggregateRepository {
  insert: (discussionAggregate: DiscussionAggregate) => Promise<void>;
  update: (discussionAggregate: DiscussionAggregate) => Promise<void>;
  getById: (
    discussionId: DiscussionId,
  ) => Promise<DiscussionAggregate | undefined>;
  countDiscussionsForSiretSince: (
    siret: SiretDto,
    since: Date,
  ) => Promise<number>;
}
