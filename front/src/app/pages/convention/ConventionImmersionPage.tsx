import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { Route } from "type-route";
import { FederatedIdentityProvider, isPeConnectIdentity } from "shared";
import { Loader } from "react-design-system";
import { ConventionForm } from "src/app/components/forms/convention/ConventionForm";
import { ConventionFormContainerLayout } from "src/app/components/forms/convention/ConventionFormContainerLayout";
import { conventionInitialValuesFromUrl } from "src/app/components/forms/convention/conventionHelpers";
import { InitiateConventionCard } from "src/app/components/InitiateConventionCard";
import { HeaderFooterLayout } from "src/app/components/layout/HeaderFooterLayout";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { useFeatureFlags } from "src/app/hooks/useFeatureFlags";
import { useScrollToTop } from "src/app/hooks/window.hooks";
import { routes } from "src/app/routes/routes";
import { authSelectors } from "src/core-logic/domain/auth/auth.selectors";
import { authSlice } from "src/core-logic/domain/auth/auth.slice";

export type ConventionImmersionPageRoute = Route<
  typeof routes.conventionImmersion
>;

interface ConventionImmersionPageProps {
  route: ConventionImmersionPageRoute;
}

export const ConventionImmersionPage = ({
  route,
}: ConventionImmersionPageProps) => (
  <HeaderFooterLayout>
    <ConventionFormContainerLayout internshipKind="immersion">
      <PageContent route={route} />
    </ConventionFormContainerLayout>
  </HeaderFooterLayout>
);

const PageContent = ({ route }: ConventionImmersionPageProps) => {
  const { enablePeConnectApi, isLoading } = useFeatureFlags();
  const federatedIdentity = useAppSelector(authSelectors.federatedIdentity);
  const [shouldShowForm, setShouldShowForm] = useState(false);
  const isSharedConvention = useMemo(
    // depends on initial (on page load) route params, shouldn't change on re-render
    () => Object.keys(route.params).length > 0,
    [],
  );
  const mode = "jwt" in route.params ? "edit" : "create";
  useFederatedIdentityFromUrl(route);
  useScrollToTop(shouldShowForm);
  useEffect(() => {
    setShouldShowForm(
      enablePeConnectApi &&
        !!federatedIdentity &&
        isPeConnectIdentity(federatedIdentity),
    );
  }, [enablePeConnectApi, federatedIdentity]);

  if (isLoading) return <Loader />;

  if (mode === "edit")
    return (
      <ConventionForm
        conventionProperties={conventionInitialValuesFromUrl({
          route,
          internshipKind: "immersion",
        })}
        routeParams={route.params}
        mode={mode}
      />
    );

  return shouldShowForm ? (
    <ConventionForm
      conventionProperties={conventionInitialValuesFromUrl({
        route,
        internshipKind: "immersion",
      })}
      routeParams={route.params}
      mode={isSharedConvention ? "edit" : mode}
    />
  ) : (
    <InitiateConventionCard
      title={
        isSharedConvention
          ? "Une demande de convention d'immersion a été partagée avec vous."
          : "Remplir la demande de convention"
      }
      peConnectNotice="Je suis demandeur d’emploi et je connais mes identifiants à mon compte Pôle emploi. J'accède au formulaire ici :"
      otherCaseNotice="Je suis dans une autre situation (candidat à une immersion sans identifiant Pôle emploi, entreprise ou conseiller emploi). J'accède au formulaire partagé ici :"
      showFormButtonLabel="Ouvrir le formulaire"
      onNotPeConnectButtonClick={() => setShouldShowForm(true)}
    />
  );
};

const useFederatedIdentityFromUrl = (route: ConventionImmersionPageRoute) => {
  const dispatch = useDispatch();

  const {
    fedId,
    fedIdProvider,
    email = "",
    firstName = "",
    lastName = "",
  } = route.params;

  useEffect(() => {
    if (fedId && fedIdProvider) {
      dispatch(
        authSlice.actions.federatedIdentityProvided({
          provider: fedIdProvider as FederatedIdentityProvider,
          token: fedId,
          email,
          firstName,
          lastName,
        }),
      );
    }
  }, [fedId, fedIdProvider, email, firstName, lastName]);
};
