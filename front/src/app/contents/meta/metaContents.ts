import { AdminTab, GroupName } from "shared";
import { StandardPageSlugs } from "src/app/routes/routeParams/standardPage";
import { routes } from "src/app/routes/routes";

export type MetaContentType = {
  title: string;
  description: string;
};

export const defaultMetaContents: MetaContentType = {
  title: "PMSMP: Immersion Facile",
  description: "Faciliter la réalisation des immersions professionnelles.",
};

export const metaContents: Partial<
  Record<keyof typeof routes, MetaContentType>
> = {
  addAgency: {
    title: "Formulaire d'ajout d'un prescripteur",
    description: "Devenir prescripteur de PMSMP et immersions professionnelles",
  },
  admin: {
    title: "AdminTab",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  adminRoot: {
    title: "Admin",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  debugPopulateDB: {
    title: "DebugPopulateDB",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  editFormEstablishment: {
    title: "Formulaire d'édition entreprise",
    description:
      "Modifier une entreprise accueillante de PMSMP et immersions professionnelles.",
  },
  errorRedirect: {
    title: "Erreur",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  formEstablishment: {
    title: "Formulaire de référencement entreprise",
    description:
      "Devenir entreprise accueillante de PMSMP et immersions professionnelles.",
  },
  formEstablishmentForExternals: {
    title: "Formulaire de référencement entreprise",
    description:
      "Devenir entreprise accueillante de PMSMP et immersions professionnelles.",
  },
  home: {
    title: "Accueil Immersion Facilitée",
    description:
      "Faciliter la réalisation des immersions professionnelles et PMSMP.",
  },
  homeCandidates: {
    title: "Accueil béneficiaires",
    description:
      "Trouver une entreprise pour votre Immersion Professionnelle ou PMSMP et faire une demande de convention.",
  },
  homeEstablishments: {
    title: "Accueil entreprises",
    description:
      "Devenir entreprise accueillante de PMSMP et immersions professionnelles ou modifier une fiche entreprise",
  },
  homeAgencies: {
    title: "Accueil prescripteurs",
    description: "Devenir prescripteur de PMSMP et immersions professionnelles",
  },
  conventionImmersion: {
    title: "Formulaire de demande d'immersion",
    description:
      "Démarrer une demande de convention pour une PMSMP ou Immersion Professionnelle.",
  },
  conventionMiniStage: {
    title: "Demande de mini-stage",
    description:
      "Démarrer une demande de convention pour un mini-stage, stage de 3ème ou stage de seconde.",
  },
  conventionCustomAgency: {
    title: "Demande de convention d'immersion",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  manageConvention: {
    title: "Vérification de convention d'immersion",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  conventionToSign: {
    title: "Vérifier et signer une convention d'immersion",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  conventionStatusDashboard: {
    title: "Statut convention",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  assessment: {
    title: "Bilan d'immersion",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  renewConventionMagicLink: {
    title: "Rafraichir le lien",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  stats: {
    title: "Statistiques",
    description:
      "Découvrir les statistiques et l'impact du site Immersion Facile",
  },
  search: {
    title:
      "Rechercher une entreprise pour réaliser une immersion professionnelle",
    description:
      "Utilisez notre moteur de recherche pour trouver une entreprise accueillante d'Immersions Professionnelles ou PMSMP",
  },
};

export const standardMetaContent: Record<StandardPageSlugs, MetaContentType> = {
  "mentions-legales": {
    title: "Mentions légales",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  cgu: {
    title: "Conditions générales d'utilisation",
    description: "Page des conditions générales d'utilisation",
  },
  "politique-de-confidentialite": {
    title: "Politique de confidentialité",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  accessibilite: {
    title: "Accessibilité",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  "plan-du-site": {
    title: "Plan du site",
    description: "Plan du site: Immersion Facile",
  },
  "obligations-des-parties": {
    title: "Obligations des parties",
    description: "Faciliter la réalisation des immersions professionnelles.",
  },
  budget: {
    title: "Budget",
    description: "Présentation du budget d'Immersion Facilitée",
  },
};

export const groupMetaContent = (groupName: GroupName): MetaContentType => ({
  title: `${groupName} - toutes les immersions`,
  description: `Toutes les immersions proposées par ${groupName}`,
});

export const adminMetaContent: Record<AdminTab, MetaContentType> = {
  conventions: {
    title: "Admin: conventions",
    description: "Page admin: Conventions",
  },
  events: {
    title: "Admin: évenement",
    description: "Page admin: Evenement",
  },
  agencies: {
    title: "Admin: validation d'agence",
    description: "Page admin: Validation d'agence",
  },
  notifications: {
    title: "Admin: notifications",
    description: "Page admin: Notifications",
  },
  "technical-options": {
    title: "Admin: options techniques",
    description: "Page admin: Options techniques",
  },
  "email-preview": {
    title: "Admin: aperçus email",
    description: "Page admin: Aperçus email",
  },
  establishments: {
    title: "Admin: établissements",
    description: "Page admin: Établissements",
  },
};
