import { AbsoluteUrl, ShortLinkId } from "shared";
import { z } from "zod";
import { KyselyDb } from "../../../../config/pg/kysely/kyselyUtils";

export type PgShortLinkRepositoryDto = {
  short_link_id: string;
  url: string;
  created_at: Date;
};

export const pgShortLinkRepositorySchema: z.Schema<PgShortLinkRepositoryDto> =
  z.object({
    short_link_id: z.string().nonempty(),
    url: z.string().url(),
    created_at: z.date(),
  });

export const insertShortLinkQuery = async (
  db: KyselyDb,
  shortLinkId: ShortLinkId,
  url: AbsoluteUrl,
): Promise<void> => {
  await db
    .insertInto("short_links")
    .values({
      short_link_id: shortLinkId,
      url,
    })
    .execute();
};

export const getAllShortLinks = async (db: KyselyDb) =>
  db.selectFrom("short_links").selectAll().execute();

export const deleteShortLinkById = async (
  transaction: KyselyDb,
  shortLinkId: ShortLinkId,
): Promise<void> => {
  await transaction
    .deleteFrom("short_links")
    .where("short_link_id", "=", shortLinkId)
    .execute();
};
