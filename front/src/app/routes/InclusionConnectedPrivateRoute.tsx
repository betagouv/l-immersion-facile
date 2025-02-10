import { fr } from "@codegouvfr/react-dsfr";
import Alert from "@codegouvfr/react-dsfr/Alert";
import React, { useEffect } from "react";
import {
  Loader,
  LoginForm,
  MainWrapper,
  OAuthButton,
  OAuthButtonProps,
} from "react-design-system";
import { useDispatch } from "react-redux";
import {
  AllowedStartInclusionConnectLoginPage,
  OAuthGatewayProvider,
  absoluteUrlSchema,
  domElementIds,
  inclusionConnectImmersionRoutes,
  queryParamsAsString,
} from "shared";
import { HeaderFooterLayout } from "src/app/components/layout/HeaderFooterLayout";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { FrontAdminRouteTab } from "src/app/pages/admin/AdminTabs";
import { routes } from "src/app/routes/routes";
import { loginIllustration } from "src/assets/img/illustrations";
import { outOfReduxDependencies } from "src/config/dependencies";
import { authSelectors } from "src/core-logic/domain/auth/auth.selectors";
import { authSlice } from "src/core-logic/domain/auth/auth.slice";
import { featureFlagSelectors } from "src/core-logic/domain/featureFlags/featureFlags.selector";
import { inclusionConnectedSelectors } from "src/core-logic/domain/inclusionConnected/inclusionConnected.selectors";
import { Route } from "type-route";

export type FrontAdminRoute =
  | FrontAdminRouteTab
  | Route<typeof routes.adminUserDetail>
  | Route<typeof routes.adminConventionDetail>
  | Route<typeof routes.adminAgencyDetail>;

export const agencyDashboardTabsList = [
  "agencyDashboardMain",
  "agencyDashboardSynchronisedConventions",
  "agencyDashboardAgencies",
] satisfies AgencyDashboardRouteName[];

export type AgencyTabRoute = (typeof agencyDashboardTabsList)[number];

export const agencyDashboardRoutes = [
  "agencyDashboardMain",
  "agencyDashboardSynchronisedConventions",
  "agencyDashboardAgencies",
  "agencyDashboardAgencyDetails",
  "agencyDashboardOnboarding",
] satisfies AgencyDashboardRouteName[];

export type AgencyDashboardRouteName = FrontAgencyDashboardRoute["name"];

export type FrontAgencyDashboardRoute =
  | Route<typeof routes.agencyDashboardMain>
  | Route<typeof routes.agencyDashboardOnboarding>
  | Route<typeof routes.agencyDashboardSynchronisedConventions>
  | Route<typeof routes.agencyDashboardAgencies>
  | Route<typeof routes.agencyDashboardAgencyDetails>;

type InclusionConnectPrivateRoute =
  | FrontAdminRoute
  | FrontAgencyDashboardRoute
  | Route<typeof routes.formEstablishment>
  | Route<typeof routes.establishmentDashboard>
  | Route<typeof routes.myProfile>;

type InclusionConnectedPrivateRouteProps = {
  route: InclusionConnectPrivateRoute;
  children: React.ReactElement;
  inclusionConnectConnexionPageHeader: React.ReactElement;
  allowAdminOnly?: boolean;
};

