import React from "react";
import { fr } from "@codegouvfr/react-dsfr";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { domElementIds } from "shared";
import { ImmersionTextField } from "react-design-system";
import { useEstablishmentSiret } from "src/app/hooks/siret.hooks";

type SiretFetcherInputProps = {
  placeholder: string;
  label?: string;
};

export const SiretFetcherInput = ({
  placeholder,
  label,
}: SiretFetcherInputProps) => {
  const {
    currentSiret,
    siretErrorToDisplay,
    isSiretAlreadySaved,
    updateSiret,
    modifyLinkWasSent,
    sendLinkFeedback,
    sendModifyEstablishmentLink,
  } = useEstablishmentSiret({
    shouldFetchEvenIfAlreadySaved: false,
  });
  const shouldShowInputError = !isSiretAlreadySaved && currentSiret !== "";
  return (
    <>
      <ImmersionTextField
        id={domElementIds.homeEstablishments.siretModal.siretFetcherInput}
        name="siret"
        label={label}
        value={currentSiret}
        placeholder={placeholder}
        error={shouldShowInputError ? siretErrorToDisplay : ""}
        onChange={(e) => updateSiret(e.target.value)}
      />
      {isSiretAlreadySaved && !modifyLinkWasSent && (
        <ModifyEstablishmentRequestForMailUpdate
          onClick={() => sendModifyEstablishmentLink(currentSiret)}
        />
      )}
      {modifyLinkWasSent && <ModifyEstablishmentRequestNotification />}
      {sendLinkFeedback.kind === "errored" && (
        <p className={fr.cx("fr-error-text")}>
          {sendLinkFeedback.errorMessage}
        </p>
      )}
    </>
  );
};

const ModifyEstablishmentRequestNotification = () => (
  <>
    <span className={fr.cx("fr-valid-text", "fr-text--md", "fr-mb-2w")}>
      Demande envoyée
    </span>
    <p>
      Un e-mail a été envoyé au référent de cet établissement avec un lien
      permettant la mise à jour des informations. Le lien est valable 24h.
    </p>
  </>
);

type ModifyEstablishmentRequestForMailUpdateProps = {
  onClick: () => void;
};

const ModifyEstablishmentRequestForMailUpdate = ({
  onClick,
}: ModifyEstablishmentRequestForMailUpdateProps) => (
  <>
    <p className={fr.cx("fr-valid-text", "fr-mb-2w")}>
      Nous avons bien trouvé votre établissement dans notre base de donnée.
    </p>
    <div className={fr.cx("fr-grid-row", "fr-grid-row--center")}>
      <Button
        type="button"
        onClick={onClick}
        priority="secondary"
        nativeButtonProps={{
          id: domElementIds.homeEstablishments.siretModal
            .editEstablishmentButton,
        }}
      >
        Recevoir le mail de modification
      </Button>
    </div>
  </>
);
