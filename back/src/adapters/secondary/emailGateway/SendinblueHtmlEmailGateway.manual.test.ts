import { AppConfig } from "../../primary/config/appConfig";
import { configureCreateHttpClientForExternalApi } from "../../primary/config/createGateways";
import { SendinblueHtmlEmailGateway } from "./SendinblueHtmlEmailGateway";
import { sendinblueHtmlEmailGatewayTargets } from "./SendinblueHtmlEmailGateway.targets";

describe("SendingBlueHtmlEmailGateway manual", () => {
  let sibGateway: SendinblueHtmlEmailGateway;

  beforeEach(() => {
    const config = AppConfig.createFromEnv();
    sibGateway = new SendinblueHtmlEmailGateway(
      configureCreateHttpClientForExternalApi()(
        sendinblueHtmlEmailGatewayTargets,
      ),
      (_) => true,
      config.apiKeySendinblue,
      { email: "bob@fake.mail", name: "Bob" },
    );
  });

  it("should send email correctly", async () => {
    await sibGateway.sendEmail({
      type: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE",
      recipients: ["recette@immersion-facile.beta.gouv.fr"],
      params: {
        internshipKind: "immersion",
        magicLink: "www.google.com",
        conventionStatusLink: "www.google.com",
        businessName: "Super Corp",
        establishmentRepresentativeName: "Stéphane Le Rep",
        establishmentTutorName: "Joe le tuteur",
        beneficiaryName: "John Doe",
        signatoryName: "John Doe",
        agencyLogoUrl: "http://toto",
      },
    });

    // Please check emails has been received at recette@immersion-facile.beta.gouv.fr
    expect("reached").toBe("reached");
  });
});
