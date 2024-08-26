import { FrClassName, fr } from "@codegouvfr/react-dsfr";
import { Badge } from "@codegouvfr/react-dsfr/Badge";
import Button from "@codegouvfr/react-dsfr/Button";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { Table } from "@codegouvfr/react-dsfr/Table";
import { values } from "ramda";
import React, { useState } from "react";
import { Tooltip } from "react-design-system";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import {
  AgencyId,
  AgencyRole,
  UserUpdateParamsForAgency,
  domElementIds,
} from "shared";
import { AgencyUserModificationForm } from "src/app/components/agency/AgencyUserModificationForm";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { icUsersAdminSelectors } from "src/core-logic/domain/admin/icUsersAdmin/icUsersAdmin.selectors";
import { feedbackSlice } from "src/core-logic/domain/feedback/feedback.slice";
import { Feedback } from "../feedback/Feedback";

type AgencyUsersProperties = {
  agencyId: AgencyId;
};

type AgencyDisplayedRoleAndClass = {
  label: string;
  className: FrClassName;
};

export const agencyRoleToDisplay: Record<
  AgencyRole,
  AgencyDisplayedRoleAndClass
> = {
  toReview: {
    label: "À valider",
    className: "fr-badge--yellow-tournesol",
  },
  validator: {
    label: "Validateur",
    className: "fr-badge--purple-glycine",
  },
  counsellor: {
    label: "Pré-validateur",
    className: "fr-badge--brown-caramel",
  },
  agencyOwner: {
    label: "Responsable d'agence",
    className: "fr-badge--green-emeraude",
  },
  "agency-viewer": {
    label: "Lecteur",
    className: "fr-badge--blue-cumulus",
  },
};

const manageUserModal = createModal({
  isOpenedByDefault: false,
  id: domElementIds.admin.agencyTab.editAgencyManageUserModal,
});

export const AgencyUsers = ({ agencyId }: AgencyUsersProperties) => {
  const agencyUsers = useAppSelector(icUsersAdminSelectors.agencyUsers);
  const dispatch = useDispatch();

  const [selectedUserData, setSelectedUserData] = useState<
    (UserUpdateParamsForAgency & { isIcUser: boolean }) | null
  >(null);

  return (
    <>
      <h5 className={fr.cx("fr-h5", "fr-mb-1v", "fr-mt-4w")}>Utilisateurs</h5>
      <div className={fr.cx("fr-mb-2w", "fr-mt-1v")}>
        Pourquoi certains utilisateurs n'ont pas de nom ?
        <Tooltip
          type="click"
          description="Certains utilisateurs n'ont pas de compte Inclusion Connect. Ils
            peuvent se créer un compte avec la même adresse email pour ajouter
            leurs infos et accéder à leur espace personnel."
          id={domElementIds.admin.agencyTab.editAgencyUserTooltip}
        />
      </div>
      <Feedback topic="agency-user" />

      <Table
        id={domElementIds.admin.agencyTab.editAgencyUsersTable}
        headers={[
          "Utilisateurs",
          "Préférence de communication",
          "Rôles",
          "Actions",
        ]}
        data={values(agencyUsers).map((agencyUser, index) => {
          const hasFirstNameOrLastName =
            agencyUser.firstName || agencyUsers.lastName;

          return [
            <>
              {hasFirstNameOrLastName ? (
                <>
                  <strong>
                    {agencyUser.firstName} {agencyUser.lastName}
                  </strong>
                  <br />
                </>
              ) : null}
              {agencyUser.email}
            </>,
            agencyUser.agencyRights[agencyId].isNotifiedByEmail
              ? "Reçoit les notifications"
              : "Ne reçoit pas les notifications",
            agencyUser.agencyRights[agencyId].roles.map((role) => {
              return (
                <Badge small className={agencyRoleToDisplay[role].className}>
                  {agencyRoleToDisplay[role].label}
                </Badge>
              );
            }),
            <Button
              priority="secondary"
              className={fr.cx("fr-m-1w")}
              id={`${domElementIds.admin.agencyTab.editAgencyUserRoleButton}-${agencyId}-${index}`}
              onClick={() => {
                dispatch(feedbackSlice.actions.clearFeedbacksTriggered());
                setSelectedUserData({
                  agencyId,
                  userId: agencyUser.id,
                  roles: agencyUser.agencyRights[agencyId].roles,
                  email: agencyUser.email,
                  isNotifiedByEmail:
                    agencyUser.agencyRights[agencyId].isNotifiedByEmail,
                  isIcUser: !!agencyUser.externalId,
                });
                manageUserModal.open();
              }}
            >
              Modifier
            </Button>,
          ];
        })}
        fixed
      />
      {createPortal(
        <manageUserModal.Component title="Modifier le rôle de l'utilisateur">
          {selectedUserData && (
            <AgencyUserModificationForm
              agencyUser={selectedUserData}
              closeModal={() => manageUserModal.close}
            />
          )}
        </manageUserModal.Component>,
        document.body,
      )}
    </>
  );
};
