import { Dispatch } from "@reduxjs/toolkit";
import { FaqCardProps, HeroHeaderNavCard, Stat } from "react-design-system";
import { domElementIds } from "shared";
import type { UserType } from "src/app/pages/home/HomePage";
import { routes } from "src/app/routes/routes";
import { authSlice } from "src/core-logic/domain/auth/auth.slice";
import { establishmentSlice } from "src/core-logic/domain/establishmentPath/establishment.slice";
import { siretSlice } from "src/core-logic/domain/siret/siret.slice";

import heroHeaderAgencyIllustration from "/src/assets/img/illustration-agency-hero.webp";
import heroHeaderCandidateIllustration from "/src/assets/img/illustration-candidate-hero.webp";
import heroHeaderDefaultIllustration from "/src/assets/img/illustration-default-hero.webp";
import heroHeaderEstablishmentIllustration from "/src/assets/img/illustration-establishment-hero.webp";

type HeroHeaderInfos = {
  displayName: string;
  title: string;
  subtitle: string;
  icon: string;
  illustration: string;
};

export const heroHeaderContent: Record<UserType, HeroHeaderInfos> = {
  default: {
    title: "Faciliter la réalisation des immersions professionnelles",
    displayName: "default",
    illustration: heroHeaderDefaultIllustration,
    icon: "",
    subtitle:
      "Avec Immersion Facilitée, trouvez un métier à tester, entrez en relation immédiatement avec une entreprise accueillante, remplissez une demande de convention et obtenez une réponse en temps record !",
  },
  candidate: {
    title:
      "L'immersion professionnelle, la meilleure façon de découvrir votre futur métier",
    displayName: "Candidat",
    illustration: heroHeaderCandidateIllustration,
    icon: "fr-icon-user-line",
    subtitle:
      "Assurez le succès de votre projet professionnel en découvrant un métier en conditions réelles. Passez quelques jours en entreprise pour vérifier que ce métier vous plaît et vous convient. Profitez-en pour découvrir éventuellement votre futur employeur !",
  },
  establishment: {
    title:
      "Rencontrer des candidats motivés ? C’est possible avec l'immersion professionnelle !",
    displayName: "Entreprise",
    illustration: heroHeaderEstablishmentIllustration,
    icon: "fr-icon-building-line",
    subtitle:
      "Contribuez au succès de reconversions professionnelles en ouvrant vos entreprises. Permettez à des profils motivés de découvrir le métier de leur choix, en conditions réelles auprès des professionnels en activité et identifiez ceux qui pourraient venir renforcer votre équipe.",
  },
  agency: {
    title:
      "L'immersion professionnelle, la meilleure façon de faire émerger de nouveaux talents",
    displayName: "Prescripteur",
    illustration: heroHeaderAgencyIllustration,
    icon: "fr-icon-map-pin-user-line",
    subtitle:
      "Avec Immersion Facilitée, trouvez un métier à tester, entrez en relation immédiatement avec une entreprise accueillante, remplissez une demande de convention et obtenez une réponse en temps record !",
  },
};

