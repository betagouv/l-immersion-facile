import { AbsoluteUrl, ShortLinkId, absoluteUrlSchema, castError } from "shared";
import { KyselyDb } from "../../../../../config/pg/kysely/kyselyUtils";
import { createLogger } from "../../../../../utils/logger";
import { ShortLinkQuery } from "../../ports/ShortLinkQuery";

const logger = createLogger(__filename);

export class PgShortLinkQuery implements ShortLinkQuery {
  constructor(protected transaction: KyselyDb) {}

  public getById(shortLinkId: ShortLinkId): Promise<AbsoluteUrl> {
    logger.info({ message: `PgShortLinkQueryGetById ${shortLinkId}` });
    return this.transaction
      .selectFrom("short_links")
      .where("short_link_id", "=", shortLinkId)
      .select(["short_link_id", "url"])
      .executeTakeFirst()
      .then((result) => {
        if (!result)
          throw new Error(shortLinkIdNotFoundErrorMessage(shortLinkId));
        logger.info({
          message: `PgShortLinkQueryGetByIdSuccess ${result.short_link_id}`,
        });
        return absoluteUrlSchema.parse(result.url);
      })
      .catch((error) => {
        logger.error({
          error: castError(error),
          message: "PgShortLinkQueryGetByIdError",
        });
        throw error;
      });
  }
}

export const shortLinkIdNotFoundErrorMessage = (
  shortLinkId: ShortLinkId,
): string => `ShortLinkId '${shortLinkId}' not found.`;
