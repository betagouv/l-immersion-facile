import { EmailSentDto } from "shared/email";
import { AdminToken } from "shared/src/admin/admin.dto";
import { emailRoute } from "shared/src/routes";
import { SuperTest, Test } from "supertest";
import { AppConfig } from "../../adapters/primary/config/appConfig";
import { Clock } from "../../domain/core/ports/Clock";
import {
  buildTestApp,
  InMemoryRepositories,
} from "../../_testBuilders/buildTestApp";

describe(`/${emailRoute} route`, () => {
  let request: SuperTest<Test>;
  let reposAndGateways: InMemoryRepositories;
  let adminToken: AdminToken;
  let appConfig: AppConfig;
  let clock: Clock;

  beforeEach(async () => {
    ({ request, reposAndGateways, appConfig, clock } = await buildTestApp());

    const response = await request.post("/admin/login").send({
      user: appConfig.backofficeUsername,
      password: appConfig.backofficePassword,
    });
    adminToken = response.body;
  });
  describe("private route to get last email sent", () => {
    it("Returns Forbidden if no token provided", async () => {
      const response = await request.get(`/admin/${emailRoute}`);

      expect(response.body).toEqual({
        error: "You need to authenticate first",
      });
      expect(response.status).toBe(401);
    });

    it("Returns last sent emails", async () => {
      // Prepare
      const dateNow = new Date("2022-01-01T12:00:00.000Z");
      clock.now = () => dateNow;
      await reposAndGateways.email.sendAgencyWasActivated(["toto@email.com"], {
        agencyName: "Agence du Grand Est",
      });

      // Getting the application succeeds and shows that it's validated.
      const expectedDto: EmailSentDto = {
        templatedEmail: {
          type: "AGENCY_WAS_ACTIVATED",
          recipients: ["toto@email.com"],
          cc: [],
          params: { agencyName: "Agence du Grand Est" },
        },
        sentAt: dateNow.toISOString(),
      };
      await request
        .get(`/admin/${emailRoute}`)
        .set("Authorization", adminToken)
        .expect(200, [expectedDto]);
    });
  });
});