export const InclusionConnectedPrivateRoute = ({
  route,
  children,
  allowAdminOnly,
  inclusionConnectConnexionPageHeader,
}: InclusionConnectedPrivateRouteProps) => {
  const dispatch = useDispatch();
  const isInclusionConnected = useAppSelector(
    authSelectors.isInclusionConnected,
  );
  const authIsLoading = useAppSelector(authSelectors.isLoading);
  const isLoadingUser = useAppSelector(inclusionConnectedSelectors.isLoading);
  const isAdminConnected = useAppSelector(authSelectors.isAdminConnected);
  const { enableProConnect } = useAppSelector(
    featureFlagSelectors.featureFlagState,
  );

  const provider = enableProConnect.isActive
    ? providers.proConnect
    : providers.inclusionConnect;
  const afterLoginRedirectionUrl = useAppSelector(
    authSelectors.afterLoginRedirectionUrl,
  );

  useEffect(() => {
    const {
      token,
      email = "",
      firstName = "",
      lastName = "",
      idToken = "",
      siret = "",
    } = route.params;

    if (token) {
      dispatch(
        authSlice.actions.federatedIdentityProvided({
          federatedIdentityWithUser: {
            provider: "inclusionConnect",
            token,
            email,
            lastName,
            firstName,
            idToken,
          },
          feedbackTopic: "auth-global",
        }),
      );
      outOfReduxDependencies.localDeviceRepository.set(
        "connectedUserSiret",
        siret,
      );
      const { token: _, ...routeParams } = route.params;
      routes[route.name](routeParams as any).replace();
    }
  }, [route.params, dispatch, afterLoginRedirectionUrl]);

  useEffect(() => {
    if (!authIsLoading && !isInclusionConnected) {
      const windowUrl = absoluteUrlSchema.parse(window.location.href);
      dispatch(
        authSlice.actions.saveRedirectionAfterLoginRequested({
          url: windowUrl,
        }),
      );
    }
    if (!authIsLoading && isInclusionConnected && afterLoginRedirectionUrl)
      dispatch(authSlice.actions.redirectAndClearUrlAfterLoginRequested());
  }, [authIsLoading, isInclusionConnected, afterLoginRedirectionUrl, dispatch]);

  const page = getPage(route);

  if (!isInclusionConnected) {
    return (
      <HeaderFooterLayout>
        <MainWrapper
          layout="default"
          pageHeader={inclusionConnectConnexionPageHeader}
          vSpacing={6}
        >
          <div className={fr.cx("fr-grid-row")}>
            <div className={fr.cx("fr-col-12", "fr-col-lg-6")}>
              <LoginForm
                sections={[
                  {
                    title: `Se connecter avec ${provider.name}`,
                    description: provider.baseline,
                    authComponent: (
                      <OAuthButton
                        id={domElementIds[page].login.inclusionConnectButton}
                        authenticationEndpoint={`${
                          inclusionConnectImmersionRoutes
                            .startInclusionConnectLogin.url
                        }?${queryParamsAsString(
                          inclusionConnectImmersionRoutes.startInclusionConnectLogin.queryParamsSchema.parse(
                            { page },
                          ),
                        )}`}
                        provider={provider.buttonProvider}
                      />
                    ),
                  },
                ]}
              />
            </div>
            <div
              className={fr.cx(
                "fr-col-12",
                "fr-col-lg-6",
                "fr-hidden",
                "fr-unhidden-lg",
                "fr-px-12w",
                "fr-py-4w",
              )}
            >
              <img src={loginIllustration} width={400} height={260} alt="" />
            </div>
          </div>
        </MainWrapper>
      </HeaderFooterLayout>
    );
  }

  if (isLoadingUser) return <Loader />;

  if (allowAdminOnly && !isAdminConnected)
    return (
      <HeaderFooterLayout>
        <MainWrapper layout="default">
          <Alert
            severity="error"
            title={"Accès refusé"}
            description={
              "Vous n'avez pas les droits nécessaires pour accéder à cette page."
            }
          />
        </MainWrapper>
      </HeaderFooterLayout>
    );
  return (
    <HeaderFooterLayout>
      <MainWrapper layout="default">{children}</MainWrapper>
    </HeaderFooterLayout>
  );
};

const providers: Record<
  OAuthGatewayProvider,
  {
    name: string;
    baseline: string;
    buttonProvider: OAuthButtonProps["provider"];
  }
> = {
  inclusionConnect: {
    name: "Inclusion Connect",
    buttonProvider: "inclusion-connect",
    baseline:
      "Inclusion Connect est la solution proposée par l'État pour sécuriser et simplifier la connexion aux services en ligne de l'inclusion.",
  },
  proConnect: {
    name: "ProConnect",
    buttonProvider: "pro-connect",
    baseline:
      "ProConnect est la solution proposée par l'État pour sécuriser et simplifier la connexion aux services en ligne pour les professionnels.",
  },
};

const getPage = (
  route: InclusionConnectPrivateRoute,
): AllowedStartInclusionConnectLoginPage => {
  if (route.name === "establishmentDashboard") return "establishmentDashboard";
  if (route.name === "agencyDashboardMain") return "agencyDashboard";
  return "admin";
};
