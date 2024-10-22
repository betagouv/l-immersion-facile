import React from "react";
import { PageHeader } from "react-design-system";
import { FrontAdminRoute } from "src/app/pages/admin/AdminPage";
import { InclusionConnectedPrivateRoute } from "src/app/routes/InclusionConnectedPrivateRoute";

type AdminPrivateRouteProps = {
  route: FrontAdminRoute;
  children: React.ReactElement;
};

export const AdminPrivateRoute = ({
  route,
  children,
}: AdminPrivateRouteProps) => (
  <InclusionConnectedPrivateRoute
    allowAdminOnly={true}
    route={route}
    inclusionConnectConnexionPageHeader={
      <PageHeader title="Bienvenue cher administrateur de la super team Immersion Facilitée ! 🚀" />
    }
  >
    {children}
  </InclusionConnectedPrivateRoute>
);
