import SendRoundedIcon from "@mui/icons-material/SendRounded";
import React, { useState } from "react";
import { HomeButton, Link } from "react-design-system/immersionFacile";
import { Section } from "src/app/components/Section";
import { establishmentSelectors } from "src/core-logic/domain/establishmentPath/establishment.selectors";
import { isSiretAlreadySavedSelector } from "src/core-logic/domain/siret/siret.selectors";
import { useSendModifyEstablishmentLink } from "src/hooks/establishment.hooks";
import { useSiretFetcher } from "src/hooks/siret.hooks";
import { ImmersionTextField } from "src/uiComponents/form/ImmersionTextField";
import { EstablishmentSubTitle } from "../pages/home/components/EstablishmentSubTitle";
import { EstablishmentTitle } from "../pages/home/components/EstablishmentTitle";
import { routes } from "../routing/routes";
import { useAppSelector } from "../utils/reduxHooks";
export const EstablishmentHomeMenu = () => {
  const { currentSiret, updateSiret, siretError } = useSiretFetcher({
    shouldFetchEvenIfAlreadySaved: false,
  });
  const { sendModifyEstablishmentLink } = useSendModifyEstablishmentLink();
  const isSiretAlreadySaved = useAppSelector(isSiretAlreadySavedSelector);
  const modifyLinkWasSent = useAppSelector(
    establishmentSelectors.wasModifyLinkSent,
  );

  const [startEstablishmentPath, startEstablishmentPathUpdate] =
    useState<boolean>(false);

  const styleType = "establishment";

  return (
    <Section type={styleType} className="max-h-[300px]">
      <div className="flex flex-col">
        <EstablishmentTitle type={styleType} text="ENTREPRISE" />
        {!modifyLinkWasSent && (
          <EstablishmentSubTitle
            type={styleType}
            text="Vos équipes souhaitent accueillir en immersion professionnelle ?"
          />
        )}
      </div>
      <div className="flex flex-col w-full h-full items-center justify-center">
        {!startEstablishmentPath ? (
          <>
            <HomeButton onClick={() => startEstablishmentPathUpdate(true)}>
              Référencer votre entreprise
            </HomeButton>
            <HomeButton
              type="secondary"
              onClick={() => startEstablishmentPathUpdate(true)}
            >
              Modifier votre entreprise
            </HomeButton>
          </>
        ) : (
          <>
            <ImmersionTextField
              className="w-2/3"
              name="siret"
              value={currentSiret}
              placeholder="SIRET de votre entreprise"
              error={isSiretAlreadySaved ? "" : siretError}
              onChange={(e) => updateSiret(e.target.value)}
            />
            {isSiretAlreadySaved && !modifyLinkWasSent && (
              <ModifyEstablishmentRequestForMailUpdate
                onClick={() => sendModifyEstablishmentLink(currentSiret)}
              />
            )}
            {modifyLinkWasSent && <ModifyEstablishmentRequestNotification />}
          </>
        )}
      </div>
      {!modifyLinkWasSent && (
        <div className="pb-4">
          <Link
            text="En savoir plus"
            url={routes.landingEstablishment().link}
          />
        </div>
      )}
    </Section>
  );
};

const ModifyEstablishmentRequestNotification = () => (
  <>
    <SendRoundedIcon
      className="py-1"
      sx={{ color: "#3458a2", fontSize: "xx-large" }}
    />
    <EstablishmentSubTitle type="establishment" text="Demande envoyée" />
    <p className="text-immersionBlue-dark  text-center text-xs py-2">
      Un e-mail a été envoyé au référent de cet établissement avec un lien
      permettant la mise à jour des informations.
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
    <span className="text-immersionBlue-dark  text-center text-xs pb-2">
      Nous avons bien trouvé votre établissement dans notre base de donnée.
    </span>
    <HomeButton type="secondary" onClick={onClick}>
      Recevoir le mail de modification
    </HomeButton>
  </>
);
