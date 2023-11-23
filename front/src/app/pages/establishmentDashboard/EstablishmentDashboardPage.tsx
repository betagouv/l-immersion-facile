import React from "react";
import { useDispatch } from "react-redux";
import { fr } from "@codegouvfr/react-dsfr";
import Alert from "@codegouvfr/react-dsfr/Alert";
import Button from "@codegouvfr/react-dsfr/Button";
import Tabs from "@codegouvfr/react-dsfr/Tabs";
import { match, P } from "ts-pattern";
import { Route } from "type-route";
import { InclusionConnectedUser } from "shared";
import { Loader } from "react-design-system";
import { MetabaseView } from "src/app/components/MetabaseView";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { ManageConventionFormSection } from "src/app/pages/admin/ManageConventionFormSection";
import { routes } from "src/app/routes/routes";
import { authSlice } from "src/core-logic/domain/auth/auth.slice";
import { inclusionConnectedSelectors } from "src/core-logic/domain/inclusionConnected/inclusionConnected.selectors";

type EstablishmentDashboardTab = {
  label: string;
  content: JSX.Element;
};

export const EstablishmentDashboardPage = ({
  route,
}: {
  route: Route<typeof routes.establishmentDashboard>;
}) => {
  const currentUser = useAppSelector(inclusionConnectedSelectors.currentUser);
  const isLoading = useAppSelector(inclusionConnectedSelectors.isLoading);
  const dispatch = useDispatch();

  const establishmentDashboardTabs = (
    currentUser: InclusionConnectedUser,
  ): EstablishmentDashboardTab[] => [
    {
      label: "Conventions en cours",
      content: (
        <>
          <ManageConventionFormSection
            routeNameToRedirectTo={"manageConventionInclusionConnected"}
          />
          {currentUser.establishmentRepresentativeDashboardUrl ? (
            <MetabaseView
              title={`Tableau des conventions en cours
            pour le responsable d'entreprise ${currentUser.firstName} ${currentUser.lastName}`}
              url={currentUser.establishmentRepresentativeDashboardUrl}
            />
          ) : (
            <p>
              {" "}
              Nous n'avons pas trouvé de convention où vous êtes référencé en
              tant que responsable d'entreprise.
            </p>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <div className={fr.cx("fr-grid-row")}>
        <h1>Bienvenue</h1>
        <div className={fr.cx("fr-ml-auto", "fr-mt-1w")}>
          <Button
            onClick={() => {
              dispatch(
                authSlice.actions.federatedIdentityDeletionTriggered(
                  route.name,
                ),
              );
            }}
            type="button"
            priority="secondary"
          >
            Se déconnecter
          </Button>
        </div>
      </div>
      {isLoading && <Loader />}
      {match({ currentUser })
        .with(
          {
            currentUser: P.not(P.nullish),
          },
          ({ currentUser }) => (
            <Tabs tabs={establishmentDashboardTabs(currentUser)} />
          ),
        )
        .otherwise(() => (
          <Alert
            severity="error"
            title="Vous n'êtes pas connecté avec Inclusion Connect."
          />
        ))}
    </>
  );
};
