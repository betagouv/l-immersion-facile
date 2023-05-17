import { AgencyDtoBuilder } from "shared";
import { InMemoryNotificationGateway } from "../../../adapters/secondary/notificationGateway/InMemoryNotificationGateway";
import { SendEmailWhenAgencyIsActivated } from "../../../domain/convention/useCases/SendEmailWhenAgencyIsActivated";

describe("SendEmailWhenAgencyIsActivated", () => {
  it("Sends an email to validators with agency name", async () => {
    // Prepare
    const notificationGateway = new InMemoryNotificationGateway();
    const useCase = new SendEmailWhenAgencyIsActivated(notificationGateway);
    const updatedAgency = AgencyDtoBuilder.create()
      .withValidatorEmails(["toto@email.com"])
      .withName("just-activated-agency")
      .build();

    // Act
    await useCase.execute({ agency: updatedAgency });

    // Assert
    const sentEmails = notificationGateway.getSentEmails();
    expect(sentEmails).toHaveLength(1);

    expect(sentEmails[0].type).toBe("AGENCY_WAS_ACTIVATED");
    expect(sentEmails[0].params).toEqual({
      agencyName: "just-activated-agency",
    });
    expect(sentEmails[0].recipients).toEqual(["toto@email.com"]);
  });
});
