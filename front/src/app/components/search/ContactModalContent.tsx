import React from "react";
import { fr } from "@codegouvfr/react-dsfr";
import {
  ContactMethod,
  RomeDto,
  SearchImmersionResultDto,
  SiretDto,
} from "shared";
import { ContactByEmail } from "./ContactByEmail";
import { ContactByPhone } from "./ContactByPhone";

export type ContactModalContentProps = {
  contactMethod?: ContactMethod;
  siret: SiretDto;
  offer: RomeDto;
  searchResultData?: SearchImmersionResultDto;
  onSuccess: () => void;
};

export const ModalContactContent = ({
  contactMethod,
  siret,
  offer,
  onSuccess,
  searchResultData,
}: ContactModalContentProps) => {
  switch (contactMethod) {
    case "EMAIL":
      return (
        <ContactByEmail siret={siret} offer={offer} onSuccess={onSuccess} />
      );
    case "PHONE":
      return (
        <ContactByPhone siret={siret} offer={offer} onSuccess={onSuccess} />
      );
    case "IN_PERSON":
      return (
        <ContactByEmail siret={siret} offer={offer} onSuccess={onSuccess} />
      );
    default:
      return <AdvisesForContact data={searchResultData} />;
  }
};

const AdvisesForContact = ({
  data,
}: {
  data: SearchImmersionResultDto | undefined;
}) => (
  <div>
    <p className={fr.cx("fr-mb-2w")}>
      Cette entreprise peut recruter sur ce métier et être intéressée pour vous
      recevoir en immersion. Tentez votre chance en la contactant !
    </p>
    <ul className={fr.cx("fr-btns-group", "fr-mt-3w")}>
      <li>
        {data?.website && (
          <a
            className={fr.cx("fr-btn", "fr-btn--secondary")}
            href={data?.website}
            target="_blank"
            rel="noreferrer"
          >
            Aller sur le site de l'entreprise
          </a>
        )}
      </li>
      <li>
        <a
          className={fr.cx("fr-btn", "fr-btn--secondary")}
          href={getMapsLink(data)}
          target="_blank"
          rel="noreferrer"
        >
          Localiser l'entreprise et trouver son contact
        </a>
      </li>
    </ul>
    <hr className={fr.cx("fr-hr", "fr-mt-2w")} />
    <h2 className={fr.cx("fr-h5")}>
      Nos conseils pour cette première prise de contact&nbsp;!{" "}
    </h2>

    <h3 className={fr.cx("fr-h6")}>Comment présenter votre demande ? </h3>
    <p className={fr.cx("fr-mb-2w")}>
      Soyez <strong>direct, concret et courtois</strong>. Présentez-vous,
      présentez simplement votre projet et l’objectif que vous recherchez en
      effectuant une immersion.
    </p>
    <p className={fr.cx("fr-mb-2w")}>
      <strong>Par exemple : </strong>
      <span>
        “Je souhaite devenir mécanicien auto et je voudrais découvrir comment ce
        métier se pratique dans un garage comme le vôtre. Ca me permettra de
        vérifier que cela me plaît vraiment. La personne qui m’accueillera et me
        présentera le métier pourra aussi vérifier si ce métier est fait pour
        moi.”
      </span>
    </p>
    <p className={fr.cx("fr-mb-2w")}>
      Vous pouvez indiquer à votre interlocutrice ou interlocuteur que{" "}
      <strong>
        cette immersion sera encadrée par une convention signée par l'organisme
        qui vous suit.
      </strong>
    </p>
    <p className={fr.cx("fr-mb-2w")}>
      Indiquez lui le moment où vous aimeriez faire une immersion et pourquoi
      vous voulez la faire à cette date.
    </p>
    <p className={fr.cx("fr-mb-2w")}>
      <strong>Par exemple : </strong>
      <span>
        “il faudrait que je fasse une immersion avant de m’inscrire à une
        formation. “
      </span>
    </p>
    <p className={fr.cx("fr-mb-2w")}>
      Indiquez également le <strong>nombre de jours</strong> que vous aimeriez
      faire en immersion si vous le savez déjà.
    </p>
    <p className={fr.cx("fr-mb-2w")}>
      Concluez en lui demandant <strong>un rendez-vous</strong> pour qu’il/elle
      se rende compte du sérieux de votre projet.
    </p>

    <h3 className={fr.cx("fr-h6")}>
      Comment expliquer simplement ce qu’est une immersion ?
    </h3>
    <p className={fr.cx("fr-mb-2w")}>
      C’est un stage d’observation, strictement encadré d’un point de vue
      juridique. Vous conservez votre statut et êtes couvert par votre Pôle
      emploi,votre Mission Locale ou le Conseil départemental (en fonction de
      votre situation).
    </p>
    <p className={fr.cx("fr-mb-2w")}>
      Le rôle de celui qui vous accueillera est de vous présenter le métier et
      de vérifier avec vous que ce métier vous convient en vous faisant des
      retours les plus objectifs possibles. Pendant la durée de votre présence,
      vous pouvez aider les salariés en donnant un coup de main mais vous n’êtes
      pas là pour remplacer un collègue absent.
    </p>

    <h3 className={fr.cx("fr-h6")}>Quelle est la durée d’une immersion ?</h3>
    <p className={fr.cx("fr-mb-2w")}>
      Les immersions se font le plus souvent pendant une semaine ou deux.{" "}
      <strong>Il n’est pas possible de dépasser un mois</strong>. Il est
      possible de faire une immersion de seulement un ou deux jours mais vous ne
      découvrirez pas parfaitement un métier.
    </p>

    <h3 className={fr.cx("fr-h6")}>Bon à savoir ! </h3>
    <p className={fr.cx("fr-mb-2w")}>
      <strong>Il n’est pas nécessaire d’apporter votre CV</strong>. Vous êtes là
      pour demander à découvrir un métier et c’est ce projet qui est important,
      pas vos expériences professionnelles ni votre formation !
    </p>
  </div>
);

export const getMapsLink = (
  searchResultData: SearchImmersionResultDto | undefined,
) => {
  if (!searchResultData) return;
  const { address, name } = searchResultData;
  const queryString = `${address.streetNumberAndAddress} ${address.postcode} ${address.city} ${name}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURI(
    queryString,
  )}`;
};
