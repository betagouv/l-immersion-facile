import { subHours } from "date-fns";
import { Pool } from "pg";
import {
  EmailAttachment,
  EmailNotification,
  Notification,
  SmsNotification,
  TemplatedEmail,
  TemplatedSms,
  expectToEqual,
} from "shared";
import {
  KyselyDb,
  makeKyselyDb,
} from "../../../../config/pg/kysely/kyselyUtils";
import { getTestPgPool } from "../../../../config/pg/pgUtils";
import { PgNotificationRepository } from "./PgNotificationRepository";

const agencyId = "aaaaaaaa-aaaa-4000-aaaa-aaaaaaaaaaaa";
const now = new Date();
const emailNotifications: EmailNotification[] = [
  {
    kind: "email",
    id: "11111111-1111-4000-1111-111111111111",
    createdAt: subHours(now, 2).toISOString(),
    followedIds: { agencyId },
    templatedContent: {
      replyTo: { email: "yolo@mail.com", name: "Yolo" },
      kind: "AGENCY_WAS_ACTIVATED",
      recipients: ["bob@mail.com"],
      cc: [],
      params: {
        agencyName: "My agency",
        agencyLogoUrl: "http://logo.com",
        refersToOtherAgency: false,
        agencyReferdToName: undefined,
        users: [
          {
            firstName: "Jean",
            lastName: "Dupont",
            email: "jean-dupont@gmail.com",
            agencyName: "Agence du Grand Est",
            isNotifiedByEmail: true,
            roles: ["validator"],
          },

          {
            firstName: "Jeanne",
            lastName: "Dupont",
            email: "jeanne-dupont@gmail.com",
            agencyName: "Agence du Grand Est",
            isNotifiedByEmail: true,
            roles: ["counsellor"],
          },
        ],
      },
      attachments: [
        {
          name: "myFile.pdf",
          content: "myFile content as base64",
        },
      ],
    },
  },
  {
    kind: "email",
    id: "22222222-2222-4000-2222-222222222222",
    createdAt: subHours(now, 3).toISOString(),
    followedIds: { agencyId },
    templatedContent: {
      kind: "EDIT_FORM_ESTABLISHMENT_LINK",
      recipients: ["lulu@mail.com"],
      cc: ["bob@mail.com"],
      params: {
        editFrontUrl: "http://edit-link.com",
        businessAddresses: ["24 rue des boucher 67000 strasbourg"],
        businessName: "SAS FRANCE MERGUEZ DISTRIBUTION",
      },
      attachments: [
        {
          url: "http://my-file.com",
        },
      ],
    },
  },
  {
    kind: "email",
    id: "33333333-3333-4000-3333-333333333333",
    createdAt: now.toISOString(),
    followedIds: { agencyId },
    templatedContent: {
      kind: "AGENCY_LAST_REMINDER",
      recipients: ["yo@remind.com"],
      cc: ["yala@jo.com"],
      params: {
        conventionId: "",
        agencyMagicLinkUrl: "",
        beneficiaryFirstName: "Bob",
        beneficiaryLastName: "L'éponge",
        businessName: "Essuie-tout",
      },
      attachments: undefined,
    },
  },
];

const sms: TemplatedSms = {
  kind: "FirstReminderForSignatories",
  recipientPhone: "33610101010",
  params: { shortLink: "https://short.link" },
};
const smsNotificationId = "11111111-1111-4111-1111-111111111111";
const smsNotification: Notification = {
  id: smsNotificationId,
  kind: "sms",
  createdAt: new Date("2023-01-01").toISOString(),
  followedIds: { conventionId: "cccccccc-1111-4111-1111-cccccccccccc" },
  templatedContent: sms,
};

const emailNotificationsReOrderedByDate = [
  emailNotifications[2],
  emailNotifications[0],
  emailNotifications[1],
];

const maxRetrievedNotifications = 2;

