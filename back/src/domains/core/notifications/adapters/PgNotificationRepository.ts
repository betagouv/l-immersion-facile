import { sql } from "kysely";
import { difference, map, uniq } from "ramda";
import {
  ConventionId,
  EmailNotification,
  EmailType,
  Notification,
  NotificationId,
  NotificationKind,
  NotificationsByKind,
  SmsNotification,
  SmsTemplateByName,
  TemplatedEmail,
  TemplatedSms,
  exhaustiveCheck,
  pipeWithValue,
} from "shared";
import {
  KyselyDb,
  jsonBuildObject,
  jsonStripNulls,
} from "../../../../config/pg/kysely/kyselyUtils";
import { NotificationRepository } from "../ports/NotificationRepository";

export class PgNotificationRepository implements NotificationRepository {
  constructor(
    private transaction: KyselyDb,
    private maxRetrievedNotifications = 30,
  ) {}

  public async getConventionIdsWithoutNotifications({
    emailType,
    smsType,
    conventionIds,
  }: {
    emailType?: EmailType;
    smsType?: keyof SmsTemplateByName;
    conventionIds: ConventionId[];
  }): Promise<ConventionId[]> {
    const smsResults =
      smsType && conventionIds.length > 0
        ? await this.transaction
            .selectFrom("notifications_sms")
            .select("notifications_sms.convention_id")
            .where("notifications_sms.sms_kind", "=", smsType)
            .where("notifications_sms.convention_id", "in", conventionIds)
            .execute()
        : [];
    const conventionIdsWithSms = smsResults
      .map((item) => item.convention_id)
      .filter((id): id is ConventionId => id !== null);
    const emailResults =
      emailType && conventionIds.length > 0
        ? await this.transaction
            .selectFrom("notifications_email")
            .select("notifications_email.convention_id")
            .where("notifications_email.email_kind", "=", emailType)
            .where("notifications_email.convention_id", "in", conventionIds)
            .execute()
        : [];
    const conventionIdsWithEmail = emailResults
      .map((item) => item.convention_id)
      .filter((id): id is ConventionId => id !== null);

    return difference(conventionIds, [
      ...conventionIdsWithSms,
      ...conventionIdsWithEmail,
    ]);
  }

  public async deleteAllEmailAttachements(): Promise<number> {
    const response = await this.transaction
      .updateTable("notifications_email_attachments")
      .set({
        attachment: sql`jsonb_set
            (attachment::jsonb, '{content}', '"deleted-content"')`,
      })
      .where(sql<boolean>`attachment::jsonb ->> 'content' != 'deleted-content'`)
      .executeTakeFirst();

    return Number(response.numUpdatedRows);
  }

  public async getByIdAndKind(
    id: NotificationId,
    kind: NotificationKind,
  ): Promise<Notification | undefined> {
    switch (kind) {
      case "sms":
        return this.#getSmsNotificationById(id);
      case "email":
        return this.#getEmailNotificationById(id);
      default:
        exhaustiveCheck(kind, {
          variableName: "notificationKind",
          throwIfReached: true,
        });
    }
  }

  async getSmsByIds(ids: NotificationId[]): Promise<SmsNotification[]> {
    if (!ids.length) return [];
    return getSmsNotificationBuilder(this.transaction)
      .where("id", "in", ids)
      .execute()
      .then(map((row) => row.notif));
  }

  async getEmailsByIds(ids: NotificationId[]): Promise<EmailNotification[]> {
    if (!ids.length) return [];
    return getEmailsNotificationBuilder(this.transaction)
      .where("e.id", "in", ids)
      .execute()
      .then(map((row) => row.notif));
  }

  async #getLastEmails(): Promise<EmailNotification[]> {
    const subQuery = pipeWithValue(
      this.transaction
        .selectFrom("notifications_email as e")
        .select("id")
        .groupBy("e.id")
        .orderBy("e.created_at", "desc"),
      (b) => b.limit(this.maxRetrievedNotifications),
    );

