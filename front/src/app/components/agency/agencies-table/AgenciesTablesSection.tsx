import { fr } from "@codegouvfr/react-dsfr";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  AgencyRight,
  User,
  UserParamsForAgency,
  distinguishAgencyRights,
  domElementIds,
} from "shared";
import { Feedback } from "../../feedback/Feedback";
import { AgencyUserModificationForm } from "../AgencyUserModificationForm";
import { ActiveAgencyRightsTable } from "./ActiveAgencyRightsTable";
import { OnGoingAgencyRightsTable } from "./OnGoingAgencyRightsTable";

const manageUserModal = createModal({
  isOpenedByDefault: false,
  id: domElementIds.admin.agencyTab.editAgencyManageUserModal,
});

export const AgenciesTablesSection = ({
  user,
  agencyRights,
  isBackofficeAdmin,
  onUserUpdateRequested,
}: {
  user: User;
  agencyRights: AgencyRight[];
  isBackofficeAdmin?: boolean;
  onUserUpdateRequested: (userParamsForAgency: UserParamsForAgency) => void;
}) => {
  if (!agencyRights.length)
    return <p>Cet utilisateur n'est lié à aucun organisme.</p>;

  const [selectedAgencyRight, setSelectedAgencyRight] =
    useState<AgencyRight | null>(null);

  const onUpdateClicked = (agencyRight: AgencyRight) => {
    setSelectedAgencyRight(agencyRight);
    manageUserModal.open();
  };

  const { toReviewAgencyRights, activeAgencyRights } =
    distinguishAgencyRights(agencyRights);

  return (
    <>
      <Feedback topic="user" />
      {toReviewAgencyRights.length > 0 && (
        <>
          <h2 className={fr.cx("fr-h4")}>
            Demandes d'accès en cours ({toReviewAgencyRights.length}{" "}
            {toReviewAgencyRights.length === 1 ? "agence" : "agences"})
          </h2>

          <OnGoingAgencyRightsTable
            agenciesWithToReviewRights={toReviewAgencyRights}
            userId={user.id}
            feedbackTopic="user"
          />
        </>
      )}
      {activeAgencyRights.length > 0 && (
        <ActiveAgencyRightsTable
          agenciesWithoutToReviewRights={activeAgencyRights}
          onUpdateClicked={onUpdateClicked}
          isBackofficeAdmin={isBackofficeAdmin}
        />
      )}
      {createPortal(
        <manageUserModal.Component title={"Modifier le rôle de l'utilisateur"}>
          {selectedAgencyRight && (
            <AgencyUserModificationForm
              agencyUser={{
                agencyId: selectedAgencyRight.agency.id,
                userId: user.id,
                roles: selectedAgencyRight.roles,
                email: user.email,
                isNotifiedByEmail: selectedAgencyRight.isNotifiedByEmail,
                isIcUser: !!user.externalId,
              }}
              closeModal={() => manageUserModal.close()}
              agencyHasRefersTo={!!selectedAgencyRight.agency.refersToAgencyId}
              isEmailDisabled={true}
              areRolesDisabled={
                !isBackofficeAdmin &&
                !selectedAgencyRight.roles.includes("agency-admin")
              }
              onSubmit={onUserUpdateRequested}
              routeName="myProfile"
            />
          )}
        </manageUserModal.Component>,
        document.body,
      )}
    </>
  );
};
