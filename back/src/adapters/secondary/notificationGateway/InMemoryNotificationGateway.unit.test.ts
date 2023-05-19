import { expectArraysToMatch, TemplatedEmail } from "shared";
import { CustomTimeGateway } from "../core/TimeGateway/CustomTimeGateway";
import { InMemoryNotificationGateway } from "./InMemoryNotificationGateway";

describe("In memory NotificationGateway", () => {
  let timeGateway: CustomTimeGateway;

  beforeEach(() => {
    timeGateway = new CustomTimeGateway();
  });

  it("should be able to retrieve last emails sent in order", async () => {
    const inMemoryNotificationGateway = new InMemoryNotificationGateway(
      timeGateway,
      5,
    );
    const secondDateIso = "2022-02-02T14:00:00.000Z";
    const secondTemplatedEmail: TemplatedEmail = {
      type: "SUGGEST_EDIT_FORM_ESTABLISHMENT",
      recipients: ["establishment-ceo-second@gmail.com"],
      params: { editFrontUrl: "plop-second" },
    };
    timeGateway.setNextDate(new Date(secondDateIso));
    await inMemoryNotificationGateway.sendEmail(secondTemplatedEmail);

    const firstDateIso = "2022-01-01T12:00:00.000Z";
    const firstTemplatedEmail: TemplatedEmail = {
      type: "SUGGEST_EDIT_FORM_ESTABLISHMENT",
      recipients: ["establishment-ceo@gmail.com"],
      params: { editFrontUrl: "plop" },
    };
    timeGateway.setNextDate(new Date(firstDateIso));
    await inMemoryNotificationGateway.sendEmail(firstTemplatedEmail);

    await expectArraysToMatch(
      inMemoryNotificationGateway.getLastSentEmailDtos(),
      [
        {
          sentAt: secondDateIso,
          templatedEmail: secondTemplatedEmail,
        },
        {
          sentAt: firstDateIso,
          templatedEmail: firstTemplatedEmail,
        },
      ],
    );
  });

  it("should be able to retrieve at most the given maximum of emails", async () => {
    const inMemoryNotificationGateway = new InMemoryNotificationGateway(
      timeGateway,
      1,
    );
    timeGateway.setNextDate(new Date("2022-01-01T12:00:00.000Z"));
    await inMemoryNotificationGateway.sendEmail({
      type: "SUGGEST_EDIT_FORM_ESTABLISHMENT",
      recipients: ["establishment-ceo@gmail.com"],
      params: { editFrontUrl: "plop" },
    });
    await inMemoryNotificationGateway.sendEmail({
      type: "SUGGEST_EDIT_FORM_ESTABLISHMENT",
      recipients: ["other-ceo@gmail.com"],
      params: { editFrontUrl: "other-mail" },
    });

    const sentEmails = inMemoryNotificationGateway.getLastSentEmailDtos();
    expect(sentEmails).toHaveLength(1);
    await expectArraysToMatch(sentEmails, [
      {
        sentAt: "2022-01-01T12:00:00.000Z",
        templatedEmail: {
          params: {
            editFrontUrl: "other-mail",
          },
          recipients: ["other-ceo@gmail.com"],
          type: "SUGGEST_EDIT_FORM_ESTABLISHMENT",
        },
      },
    ]);
  });
});