    return getEmailsNotificationBuilder(this.transaction)
      .where(
        "e.created_at",
        ">",
        sql<Date>`NOW
          ()
          - INTERVAL '2 day'`,
      )
      .where("e.id", "in", subQuery)
      .orderBy("e.created_at", "desc")
      .execute()
      .then(map((row) => row.notif));
  }

  public async getLastNotifications(): Promise<NotificationsByKind> {
    return getSmsNotificationBuilder(this.transaction)
      .where(
        "created_at",
        ">",
        sql<Date>`NOW
          ()
          - INTERVAL '2 day'`,
      )
      .limit(this.maxRetrievedNotifications)
      .execute()
      .then(async (rows) => ({
        emails: await this.#getLastEmails(),
        sms: rows.map((row) => row.notif),
      }));
  }

  public async save(notification: Notification): Promise<void> {
    switch (notification.kind) {
      case "sms":
        return this.#saveSmsNotification(notification);
      case "email": {
        const recipients = uniq(notification.templatedContent.recipients);
        return this.#saveEmailNotification({
          ...notification,
          templatedContent: {
            ...notification.templatedContent,
            recipients,
            cc: uniq(notification.templatedContent.cc ?? []).filter(
              (ccEmail) => !recipients.includes(ccEmail),
            ),
          },
        });
      }
      default:
        return exhaustiveCheck(notification, {
          variableName: "notificationKind",
          throwIfReached: true,
        });
    }
  }

  public async saveBatch(notifications: Notification[]): Promise<void> {
    const { smsNotifications, emailNotifications } = notifications.reduce(
      (acc, notification) => {
        if (notification.kind === "sms")
          return {
            ...acc,
            smsNotifications: [...acc.smsNotifications, notification],
          };

        return {
          ...acc,
          emailNotifications: [...acc.emailNotifications, notification],
        };
      },
      {
        smsNotifications: [] as SmsNotification[],
        emailNotifications: [] as EmailNotification[],
      },
    );

    await Promise.all([
      this.#saveSmsNotifications(smsNotifications),
      this.#saveEmailNotifications(emailNotifications),
    ]);
  }

  async #getSmsNotificationById(
    id: NotificationId,
  ): Promise<SmsNotification | undefined> {
    const templatedSms = await this.getSmsByIds([id]);
    return templatedSms[0];
  }

  async #saveEmailNotification(notification: EmailNotification) {
    await this.#saveEmailNotifications([notification]);
  }

  async #saveEmailNotifications(notifications: EmailNotification[]) {
    const notificationsWithDeduplicatedRecipients = notifications.map(
      (notification) => {
        const recipients = uniq(notification.templatedContent.recipients);
        return {
          ...notification,
          templatedContent: {
            ...notification.templatedContent,
            recipients,
            cc: uniq(notification.templatedContent.cc ?? []).filter(
              (ccEmail) => !recipients.includes(ccEmail),
            ),
          },
        };
      },
    );

    await this.#insertEmailNotifications(
      notificationsWithDeduplicatedRecipients,
    );
    await this.#insertEmailsRecipients(notificationsWithDeduplicatedRecipients);
    await this.#insertEmailAttachments(notificationsWithDeduplicatedRecipients);
  }

  async #saveSmsNotification(notification: SmsNotification): Promise<void> {
    await this.#saveSmsNotifications([notification]);
  }

  async #saveSmsNotifications(notifications: SmsNotification[]): Promise<void> {
    if (notifications.length === 0) return;

    await this.transaction
      .insertInto("notifications_sms")
      .values(
        notifications.map((notification) => ({
          id: notification.id,
          created_at: notification.createdAt,
          sms_kind: notification.templatedContent.kind,
          recipient_phone: notification.templatedContent.recipientPhone,
          convention_id: notification.followedIds.conventionId,
          establishment_siret: notification.followedIds.establishmentSiret,
          agency_id: notification.followedIds.agencyId,
          params: JSON.stringify(notification.templatedContent.params),
        })),
      )
      .execute();
  }

  async #insertEmailAttachments(notifications: EmailNotification[]) {
    const notificationsWithAttachments = notifications.filter(
      (notification) =>
        notification.templatedContent.attachments &&
        notification.templatedContent.attachments.length > 0,
    );
    if (!notificationsWithAttachments.length) return;

    await this.transaction
      .insertInto("notifications_email_attachments")
      .values(
        notificationsWithAttachments.flatMap((notification) =>
          (notification.templatedContent.attachments ?? []).map(
            (attachment) => ({
              notifications_email_id: notification.id,
              attachment: JSON.stringify(attachment),
            }),
          ),
        ),
      )
      .execute();
  }

  async #insertEmailsRecipients(notifications: EmailNotification[]) {
    await this.transaction
      .insertInto("notifications_email_recipients")
      .values(
        notifications.flatMap((notification) => [
          ...notification.templatedContent.recipients.map((recipient) => ({
            notifications_email_id: notification.id,
            email: recipient,
            recipient_type: "to" as const,
          })),
          ...(notification.templatedContent.cc ?? []).map((ccRecipient) => ({
            notifications_email_id: notification.id,
            email: ccRecipient,
            recipient_type: "cc" as const,
          })),
        ]),
      )
      .execute();
  }

  async #insertEmailNotifications(notifications: EmailNotification[]) {
    await this.transaction
      .insertInto("notifications_email")
      .values(
        notifications.map(
          ({ id, createdAt, followedIds, templatedContent }) => ({
            id: id,
            created_at: createdAt,
            email_kind: templatedContent.kind,
            convention_id: followedIds.conventionId,
            establishment_siret: followedIds.establishmentSiret,
            agency_id: followedIds.agencyId,
            params: JSON.stringify(templatedContent.params),
            reply_to_name: templatedContent.replyTo?.name,
            reply_to_email: templatedContent.replyTo?.email,
            sender_email: templatedContent.sender?.email,
            sender_name: templatedContent.sender?.name,
          }),
        ),
      )
      .execute();
  }

  async #getEmailNotificationById(
    id: NotificationId,
  ): Promise<EmailNotification | undefined> {
    const emails = await this.getEmailsByIds([id]);
    return emails[0];
  }
}