export const heroHeaderNavCards: (
  storeDispatch: Dispatch,
  openSiretModal: () => void,
) => Record<UserType, HeroHeaderNavCard[]> = (
  storeDispatch: Dispatch,
  openSiretModal,
) => {
  const onSiretModalOpenClick = (event: React.MouseEvent) => {
    event.preventDefault();
    openSiretModal();
    storeDispatch(establishmentSlice.actions.gotReady());
    storeDispatch(siretSlice.actions.siretModified(""));
  };
  return {
    default: [
      {
        overtitle: "Candidat",
        title: "Vous êtes candidat pour une immersion",
        icon: "fr-icon-user-line",
        type: "candidate",
        id: domElementIds.home.heroHeader.candidate,
        link: routes.homeCandidates().link,
      },
      {
        overtitle: "Entreprise",
        title: "Vous représentez une entreprise",
        icon: "fr-icon-building-line",
        id: domElementIds.home.heroHeader.establishment,
        type: "establishment",
        link: routes.homeEstablishments().link,
      },
      {
        overtitle: "Prescripteur",
        title: "Vous êtes prescripteur",
        icon: "fr-icon-map-pin-user-line",
        id: domElementIds.home.heroHeader.agency,
        type: "agency",
        link: routes.homeAgencies().link,
      },
    ],
    candidate: [
      {
        title: "Rechercher une entreprise accueillante",
        icon: "fr-icon-search-line",
        type: "candidate",
        id: domElementIds.homeCandidates.heroHeader.search,
        link: routes.search().link,
      },
      {
        title: "Remplir la demande de convention",
        icon: "fr-icon-file-line",
        type: "candidate",
        id: domElementIds.homeCandidates.heroHeader.formConvention,
        link: routes.conventionImmersion().link,
      },
    ],
    establishment: [
      {
        title: "Référencer ou modifier mon entreprise",
        icon: "fr-icon-hotel-line",
        type: "establishment",
        id: domElementIds.homeEstablishments.heroHeader.addEstablishmentForm,
        link: {
          href: "",
          onClick: onSiretModalOpenClick,
        },
      },
      {
        title: "Remplir la demande de convention",
        icon: "fr-icon-file-text-line",
        type: "establishment",
        id: domElementIds.homeEstablishments.heroHeader.formConvention,
        link: {
          href: "",
          onClick: (event) => {
            event.preventDefault();
            storeDispatch(authSlice.actions.federatedIdentityProvided(null));
            routes.conventionImmersion().push();
          },
        },
      },
      {
        title: "Piloter mon entreprise",
        icon: "fr-icon-line-chart-line",
        type: "establishment",
        id: domElementIds.homeEstablishments.heroHeader.establishmentDashboard,
        link: routes.establishmentDashboard({ tab: "conventions" }).link,
      },
    ],
    agency: [
      {
        title: "Référencer mon organisme",
        icon: "fr-icon-hotel-line",
        type: "agency",
        id: domElementIds.homeAgencies.heroHeader.addAgencyForm,
        link: routes.addAgency().link,
      },
      {
        title: "Remplir la demande de convention",
        icon: "fr-icon-file-text-line",
        id: domElementIds.homeAgencies.heroHeader.formConvention,
        type: "agency",
        link: {
          href: "",
          onClick: (event) => {
            event.preventDefault();
            storeDispatch(authSlice.actions.federatedIdentityProvided(null));
            routes.conventionImmersion().push();
          },
        },
      },
      {
        title: "Piloter mon organisme",
        icon: "fr-icon-line-chart-line",
        type: "agency",
        id: domElementIds.homeAgencies.heroHeader.agencyDashboard,
        link: routes.agencyDashboard().link,
      },
    ],
  };
};
export const sectionStatsData: Record<UserType, Stat[]> = {
  default: [
    {
      badgeLabel: "Découverte",
      value: "1",
      subtitle: "jour, 1 semaine ou 1 mois en entreprise",
      description:
        "L’immersion professionnelle est une période courte, variable, adaptée à vos besoins et non rémunérée pour découvrir le métier de votre choix.",
    },
    {
      badgeLabel: "Simplicité",
      value: "100%",
      subtitle: "démarche dématérialisée",
    },
    {
      badgeLabel: "Opportunité",
      value: "7",
      subtitle: "demandeurs d’emploi sur 10",
      description:
        "trouvent un emploi dans les mois qui suivent leur immersion, selon une étude France Travail (anciennement Pôle emploi) en 2021.",
    },
  ],
  candidate: [
    {
      badgeLabel: "Découverte",
      value: "1",
      subtitle: "jour, 1 semaine ou 1 mois en entreprise",
      description:
        "L’immersion professionnelle est une période courte, variable, adaptée à vos besoins et non rémunérée pour découvrir le métier de votre choix.",
    },
    {
      badgeLabel: "Simplicité",
      value: "100%",
      subtitle: "démarche dématérialisée",
    },
    {
      badgeLabel: "Opportunité",
      value: "7",
      subtitle: "demandeurs d’emploi sur 10",
      description:
        "trouvent un emploi dans les mois qui suivent leur immersion, selon une étude France Travail (anciennement Pôle emploi) en 2021.",
    },
  ],
  establishment: [
    {
      badgeLabel: "Découverte",
      value: "1",
      subtitle: "jour, 1 semaine ou 1 mois en entreprise",
      description:
        "L’immersion professionnelle est une période courte, variable, adaptée à vos besoins et non rémunérée pour découvrir le métier de votre choix.",
    },
    {
      badgeLabel: "Simplicité",
      value: "100%",
      subtitle: "démarche dématérialisée",
    },
    {
      badgeLabel: "Opportunité",
      value: "95%",
      subtitle: "",
      description:
        "des entreprises qui bénéficient du dispositif le recommandent, selon une étude publiée en mars 2021 par France Travail (anciennement Pôle emploi).",
    },
  ],
  agency: [
    {
      badgeLabel: "Découverte",
      value: "1",
      subtitle: "jour, 1 semaine ou 1 mois en entreprise",
      description:
        "L’immersion professionnelle est une période courte, variable, adaptée à vos besoins et non rémunérée pour découvrir le métier de votre choix.",
    },
    {
      badgeLabel: "Simplicité",
      value: "100%",
      subtitle: "démarche dématérialisée",
    },
    {
      badgeLabel: "Opportunité",
      value: "7",
      subtitle: "demandeurs d’emploi sur 10",
      description:
        "trouvent un emploi dans les mois qui suivent leur immersion, selon une étude France Travail (anciennement Pôle emploi) en 2021.",
    },
  ],
};

