import React from "react";
import { PageHeader } from "react-design-system";
import { Breadcrumbs } from "src/app/components/Breadcrumbs";
import { EstablishmentForm } from "src/app/components/forms/establishment/EstablishmentForm";
import { InclusionConnectedPrivateRoute } from "src/app/routes/InclusionConnectedPrivateRoute";
import { routes } from "src/app/routes/routes";
import { Route } from "type-route";

type EstablishmentCreationFormPage = {
  route: Route<typeof routes.formEstablishment>;
};

export const EstablishmentCreationFormPage = ({
  route,
}: EstablishmentCreationFormPage) => (
  <InclusionConnectedPrivateRoute
    route={route}
    inclusionConnectConnexionPageHeader={
      <PageHeader
        title="Proposer une immersion"
        breadcrumbs={<Breadcrumbs />}
      />
    }
  >
    <EstablishmentForm mode="create" />
  </InclusionConnectedPrivateRoute>
);
