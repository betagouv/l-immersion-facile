import { SuperTest, Test } from "supertest";
import {
  AbsoluteUrl,
  decodeJwtWithoutSignatureCheck,
  displayRouteName,
  expectHttpResponseToEqual,
  frontRoutes,
  InclusionConnectImmersionRoutes,
  inclusionConnectImmersionRoutes,
} from "shared";
import { HttpClient } from "shared-routes";
import { createSupertestSharedClient } from "shared-routes/supertest";
import { AppConfigBuilder } from "../../../../_testBuilders/AppConfigBuilder";
import {
  buildTestApp,
  InMemoryGateways,
} from "../../../../_testBuilders/buildTestApp";
import { UuidGenerator } from "../../../../domain/core/ports/UuidGenerator";
import {
  defaultInclusionAccessTokenResponse,
  jwtGeneratedTokenFromFakeInclusionPayload,
} from "../../../secondary/InclusionConnectGateway/InMemoryInclusionConnectGateway";

describe("inclusion connection flow", () => {
  const clientId = "my-client-id";
  const clientSecret = "my-client-secret";
  const scope = "openid profile email";
  const state = "my-state";
  const nonce = "nounce"; // matches the one in payload;
  const domain = "immersion-uri.com";
  const responseType = "code" as const;
  const inclusionConnectBaseUri: AbsoluteUrl =
    "http://fake-inclusion-connect-uri.com";

  let httpClient: HttpClient<InclusionConnectImmersionRoutes>;
  let uuidGenerator: UuidGenerator;
  let gateways: InMemoryGateways;

  describe("Right path", () => {
    beforeAll(async () => {
      let request: SuperTest<Test>;
      ({ uuidGenerator, gateways, request } = await buildTestApp(
        new AppConfigBuilder({
          INCLUSION_CONNECT_GATEWAY: "IN_MEMORY",
          INCLUSION_CONNECT_CLIENT_SECRET: clientSecret,
          INCLUSION_CONNECT_CLIENT_ID: clientId,
          INCLUSION_CONNECT_BASE_URI: inclusionConnectBaseUri,
          DOMAIN: domain,
        }).build(),
      ));
      httpClient = createSupertestSharedClient(
        inclusionConnectImmersionRoutes,
        request,
      );
    });

    it(`${displayRouteName(
      inclusionConnectImmersionRoutes.startInclusionConnectLogin,
    )} 302 redirect to inclusion connect login url with right parameters in url`, async () => {
      const uuids = [nonce, state];
      uuidGenerator.new = () => uuids.shift() ?? "no-uuid-provided";

      const response = await httpClient.startInclusionConnectLogin();

      expectHttpResponseToEqual(response, {
        body: {},
        status: 302,
        headers: {
          location: encodeURI(
            `${inclusionConnectBaseUri}/auth?${[
              `client_id=${clientId}`,
              `nonce=${nonce}`,
              `redirect_uri=https://${domain}/api${inclusionConnectImmersionRoutes.afterLoginRedirection.url}`,
              `response_type=${responseType}`,
              `scope=${scope}`,
              `state=${state}`,
            ].join("&")}`,
          ),
        },
      });
    });

    it(`${displayRouteName(
      inclusionConnectImmersionRoutes.afterLoginRedirection,
    )} 302 redirect to agency dashboard with inclusion connect token`, async () => {
      const authCode = "inclusion-auth-code";
      const inclusionToken = "inclusion-token";
      gateways.inclusionConnectGateway.setAccessTokenResponse({
        ...defaultInclusionAccessTokenResponse,
        access_token: inclusionToken,
        id_token: jwtGeneratedTokenFromFakeInclusionPayload,
      });
      const response = await httpClient.afterLoginRedirection({
        queryParams: {
          code: authCode,
          state,
        },
      });

      expectHttpResponseToEqual(response, {
        body: {},
        status: 302,
      });

      if (response.status !== 302) throw new Error("Response must be 302");
      const locationHeader = response.headers.location as string;
      const locationPrefix = `https://${domain}/${frontRoutes.agencyDashboard}?token=`;

      expect(locationHeader).toContain(locationPrefix);
      expect(
        typeof decodeJwtWithoutSignatureCheck<{ userId: string }>(
          locationHeader.replace(locationPrefix, ""),
        ).userId,
      ).toBe("string");
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-empty-function, jest/no-disabled-tests
  describe.skip("Wrong path 🤪", () => {});
});
