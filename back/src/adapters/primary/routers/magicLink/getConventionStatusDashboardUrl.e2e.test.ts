import {
  ConventionDtoBuilder,
  conventionMagicLinkTargets,
  createConventionMagicLinkPayload,
} from "shared";
import { buildTestApp } from "../../../../_testBuilders/buildTestApp";

describe("getConventionStatusDashboardUrl", () => {
  it("fails if token does not match convention id", async () => {
    const { request } = await buildTestApp();
    const response = await request.get("/auth/statut-convention");
    expect(response.status).toBe(401);
  });

  it("gets the dashboard url if token is correct", async () => {
    const { request, generateConventionJwt, inMemoryUow } =
      await buildTestApp();
    const conventionId = "my-Convention-id";
    const beneficiaryEmail = "joe@lebenef.fr";
    const jwt = generateConventionJwt(
      createConventionMagicLinkPayload({
        id: conventionId,
        role: "beneficiary",
        email: beneficiaryEmail,
        now: new Date(),
      }),
    );

    const convention = new ConventionDtoBuilder()
      .withId(conventionId)
      .withStatus("READY_TO_SIGN")
      .withBeneficiaryEmail(beneficiaryEmail)
      .build();

    inMemoryUow.conventionRepository.setConventions({
      [convention.id]: convention,
    });

    const response = await request
      .get(conventionMagicLinkTargets.getConventionStatusDashboard.url)
      .set("Authorization", jwt);

    expect(response.status).toBe(200);
    expect(response.body).toBe(
      `http://stubConventionStatusDashboard/${convention.id}`,
    );
  });
});
