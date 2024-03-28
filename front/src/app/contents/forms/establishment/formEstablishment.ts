import {
  BusinessContactDto,
  FormEstablishmentDto,
  SiretDto,
  domElementIds,
  immersionFacileContactEmail,
} from "shared";
import { FormFieldsObjectForContent } from "src/app/hooks/formContents.hooks";
import { FormFieldAttributesForContent } from "../types";

type FormEstablishmentField = Partial<
  | Exclude<
      keyof FormEstablishmentDto,
      "id" | "naf" | "businessContact" | "source" | "isSearchable"
    >
  | `businessContact.${keyof BusinessContactDto}`
  | "maxContactPerWeekWhenAvailable"
>;

export type FormEstablishmentFieldsLabels = FormFieldsObjectForContent<
  Record<FormEstablishmentField, FormFieldAttributesForContent>
>;

export const formEstablishmentFieldsLabels: FormEstablishmentFieldsLabels = {
  siret: {
    label: "Indiquez le SIRET de la structure d'accueil",
    id: domElementIds.establishment.create.siret,
    required: true,
  },

  businessName: {
    label: "Vérifiez le nom (raison sociale) de votre établissement",
    id: domElementIds.establishment.create.businessName,
    required: true,
  },
  businessNameCustomized: {
    label:
      "Indiquez le nom de l'enseigne de l'établissement d'accueil, si elle diffère de la raison sociale",
    id: domElementIds.establishment.create.businessNameCustomized,
    autoComplete: "organization",
    hintText:
      "Nom sous lequel vous souhaitez apparaitre dans les résultats de recherche",
    placeholder: "Ex : Nom de mon enseigne (optionnel)",
  },
  businessAddresses: {
    label: "Vérifiez l'adresse de votre établissement",
    required: true,
    id: domElementIds.establishment.create.businessAddresses,
    placeholder: "Ex : 26 rue du labrador, 37000 Tours",
  },
  "businessContact.lastName": {
    label: "Nom du référent",
    required: true,
    id: domElementIds.establishment.create.businessContact.lastName,
  },
  "businessContact.firstName": {
    label: "Prénom du référent",
    required: true,
    id: domElementIds.establishment.create.businessContact.firstName,
  },
  "businessContact.job": {
    label: "Fonction du référent",
    required: true,
    id: domElementIds.establishment.create.businessContact.job,
  },
  "businessContact.phone": {
    label: "Numéro de téléphone (ne sera pas communiqué directement)",
    required: true,
    id: domElementIds.establishment.create.businessContact.phone,
  },
  "businessContact.email": {
    label: "E-mail",
    required: true,
    id: domElementIds.establishment.create.businessContact.email,
  },
  "businessContact.copyEmails": {
    label: "Autres destinataires",
    hintText: "Adresses mail à mettre en copie",
    placeholder: "Ex : cc1@mail.com, cc2@mail.com (optionnel)",
    id: domElementIds.establishment.create.businessContact.copyEmails,
  },
  "businessContact.contactMethod": {
    label: "Comment souhaitez-vous que les candidats vous contactent ?",
    required: true,
    id: domElementIds.establishment.create.businessContact.contactMethod,
  },
  isEngagedEnterprise: {
    label:
      "Mon entreprise est membre de la communauté « Les entreprises s'engagent »",
    id: domElementIds.establishment.create.isEngagedEnterprise,
  },
  fitForDisabledWorkers: {
    label:
      "Mon entreprise est prête à accueillir des personnes en situation de handicap",
    id: domElementIds.establishment.create.fitForDisabledWorkers,
  },
  appellations: {
    label: "",
    id: domElementIds.establishment.create.appellations,
  },
  website: {
    label: "URL vers votre site internet",
    id: domElementIds.establishment.create.website,
    placeholder: "Ex : https://mon-site-internet.fr (optionnel)",
  },
  additionalInformation: {
    label: "Informations complémentaires",
    id: domElementIds.establishment.create.additionalInformation,
    hintText:
      "En information complémentaire, nous vous conseillons de valoriser votre histoire afin de donner envie à un candidat de découvrir un métier au sein de votre établissement.",
    placeholder:
      "Ex : ma biographie d’entreprise (valeurs, écosystème, projections), mon potentiel d’embauche ou toute autre information essentielle pour l’accueil du bénéficiaire au sein de mon établissement (optionnel)",
  },
  maxContactsPerWeek: {
    label:
      "Au maximum, combien de mises en relation souhaitez-vous recevoir par semaine ?",
    hintText:
      "Par exemple, en renseignant 5 : si vous avez déjà reçu 5 demandes cette semaine, vous n'apparaîtrez plus dans la liste des entreprises accueillantes jusqu'à la semaine suivante.",
    id: domElementIds.establishment.create.maxContactsPerWeek,
  },
  maxContactPerWeekWhenAvailable: {
    label:
      "Quand vous serez à nouveau disponible, combien de mises en relation par semaine souhaiteriez-vous recevoir ?",
    hintText:
      "Par exemple, en renseignant 5 : si vous avez déjà reçu 5 demandes cette semaine, vous n'apparaîtrez plus dans la liste des entreprises accueillantes jusqu'à la semaine suivante.",
    id: domElementIds.establishment.create.maxContactsPerWeek,
  },
  nextAvailabilityDate: {
    label: "Quand serez-vous à nouveau disponible ?",
    id: domElementIds.establishment.create.nextAvailabilityDateInput,
  },
  searchableBy: {
    label: "Qui souhaitez-vous accueillir en immersion ?",
    id: domElementIds.establishment.create.searchableBy,
  },
  acquisitionKeyword: {
    label: "",
    id: "",
  },
  acquisitionCampaign: {
    label: "",
    id: "",
  },
};

export const mailtoHref = (siret: SiretDto) => {
  const lineBreak = "%0D%0A";
  const deleteEstablishmentSubject = "Demande de suppression d'entreprise";
  const deleteEstablishmentBody = (siret: SiretDto) =>
    `Bonjour,${lineBreak}Je souhaite supprimer les données de mon entreprise dont le numéro de SIRET est ${siret}.${lineBreak}Cordialement.`;

  return `mailto:${immersionFacileContactEmail}?subject=${deleteEstablishmentSubject}&body=${deleteEstablishmentBody(
    siret,
  )}`;
};
