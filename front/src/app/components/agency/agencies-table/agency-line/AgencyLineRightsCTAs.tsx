import Button from "@codegouvfr/react-dsfr/Button";
import { ReactNode } from "react";
import { AgencyRight, domElementIds } from "shared";
import { routes } from "src/app/routes/routes";

export const AgencyLineRightsCTAs = ({
  agencyRight,
  isBackofficeAdmin,
  onUpdateClicked,
  onRegistrationCancelledClicked,
}: {
  agencyRight: AgencyRight;
  onUpdateClicked?: (agencyRight: AgencyRight) => void;
  onRegistrationCancelledClicked?: (agencyRight: AgencyRight) => void;
  isBackofficeAdmin?: boolean | undefined;
}): ReactNode => (
  <>
    {onUpdateClicked && (
      <Button
        size="small"
        id={`${domElementIds.profile.editRoleButton}-${agencyRight.agency.id}`}
        onClick={() => {
          onUpdateClicked(agencyRight);
        }}
      >
        Modifier
      </Button>
    )}
    {isBackofficeAdmin && (
      <Button
        priority="tertiary no outline"
        id={`${domElementIds.profile.adminAgencyLink}-${agencyRight.agency.id}`}
        size="small"
        linkProps={
          routes.adminAgencyDetail({
            agencyId: agencyRight.agency.id,
          }).link
        }
      >
        Voir l'agence comme admin IF
      </Button>
    )}
    {onRegistrationCancelledClicked && (
      <Button
        priority="secondary"
        id={`${domElementIds.profile.cancelRegistrationButton}-${agencyRight.agency.id}`}
        size="small"
        onClick={() => {
          onRegistrationCancelledClicked(agencyRight);
        }}
      >
        Annuler la demande
      </Button>
    )}
  </>
);
