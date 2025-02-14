import Table from "@codegouvfr/react-dsfr/Table";
import { ReactNode } from "react";
import { useDispatch } from "react-redux";
import { AgencyRight, UserId } from "shared";
import { AgencyLineRightsCTAs } from "src/app/components/agency/agencies-table/agency-line/AgencyLineRightsCTAs";
import { removeUserFromAgencySlice } from "src/core-logic/domain/agencies/remove-user-from-agency/removeUserFromAgency.slice";
import { FeedbackTopic } from "src/core-logic/domain/feedback/feedback.slice";
import { AgencyLineAdminEmails } from "./agency-line/AgencyLineAdminEmails";
import { AgencyLineAgencyName } from "./agency-line/AgencyLineAgencyName";
import { AgencyLineCaracteristics } from "./agency-line/AgencyLineCaracteristics";

export const OnGoingAgencyRightsTable = ({
  agenciesWithToReviewRights,
  userId,
  feedbackTopic,
}: {
  agenciesWithToReviewRights: AgencyRight[];
  userId: UserId;
  feedbackTopic: FeedbackTopic;
}) => {
  const dispatch = useDispatch();
  const onRegistrationCancelledClicked = (agencyRight: AgencyRight) => {
    dispatch(
      removeUserFromAgencySlice.actions.removeUserFromAgencyRequested({
        agencyId: agencyRight.agency.id,
        feedbackTopic,
        userId,
      }),
    );
  };
  return (
    <Table
      fixed
      headers={[
        "Organisme",
        "Caractéristiques de l'agence",
        "Administrateurs",
        "Actions",
      ]}
      data={[...agenciesWithToReviewRights]
        .sort((a, b) => a.agency.name.localeCompare(b.agency.name))
        .map(makeAgencyWithToReviewRightLine(onRegistrationCancelledClicked))}
    />
  );
};

const makeAgencyWithToReviewRightLine =
  (onRegistrationCancelledClicked: (agencyRight: AgencyRight) => void) =>
  (agencyRight: AgencyRight): ReactNode[] => [
    AgencyLineAgencyName({ agencyRight }),
    AgencyLineCaracteristics({ agencyRight }),
    AgencyLineAdminEmails({ agencyRight }),
    AgencyLineRightsCTAs({ agencyRight, onRegistrationCancelledClicked }),
  ];