describe("PgNotificationRepository", () => {
  let pool: Pool;
  let db: KyselyDb;
  let pgNotificationRepository: PgNotificationRepository;

  beforeAll(async () => {
    pool = getTestPgPool();
    db = makeKyselyDb(pool);
  });

  beforeEach(async () => {
    pgNotificationRepository = new PgNotificationRepository(
      db,
      maxRetrievedNotifications,
    );

    await db.deleteFrom("notifications_sms").executeTakeFirst();
    await db.deleteFrom("notifications_email_recipients").executeTakeFirst();
    await db.deleteFrom("notifications_email_attachments").executeTakeFirst();
    await db.deleteFrom("notifications_email").executeTakeFirst();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("save", () => {
    it("saves Sms notification in a dedicated table, then gets it", async () => {
      await pgNotificationRepository.save(smsNotification);

      const response = await pgNotificationRepository.getByIdAndKind(
        smsNotificationId,
        "sms",
      );
      expect(response).toEqual(smsNotification);
    });

    it("saves Email notification in a dedicated table, then gets it", async () => {
      const { id, emailNotification } = createTemplatedEmailAndNotification({
        recipients: ["bob@mail.com", "jane@mail.com"],
        cc: ["copy@mail.com"],
        sender: {
          email: "recette@immersion-facile.beta.gouv.fr",
          name: "Recette Immersion Facile",
        },
      });

      await pgNotificationRepository.save(emailNotification);

      const response = await pgNotificationRepository.getByIdAndKind(
        id,
        "email",
      );
      expect(response).toEqual(emailNotification);
    });

    it("save and eliminates duplicates when they exit", async () => {
      const recipients = ["bob@mail.com", "jane@mail.com", "bob@mail.com"];
      const cc = ["copy@mail.com", "jane@mail.com"];
      const { id, emailNotification } = createTemplatedEmailAndNotification({
        recipients,
        cc,
        sender: {
          email: "recette@immersion-facile.beta.gouv.fr",
          name: "Recette Immersion Facile",
        },
      });

      await pgNotificationRepository.save(emailNotification);

      const response = await pgNotificationRepository.getByIdAndKind(
        id,
        "email",
      );
      expect(response).toEqual({
        ...emailNotification,
        templatedContent: {
          ...emailNotification.templatedContent,
          recipients: ["bob@mail.com", "jane@mail.com"],
          cc: ["copy@mail.com"],
        },
      });
    });

    it("save and eliminates duplicates when cc ends up empty after de-duplication", async () => {
      const { id, emailNotification } = createTemplatedEmailAndNotification({
        recipients: ["bob@mail.com"],
        cc: ["bob@mail.com"],
        sender: {
          email: "recette@immersion-facile.beta.gouv.fr",
          name: "Recette Immersion Facile",
        },
      });

      await pgNotificationRepository.save(emailNotification);

      const response = await pgNotificationRepository.getByIdAndKind(
        id,
        "email",
      );
      expect(response).toEqual({
        ...emailNotification,
        templatedContent: {
          ...emailNotification.templatedContent,
          recipients: ["bob@mail.com"],
          cc: [],
        },
      });
    });
  });

  describe("saveBatch", () => {
    it("saves a batch of notifications", async () => {
      await pgNotificationRepository.saveBatch([
        ...emailNotifications,
        smsNotification,
      ]);

      const response = (await pgNotificationRepository.getLastNotifications())
        .emails;
      expectToEqual(
        response,
        emailNotificationsReOrderedByDate.slice(0, maxRetrievedNotifications),
      );

      const smsResponse = await pgNotificationRepository.getByIdAndKind(
        smsNotificationId,
        "sms",
      );
      expect(smsResponse).toEqual(smsNotification);
    });
  });

  describe("getEmailsByIds", () => {
    it("returns [] when no ids are provided", async () => {
      const response = await pgNotificationRepository.getEmailsByIds([]);
      expectToEqual(response, []);
    });

    it("returns the emails notifications with the provided ids", async () => {
      await Promise.all(
        emailNotifications.map((notif) => pgNotificationRepository.save(notif)),
      );
      const response = await pgNotificationRepository.getEmailsByIds([
        emailNotifications[0].id,
        emailNotifications[1].id,
      ]);
      expectToEqual(response, [emailNotifications[0], emailNotifications[1]]);
    });
  });

  describe("getSmsByIds", () => {
    it("returns [] when no ids are provided", async () => {
      const response = await pgNotificationRepository.getSmsByIds([]);
      expectToEqual(response, []);
    });

    it("returns the sms notifications with the provided ids", async () => {
      await pgNotificationRepository.save(smsNotification);
      const response = await pgNotificationRepository.getSmsByIds([
        smsNotification.id,
      ]);
      expectToEqual(response, [smsNotification]);
    });
  });

  describe("getLatestNotifications", () => {
    it("gets the last notifications of each kind, up to the provided maximum", async () => {
      const smsNotifications: SmsNotification[] = [
        {
          kind: "sms",
          id: "77777777-7777-4000-7777-777777777777",
          createdAt: subHours(new Date(), 4).toISOString(),
          templatedContent: {
            kind: "FirstReminderForSignatories",
            recipientPhone: "33610101010",
            params: { shortLink: "https://short.com" },
          },
          followedIds: {},
        },
      ];

      await Promise.all(
        [...emailNotifications, ...smsNotifications].map((notif) =>
          pgNotificationRepository.save(notif),
        ),
      );

      const notifications =
        await pgNotificationRepository.getLastNotifications();
      expectToEqual(notifications, {
        emails: emailNotificationsReOrderedByDate.slice(
          0,
          maxRetrievedNotifications,
        ),
        sms: smsNotifications,
      });
    });
  });

  describe("deleteAllAttachements", () => {
    it("remove all the attachment content, but keeps the metadata (attachement exited, name of file)", async () => {
      const { emailNotification } = createTemplatedEmailAndNotification({
        recipients: ["bob@mail.com"],
        sender: {
          email: "recette@immersion-facile.beta.gouv.fr",
          name: "Recette Immersion Facile",
        },
        cc: [],
        attachments: [
          { name: "myFile.pdf", content: "myFile content as base64" },
        ],
      });

      await pgNotificationRepository.save(emailNotification);

      const { emailNotification: emailNotificationWithUrlAttachment } =
        createTemplatedEmailAndNotification({
          id: "33333333-3333-4444-3333-333333333333",
          recipients: ["bob@mail.com"],
          sender: {
            email: "recette@immersion-facile.beta.gouv.fr",
            name: "Recette Immersion Facile",
          },
          cc: [],
          attachments: [{ url: "www.truc.com" }],
        });

      await pgNotificationRepository.save(emailNotificationWithUrlAttachment);

      const numberOfUpdatedRows =
        await pgNotificationRepository.deleteAllEmailAttachements();

      expect(numberOfUpdatedRows).toBe(1);

      expectToEqual(await pgNotificationRepository.getLastNotifications(), {
        sms: [],
        emails: [
          emailNotificationWithUrlAttachment,
          {
            ...emailNotification,
            templatedContent: {
              ...emailNotification.templatedContent,
              attachments: [
                {
                  // biome-ignore lint/style/noNonNullAssertion:
                  ...emailNotification.templatedContent.attachments![0],
                  content: "deleted-content",
                },
              ],
            },
          },
        ],
      });
    });
  });

  describe("getConventionIdWithoutNotifications", () => {
    const conventionId = "cccccccc-1111-4111-1111-cccccccccccc";
    beforeEach(async () => {
      const emailNotification: EmailNotification = {
        kind: "email",
        id: "22222222-2222-4000-2222-222222222222",
        createdAt: subHours(now, 3).toISOString(),
        followedIds: { agencyId, conventionId },
        templatedContent: {
          kind: "SIGNATORY_FIRST_REMINDER",
          recipients: ["lulu@mail.com"],
          cc: ["bob@mail.com"],
          params: {
            actorFirstName: "firstname",
            actorLastName: "lastname",
            beneficiaryFirstName: "John",
            beneficiaryLastName: "Doe",
            businessName: "Lulu et cie",
            conventionId,
            magicLinkUrl: "http://magiclink",
            signatoriesSummary: "",
          },
          attachments: [
            {
              url: "http://my-file.com",
            },
          ],
        },
      };
      const smsNotification: SmsNotification = {
        id: smsNotificationId,
        kind: "sms",
        createdAt: new Date("2023-01-01").toISOString(),
        followedIds: { conventionId: conventionId },
        templatedContent: sms,
      };
      await pgNotificationRepository.save(emailNotification);
      await pgNotificationRepository.save(smsNotification);
    });

    it("should get 0 convention that has no email SIGNATORY_FIRST_REMINDER notification", async () => {
      const conventionIds =
        await pgNotificationRepository.getConventionIdsWithoutNotifications({
          emailType: "SIGNATORY_FIRST_REMINDER",
          conventionIds: [conventionId],
        });

      expect(conventionIds.length).toBe(0);
    });

    it("should get 0 convention that has no sms FirstReminderForSignatories notification", async () => {
      const conventionIds =
        await pgNotificationRepository.getConventionIdsWithoutNotifications({
          smsType: "FirstReminderForSignatories",
          conventionIds: [conventionId],
        });

      expect(conventionIds.length).toBe(0);
    });

    it("should get 1 convention that has no email NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION notification", async () => {
      const conventionIds =
        await pgNotificationRepository.getConventionIdsWithoutNotifications({
          emailType: "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
          conventionIds: [conventionId],
        });

      expect(conventionIds).toEqual([conventionId]);
    });

    it("should get 1 convention that has no sms LastReminderForSignatories notification", async () => {
      const conventionIds =
        await pgNotificationRepository.getConventionIdsWithoutNotifications({
          smsType: "LastReminderForSignatories",
          conventionIds: [conventionId],
        });

      expect(conventionIds).toEqual([conventionId]);
    });

    it("should get 1 convention that has an no sms nor email notification", async () => {
      const conventionIds =
        await pgNotificationRepository.getConventionIdsWithoutNotifications({
          smsType: "LastReminderForSignatories",
          emailType: "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
          conventionIds: [conventionId],
        });

      expect(conventionIds).toEqual([conventionId]);
    });
  });
});

const createTemplatedEmailAndNotification = ({
  recipients,
  cc,
  sender,
  attachments,
  id,
}: {
  recipients: string[];
  cc?: string[];
  sender: {
    email: string;
    name: string;
  };
  attachments?: EmailAttachment[];
  id?: string;
}) => {
  const email: TemplatedEmail = {
    kind: "AGENCY_WAS_ACTIVATED",
    recipients,
    sender,
    cc,
    params: {
      agencyName: "My agency",
      agencyLogoUrl: "https://my-logo.com",
      refersToOtherAgency: false,
      agencyReferdToName: undefined,
      users: [
        {
          firstName: "Jean",
          lastName: "Dupont",
          email: "jean-dupont@gmail.com",
          agencyName: "Agence du Grand Est",
          isNotifiedByEmail: true,
          roles: ["validator"],
        },

        {
          firstName: "Jeanne",
          lastName: "Dupont",
          email: "jeanne-dupont@gmail.com",
          agencyName: "Agence du Grand Est",
          isNotifiedByEmail: true,
          roles: ["counsellor"],
        },
      ],
    },
    attachments,
  };

  const emailNotification: Notification = {
    id: id ?? "22222222-2222-4444-2222-222222222222",
    kind: "email",
    createdAt: subHours(new Date(), 1).toISOString(),
    followedIds: { agencyId: "cccccccc-1111-4111-1111-cccccccccccc" },
    templatedContent: email,
  };

  return {
    id: emailNotification.id,
    emailNotification,
  };
};
