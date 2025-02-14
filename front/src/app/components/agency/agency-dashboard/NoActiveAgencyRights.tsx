import { fr } from "@codegouvfr/react-dsfr";
import Button from "@codegouvfr/react-dsfr/Button";
import React, { useState } from "react";
import { AgencyRight, InclusionConnectedUser } from "shared";
import { RegisterAgenciesForm } from "src/app/components/forms/register-agencies/RegisterAgenciesForm";
import { commonIllustrations } from "src/assets/img/illustrations";
import { FeedbackTopic } from "src/core-logic/domain/feedback/feedback.slice";
import { OnGoingAgencyRightsTable } from "../agencies-table/OnGoingAgencyRightsTable";

export function NoActiveAgencyRights({
  toReviewAgencyRights,
  currentUser,
  feedbackTopic,
}: {
  toReviewAgencyRights: AgencyRight[];
  currentUser: InclusionConnectedUser;
  feedbackTopic: FeedbackTopic;
}): JSX.Element {
  const [showRegistrationForm, setShowRegistrationForm] =
    useState<boolean>(false);
  return (
    <>
      <h2 className={fr.cx("fr-mt-2w")}>Suivi de mes demandes</h2>
      <div className={fr.cx("fr-grid-row")}>
        <div
          className={fr.cx(
            "fr-hidden",
            "fr-unhidden-lg",
            "fr-col-2",
            "fr-pr-2w",
          )}
        >
          <div>
            <img src={commonIllustrations.error} alt="attention" />
          </div>
        </div>
        <div className={fr.cx("fr-col-12", "fr-col-lg-10")}>
          <h3>
            Votre demande d'accès à {toReviewAgencyRights.length}{" "}
            {toReviewAgencyRights.length === 1 ? "organisme" : "organismes"}{" "}
            {toReviewAgencyRights.length === 1
              ? "prescripteur"
              : "prescripteurs"}{" "}
            est en cours d'étude
          </h3>
          <p>
            Dès qu'un accès est validé par un administrateur, vous serez notifié
            par email et pourrez consulter les conventions de l'organisme dans
            votre espace personnel.
          </p>
          <OnGoingAgencyRightsTable
            agenciesWithToReviewRights={toReviewAgencyRights}
            userId={currentUser.id}
            feedbackTopic={feedbackTopic}
          />
        </div>
      </div>

      <div className={fr.cx("fr-grid-row")}>
        <div
          className={fr.cx(
            "fr-hidden",
            "fr-unhidden-lg",
            "fr-col-2",
            "fr-pr-2w",
          )}
        >
          <div>
            <img src={commonIllustrations.reachData} alt="attention" />
          </div>
        </div>
        <div className={fr.cx("fr-col-12", "fr-col-lg-10")}>
          <h3>Vous travaillez ailleurs ?</h3>
          {showRegistrationForm ? (
            <RegisterAgenciesForm currentUser={currentUser} />
          ) : (
            <Button
              onClick={() => {
                setShowRegistrationForm(true);
              }}
            >
              Demander l'accès à d'autre organismes
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