const getSmsNotificationBuilder = (transaction: KyselyDb) =>
  transaction.selectFrom("notifications_sms").select(({ ref }) =>
    jsonStripNulls(
      jsonBuildObject({
        id: ref("id"),
        kind: sql<"sms">`'sms'`,
        createdAt: sql<string>`TO_CHAR
            (created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
        followedIds: jsonBuildObject({
          conventionId: ref("convention_id"),
          establishmentId: ref("establishment_siret"),
          agencyId: ref("agency_id"),
        }),
        templatedContent: jsonBuildObject({
          kind: ref("sms_kind"),
          recipientPhone: ref("recipient_phone"),
          params: ref("params"),
        }).$castTo<TemplatedSms>(),
      }),
    ).as("notif"),
  );

const getEmailsNotificationBuilder = (transaction: KyselyDb) =>
  transaction
    .selectFrom("notifications_email as e")
    .innerJoin(
      "notifications_email_recipients as r",
      "r.notifications_email_id",
      "e.id",
    )
    .leftJoin(
      "notifications_email_attachments as a",
      "a.notifications_email_id",
      "e.id",
    )
    .groupBy("e.id")
    .select(({ ref, eb }) =>
      jsonStripNulls(
        jsonBuildObject({
          id: ref("e.id"),
          kind: sql<"email">`'email'`,
          createdAt: sql<string>`TO_CHAR
              (created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
          followedIds: jsonBuildObject({
            conventionId: ref("convention_id"),
            establishmentId: ref("establishment_siret"),
            agencyId: ref("agency_id"),
          }),
          templatedContent: jsonBuildObject({
            kind: ref("email_kind"),
            replyTo: eb
              .case()
              .when(ref("reply_to_email"), "is", null)
              .then(null)
              .else(
                jsonBuildObject({
                  name: ref("reply_to_name"),
                  email: ref("reply_to_email"),
                }),
              )
              .end(),
            recipients: sql`ARRAY_REMOVE
            (ARRAY_AGG(CASE WHEN r.recipient_type = 'to' THEN r.email ELSE NULL END), NULL)`,
            cc: sql`ARRAY_REMOVE
            (ARRAY_AGG(CASE WHEN r.recipient_type = 'cc' THEN r.email ELSE NULL END), NULL)`,
            params: ref("params").$castTo<any>(),
            sender: eb
              .case()
              .when(ref("sender_email"), "is", null)
              .then(null)
              .else(
                jsonBuildObject({
                  name: ref("sender_name"),
                  email: ref("sender_email"),
                }),
              )
              .end(),
            attachments: sql`CASE
                  WHEN ARRAY_REMOVE(ARRAY_AGG(DISTINCT a.attachment), NULL) = ARRAY[]::jsonb[]
                    THEN NULL
                  ELSE ARRAY_REMOVE(ARRAY_AGG(DISTINCT a.attachment), NULL)
            END`,
          }).$castTo<TemplatedEmail>(),
        }),
      ).as("notif"),
    );
