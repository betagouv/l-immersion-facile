import { expectToEqual, oAuthProviders, queryParamsAsString } from "shared";
import { InMemoryUowPerformer } from "../../../unit-of-work/adapters/InMemoryUowPerformer";
import {
  InMemoryUnitOfWork,
  createInMemoryUow,
} from "../../../unit-of-work/adapters/createInMemoryUow";
import {
  InMemoryOAuthGateway,
  fakeProviderConfig,
} from "../adapters/oauth-gateway/InMemoryOAuthGateway";
import { GetInclusionConnectLogoutUrl } from "./GetInclusionConnectLogoutUrl";

describe("GetInclusionConnectLogoutUrl", () => {
  describe.each(oAuthProviders)("With OAuthGateway mode '%s'", (mode) => {
    let uow: InMemoryUnitOfWork;
    let getInclusionConnectLogoutUrl: GetInclusionConnectLogoutUrl;

    beforeEach(() => {
      uow = createInMemoryUow();
      getInclusionConnectLogoutUrl = new GetInclusionConnectLogoutUrl(
        new InMemoryUowPerformer(uow),
        new InMemoryOAuthGateway(fakeProviderConfig),
      );

      uow.featureFlagRepository.update({
        flagName: "enableProConnect",
        featureFlag: { isActive: mode === "ProConnect", kind: "boolean" },
      });
    });

    it("returns the inclusion connect logout url from %s", async () => {
      const logoutSuffixe =
        mode === "ProConnect" ? "pro-connect" : "inclusion-connect";
      const idToken = "fake-id-token";
      expectToEqual(
        await getInclusionConnectLogoutUrl.execute({
          idToken,
        }),
        `${
          fakeProviderConfig.providerBaseUri
        }/logout-${logoutSuffixe}?${queryParamsAsString({
          postLogoutRedirectUrl:
            fakeProviderConfig.immersionRedirectUri.afterLogout,
          clientId: fakeProviderConfig.clientId,
          idToken,
        })}`,
      );
    });
  });
});