export const sectionFaqData: Record<UserType, FaqCardProps[]> = {
  default: [
    {
      title: "Comment trouver une entreprise accueillante ?",
      description: `A partir de la page candidat du service Immersion Facilitée, cliquez sur le bouton "Trouver une entreprise accueillante" ou rendez-vous directement sur la page...`,
      url: "https://immersion-facile.beta.gouv.fr/aide/article/comment-trouver-une-entreprise-accueillante-ek1x8s/",
    },
    {
      title: "A quoi sert une immersion professionnelle ?",
      description:
        "Elle vous permet d’assurer le succès de votre projet professionnel en découvrant un métier en conditions réelles, de passer quelques jours en entreprise pour vérifier...",
      url: "https://immersion-facile.beta.gouv.fr/aide/article/a-quoi-sert-une-immersion-professionnelle-1yd6ije/",
    },
    {
      title: "Comment contacter une entreprise pour demander une immersion ?",
      description: `SI une entreprise a le label "entreprise accueillante", pour lui demander une une immersion, vous devez cliquer sur "contacter l'entreprise" et compléter le formulaire...`,
      url: "https://immersion-facile.beta.gouv.fr/aide/article/comment-contacter-une-entreprise-pour-demander-une-immersion-8dqotx/",
    },
  ],
  candidate: [
    {
      title: "Qui peut bénéficier d'une Immersion Professionnelle (PMSMP) ?",
      description:
        "S’inscrivant dans une démarche préventive (bénéficiaire salarié en recherche d’emploi ou de réorientation professionnelle) et proactive (bénéficiaire privé d’emploi, inscrit ou non auprès de France Travail, anciennement Pôle emploi), les périodes...",
      url: "https://immersion-facile.beta.gouv.fr/aide/article/qui-peut-beneficier-dune-immersion-professionnelle-pmsmp-jz1af4/",
    },
    {
      title:
        "Je n'ai pas de structure d'accompagnement et je veux faire une immersion",
      description:
        " Pour faire une immersion et avoir une convention, il faut que vous soyez accompagné(e) par un organisme qui sera responsable de cette convention...",
      url: "https://immersion-facile.beta.gouv.fr/aide/article/je-nai-pas-de-structure-daccompagnement-et-je-veux-faire-une-immersion-1x15rdp/",
    },
    {
      title: "Quelles sont les obligations à respecter pour une immersion ?",
      description:
        "Le bénéficiaire s’engage à exercer les activités et tâches telles que définies dans la présente convention et à mettre en œuvre l’ensemble des actions lui permettant d’atteindre les objectifs...",
      url: "https://immersion-facile.beta.gouv.fr/aide/article/quelles-sont-les-obligations-a-respecter-pour-une-immersion-1bl944v/",
    },
  ],
  establishment: [
    {
      title:
        "Comment référencer mon entreprise en tant qu'entreprise accueillante ?",
      description: `A partir de la page d'accueil du service Immersion Facilitée, cliquez sur le bouton "Vous représentez une entreprise", puis sur "Référencer mon Entreprise"...`,
      url: "https://immersion-facile.beta.gouv.fr/aide/article/comment-referencer-mon-entreprise-en-tant-quentreprise-accueillante-zr6rxv/",
    },
    {
      title:
        "Ma structure peut-elle accueillir des immersions professionnelles ?",
      description:
        "Une immersion professionnelle (ou Période de mise en situation en milieu professionnel -PMSMP) peut se faire dans n’importe quel type d’établissement, y compris le secteur public ou associatif...",
      url: "https://immersion-facile.beta.gouv.fr/aide/article/ma-structure-peut-elle-accueillir-des-immersions-professionnelles-1ccin58/",
    },
    {
      title: "Quelles sont les obligations à respecter pour une immersion ?",
      description:
        "Le bénéficiaire s’engage à exercer les activités et tâches telles que définies dans la présente convention et à mettre en œuvre l’ensemble des actions lui permettant d’atteindre les objectifs...",
      url: "https://immersion-facile.beta.gouv.fr/aide/article/quelles-sont-les-obligations-a-respecter-pour-une-immersion-1bl944v/",
    },
  ],
  agency: [
    {
      title:
        "Puis-je faire une demande de convention avec une entreprise non inscrite sur le site ?",
      description:
        "La réponse en trois mots : oui, bien sûr. Les entreprises accueillantes sont des entreprises que nous avons contactées et qui se sont engagées à accueillir des immersions...",
      url: "https://immersion-facile.beta.gouv.fr/aide/article/puis-je-faire-une-demande-de-convention-avec-une-entreprise-non-inscrite-sur-le-site-f9z742/",
    },
    {
      title: "Quelles sont les étapes de signature de la convention ?",
      description: `Etape 1 : Signature du bénéficiaire et de l'entreprise. Le bénéficiaire et L'entreprise reçoivent un email appelé "Immersion Facilitée : Confirmez une demande d'immersion" ...`,
      url: "https://immersion-facile.beta.gouv.fr/aide/article/quelles-sont-les-etapes-de-signature-de-la-convention-17hf59q/",
    },
    {
      title:
        "Le bénéficiaire, l'entreprise ou le prescripteur n'a pas reçu la convention à signer",
      description: `Que vous soyez bénéficiaire, entreprise accueillante ou prescripteur d'immersions, il est nécéssaire de pouvoir recevoir nos emails afin de signer éléctroniquement la convention....`,
      url: "https://immersion-facile.beta.gouv.fr/aide/article/le-beneficiaire-lentreprise-ou-le-prescripteur-na-pas-recu-la-convention-a-signer-125bxxd/",
    },
  ],
};
