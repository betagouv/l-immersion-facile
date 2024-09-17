import { fr } from "@codegouvfr/react-dsfr";
import Alert from "@codegouvfr/react-dsfr/Alert";
import Tabs from "@codegouvfr/react-dsfr/Tabs";

import { ReactJSXElement } from "@emotion/react/types/jsx-namespace";
import React from "react";
import { Loader } from "react-design-system";
import { EstablishmentRole, InclusionConnectedUser } from "shared";
import { MetabaseView } from "src/app/components/MetabaseView";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { ManageConventionFormSection } from "src/app/pages/admin/ManageConventionFormSection";

import { DiscussionManageContent } from "src/app/components/admin/establishments/DiscussionManageContent";
import { ManageEstablishmentsTab } from "src/app/pages/establishment-dashboard/ManageEstablishmentTab";
import { isEstablishmentDashboardTab } from "src/app/routes/routeParams/establishmentDashboardTabs";
import { routes } from "src/app/routes/routes";
import { DashboardTab, getDashboardTabs } from "src/app/utils/dashboard";
import { inclusionConnectedSelectors } from "src/core-logic/domain/inclusionConnected/inclusionConnected.selectors";
import { P, match } from "ts-pattern";
import { Route } from "type-route";
import { ManageDiscussionFormSection } from "./ManageDiscussionFormSection";

const currentUserRoleToDisplay = (role: EstablishmentRole) =>
  role === "establishment-representative"
    ? "responsable d'entreprise"
    : "tuteur de l'entreprise";

export const EstablishmentDashboardPage = ({
  route,
}: {
  route: Route<typeof routes.establishmentDashboard>;
}): ReactJSXElement => {
  const currentUser = useAppSelector(inclusionConnectedSelectors.currentUser);
  const isLoading = useAppSelector(inclusionConnectedSelectors.isLoading);
  const { params } = route;
  const rawEstablishmentDashboardTabs = ({
    dashboards: {
      establishments: { conventions, discussions },
    },
    firstName,
    lastName,
    establishments,
  }: InclusionConnectedUser): DashboardTab[] => [
    {
      label: "Conventions",
      tabId: "conventions",
      content: (
        <>
          <ManageConventionFormSection
            routeNameToRedirectTo={"manageConventionInclusionConnected"}
          />
          {conventions ? (
            <MetabaseView
              title={`Tableau des conventions en cours
                pour le ${currentUserRoleToDisplay(
                  conventions.role,
                )} ${firstName} ${lastName}`}
              url={conventions.url}
            />
          ) : (
            <p>
              {" "}
              Nous n'avons pas trouvé de convention où vous êtes référencés en
              tant que responsable ou tuteur d'entreprise.
            </p>
          )}
        </>
      ),
    },
    {
      label: "Candidatures",
      tabId: "discussions",
      content: params.discussionId ? (
        <DiscussionManageContent discussionId={params.discussionId} />
      ) : (
        <>
          <ManageDiscussionFormSection />
          {discussions ? (
            <MetabaseView
              title={`Suivi des mises en relations pour ${firstName} ${lastName}`}
              url={discussions}
            />
          ) : (
            <p>
              {" "}
              Nous n'avons pas trouvé de mises en relation où vous êtes
              référencés en tant que contact d'entreprise.
            </p>
          )}
        </>
      ),
    },
    ...(establishments
      ? [
          {
            label: "Fiche établissement",
            tabId: "fiche-entreprise",
            content: (
              <ManageEstablishmentsTab
                establishments={establishments}
                route={route}
              />
            ),
          },
        ]
      : []),
  ];

  const currentTab = route.params.tab;

  return (
    <>
      <div className={fr.cx("fr-grid-row")}>
        <h1>Bienvenue</h1>
      </div>
      {isLoading && <Loader />}
      {match({ currentUser })
        .with(
          {
            currentUser: P.not(P.nullish),
          },
          ({ currentUser }) => {
            const tabs = getDashboardTabs(
              rawEstablishmentDashboardTabs(currentUser),
              currentTab,
            );
            return (
              <Tabs
                tabs={tabs}
                selectedTabId={currentTab} // shouldn't be necessary as it's handled by isDefault, but typescript complains (should report to react-dsfr)
                onTabChange={(tab) => {
                  if (isEstablishmentDashboardTab(tab))
                    routes
                      .establishmentDashboard({
                        tab,
                      })
                      .push();
                }}
              >
                {tabs.find((tab) => tab.tabId === currentTab)?.content}
              </Tabs>
            );
          },
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
