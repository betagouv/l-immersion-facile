import {
  ActionCreatorWithPayload,
  PayloadAction,
  createSlice,
} from "@reduxjs/toolkit";
import { keys } from "shared";
import { createUserOnAgencySlice } from "src/core-logic/domain/agencies/create-user-on-agency/createUserOnAgency.slice";
import { fetchAgencySlice } from "src/core-logic/domain/agencies/fetch-agency/fetchAgency.slice";
import { removeUserFromAgencySlice } from "src/core-logic/domain/agencies/remove-user-from-agency/removeUserFromAgency.slice";
import { updateAgencySlice } from "src/core-logic/domain/agencies/update-agency/updateAgency.slice";
import { updateUserOnAgencySlice } from "src/core-logic/domain/agencies/update-user-on-agency/updateUserOnAgency.slice";
import { apiConsumerSlice } from "src/core-logic/domain/apiConsumer/apiConsumer.slice";
import { conventionSlice } from "src/core-logic/domain/convention/convention.slice";

import { assessmentSlice } from "src/core-logic/domain/assessment/assessment.slice";
import { discussionSlice } from "src/core-logic/domain/discussion/discussion.slice";
import { establishmentSlice } from "src/core-logic/domain/establishment/establishment.slice";
import { establishmentBatchSlice } from "src/core-logic/domain/establishmentBatch/establishmentBatch.slice";
import { inclusionConnectedSlice } from "src/core-logic/domain/inclusionConnected/inclusionConnected.slice";
import { searchSlice } from "src/core-logic/domain/search/search.slice";
import { icUsersAdminSlice } from "../admin/icUsersAdmin/icUsersAdmin.slice";
import { partnersErroredConventionSlice } from "../partnersErroredConvention/partnersErroredConvention.slice";

const topics = [
  "api-consumer-global",
  "dashboard-discussion",
  "dashboard-discussion-rejection",
  "broadcast-convention-again",
  "partner-conventions",
  "agency-user",
  "api-consumer-names",
  "dashboard-agency-register-user",
  "auth-global",
  "establishments-batch",
  "user",
  "agency-user-for-dashboard",
  "search-result",
  "establishment-modification-link",
  "form-establishment",
  "siret-input",
  "agency-for-dashboard",
  "assessment",
] as const;

export type FeedbackLevel = "info" | "success" | "warning" | "error";

export type Feedback = {
  on: ActionKind;
  level: FeedbackLevel;
  message: string;
  title?: string;
};

export type FeedbackTopic = (typeof topics)[number];

type Feedbacks = Partial<Record<FeedbackTopic, Feedback>>;

const initialFeedbacks: Feedbacks = {};

type FeedbackWithActionName = {
  action: ActionCreatorWithPayload<any, string>;
  title: Feedback["title"];
  message: Feedback["message"];
};

type ActionKind = "create" | "update" | "fetch" | "delete";

export type ActionKindAndLevel = `${ActionKind}.${Feedback["level"]}`;

type PayloadWithFeedbackTopic = {
  feedbackTopic: FeedbackTopic;
};

export type PayloadActionWithFeedbackTopic<
  // biome-ignore lint/complexity/noBannedTypes: need to use {}
  P extends Record<string, unknown> = {},
> = PayloadAction<P & PayloadWithFeedbackTopic>;

export type PayloadActionWithFeedbackTopicError =
  PayloadActionWithFeedbackTopic<{ errorMessage: string }>;

export const feedbackMapping: Record<
  FeedbackTopic,
  Partial<Partial<Record<ActionKindAndLevel, FeedbackWithActionName>>>
> = {
  "auth-global": {},
  "api-consumer-global": {
    "create.success": {
      action: apiConsumerSlice.actions.saveApiConsumerSucceeded,
      title: "Le consommateur d'API a bien été créé",
      message:
        "Le consommateur d'API a bien été créé, il peut commencer à utiliser l'api",
    },
    "create.error": {
      action: apiConsumerSlice.actions.saveApiConsumerFailed,
      title: "Problème lors de la création du consommateur d'API",
      message:
        "Une erreur est survenue lors de la création du consommateur d'API",
    },
    "update.success": {
      action: apiConsumerSlice.actions.updateApiConsumerSucceeded,
      title: "Le consommateur d'API a bien été mis à jour",
      message:
        "Le consommateur d'API a bien été mis à jour, il peut continuer à utiliser l'api",
    },
  },
  "broadcast-convention-again": {
    "create.success": {
      action: conventionSlice.actions.broadcastConventionToPartnerSucceeded,
      title: "La convention a bien été rediffusée",
      message:
        "La convention a bien été rediffusée au partenaire. Vous pouvez vous rapprocher du partenaire pour le vérifier.",
    },
    "create.info": {
      action: conventionSlice.actions.broadcastConventionToPartnerRequested,
      title: "La convention est en cours de rediffusion",
      message:
        "La convention est en cours de rediffusion au partenaire. Cela peut prendre une quinzaine de secondes.",
    },
    "create.error": {
      action: conventionSlice.actions.broadcastConventionToPartnerFailed,
      title: "Problème rencontré lors de la rediffusion au partenaire",
      message:
        "Une erreur est survenue. Veuillez consulter le tableau de bord.",
    },
  },
  "dashboard-discussion-rejection": {
    "update.success": {
      action: discussionSlice.actions.updateDiscussionStatusSucceeded,
      title: "La candidature a bien été rejetée",
      message:
        "La candidature a bien été rejetée, un email a été envoyé au candidat",
    },
    "update.error": {
      action: discussionSlice.actions.updateDiscussionStatusFailed,
      title: "Problème lors du rejet de la candidature",
      message: "Une erreur est survenue lors du rejet de la candidature",
    },
  },
  "dashboard-discussion": {
    "fetch.success": {
      action: discussionSlice.actions.fetchDiscussionSucceeded,
      title: "Les discussions ont bien été récupérées",
      message: "Les discussions ont bien été récupérées",
    },
    "fetch.error": {
      action: discussionSlice.actions.fetchDiscussionFailed,
      title: "Problème lors de la récupération des discussions",
      message:
        "Une erreur est survenue lors de la récupération des discussions",
    },
  },
  "partner-conventions": {
    "update.success": {
      action: partnersErroredConventionSlice.actions.markAsHandledSucceeded,
      title: "La convention a bien été marquée comme traitée",
      message: "La convention a bien été marquée comme traitée.",
    },
    "update.error": {
      action: partnersErroredConventionSlice.actions.markAsHandledFailed,
      title: "Problème rencontré",
      message:
        "Problème rencontré lors du marquage de la convention comme traitée.",
    },
  },
  "api-consumer-names": {
    "fetch.error": {
      action: apiConsumerSlice.actions.fetchApiConsumerNamesFailed,
      title: "Problème rencontré",
      message:
        "Une erreur est survenue lors de la récupération de la liste des partenaires à qui rediffuser la convention",
    },
  },
  "agency-user": {
    "update.success": {
      action: icUsersAdminSlice.actions.updateUserOnAgencySucceeded,
      title: "L'utilisateur a été mis à jour",
      message: "Les données de l'utilisateur (rôles) ont été mises à jour.",
    },
    "update.error": {
      action: icUsersAdminSlice.actions.updateUserOnAgencyFailed,
      title: "Problème lors de la mise à jour de l'utilisateur",
      message:
        "Une erreur est survenue lors de la mise à jour de l'utilisateur",
    },
    "create.success": {
      action: icUsersAdminSlice.actions.createUserOnAgencySucceeded,
      title: "L'utilisateur a été créé",
      message: "L'utilisateur a été créé et associé à cette agence.",
    },
    "create.error": {
      action: icUsersAdminSlice.actions.createUserOnAgencyFailed,
      title: "Problème lors de la création de l'utilisateur",
      message: "Une erreur est survenue lors de la création de l'utilisateur",
    },
    "delete.success": {
      action: icUsersAdminSlice.actions.removeUserFromAgencySucceeded,
      title: "L'utilisateur n'est plus rattaché à cette agence",
      message: "Les données de l'utilisateur (rôles) ont été mises à jour.",
    },
    "delete.error": {
      action: icUsersAdminSlice.actions.removeUserFromAgencyFailed,
      title:
        "Problème lors de la suppression du rattachement l'utilisateur à cette agence",
      message:
        "Une erreur est survenue lors de la suppression du rattachement de l'utilisateur.",
    },
  },
  "dashboard-agency-register-user": {
    "fetch.error": {
      action: inclusionConnectedSlice.actions.currentUserFetchFailed,
      title: "Erreur",
      message: "Erreur lors de la récupération des infos de l'utilisateur",
    },
    "create.success": {
      action: inclusionConnectedSlice.actions.registerAgenciesSucceeded,
      title: "Votre demande de rattachement a bien été prise en compte",
      message:
        "Elle sera étudiée prochainement par un administrateur et vous serez informé de sa décision.",
    },
    "create.error": {
      action: inclusionConnectedSlice.actions.registerAgenciesFailed,
      title: "Erreur lors de la demande de rattachement à une agence",
      message: "Une erreur est survenue lors du rattachement de l'utilisateur",
    },
    "delete.success": {
      action: removeUserFromAgencySlice.actions.removeUserFromAgencySucceeded,
      title:
        "La demande d’accès a bien été annulée. L’administrateur de l’organisme ne la verra plus.",
      message: "L’administrateur de l’organisme ne la verra plus.",
    },
    "delete.error": {
      action: removeUserFromAgencySlice.actions.removeUserFromAgencyFailed,
      title:
        "Problème lors de l'annulation de la demande d’accès de l'utilisateur à cette agence",
      message:
        "Une erreur est survenue lors de l'annulation de la demande d'accès de l'utilisateur.",
    },
  },
  "agency-user-for-dashboard": {
    "fetch.error": {
      action: fetchAgencySlice.actions.fetchAgencyUsersFailed,
      title:
        "Problème rencontré lors de la récupération de la liste des utilisateurs",
      message:
        "Une erreur est survenue lors de la récupération de la liste des utilisateurs de cette agence",
    },
    "update.success": {
      action: updateUserOnAgencySlice.actions.updateUserAgencyRightSucceeded,
      title: "L'utilisateur a été mis à jour",
      message: "Les données de l'utilisateur (rôles) ont été mises à jour.",
    },
    "update.error": {
      action: updateUserOnAgencySlice.actions.updateUserAgencyRightFailed,
      title: "Problème lors de la mise à jour de l'utilisateur",
      message:
        "Une erreur est survenue lors de la mise à jour de l'utilisateur",
    },
    "create.success": {
      action: createUserOnAgencySlice.actions.createUserOnAgencySucceeded,
      title: "L'utilisateur a été créé",
      message: "L'utilisateur a été créé et associé à cette agence.",
    },
    "create.error": {
      action: createUserOnAgencySlice.actions.createUserOnAgencyFailed,
      title: "Problème lors de la création de l'utilisateur",
      message: "Une erreur est survenue lors de la création de l'utilisateur",
    },
    "delete.success": {
      action: removeUserFromAgencySlice.actions.removeUserFromAgencySucceeded,
      title: "L'utilisateur n'est plus rattaché à cette agence",
      message: "Les données de l'utilisateur (rôles) ont été mises à jour.",
    },
    "delete.error": {
      action: removeUserFromAgencySlice.actions.removeUserFromAgencyFailed,
      title:
        "Problème lors de la suppression du rattachement l'utilisateur à cette agence",
      message:
        "Une erreur est survenue lors de la suppression du rattachement de l'utilisateur.",
    },
  },
  "agency-for-dashboard": {
    "fetch.error": {
      action: fetchAgencySlice.actions.fetchAgencyFailed,
      title:
        "Problème rencontré lors de la récupération des données de l'agence",
      message:
        "Une erreur est survenue lors de la récupération des données de cette agence",
    },
    "update.success": {
      action: updateAgencySlice.actions.updateAgencySucceeded,
      title: "L'agence a été mis à jour",
      message: "Les données de l'agence ont été mises à jour.",
    },
    "update.error": {
      action: updateAgencySlice.actions.updateAgencyFailed,
      title: "Problème lors de la mise à jour de l'agence",
      message: "Une erreur est survenue lors de la mise à jour de l'agence",
    },
  },
  "establishments-batch": {
    "create.success": {
      action: establishmentBatchSlice.actions.addEstablishmentBatchSucceeded,
      title: "Le groupe d'entreprises a bien été créé",
      message: "L'import en masse a réussi, voici le détail :",
    },
  },
  user: {
    "update.success": {
      action: updateUserOnAgencySlice.actions.updateUserAgencyRightSucceeded,
      title: "L'utilisateur a été mis à jour",
      message: "Les données de l'utilisateur (rôles) ont été mises à jour.",
    },
    "update.error": {
      action: updateUserOnAgencySlice.actions.updateUserAgencyRightFailed,
      title: "Problème lors de la mise à jour de l'utilisateur",
      message:
        "Une erreur est survenue lors de la mise à jour de l'utilisateur",
    },
    "delete.success": {
      action: removeUserFromAgencySlice.actions.removeUserFromAgencySucceeded,
      title:
        "La demande d’accès a bien été annulée. L’administrateur de l’organisme ne la verra plus.",
      message: "L’administrateur de l’organisme ne la verra plus.",
    },
    "delete.error": {
      action: removeUserFromAgencySlice.actions.removeUserFromAgencyFailed,
      title:
        "Problème lors de l'annulation de la demande d’accès de l'utilisateur à cette agence",
      message:
        "Une erreur est survenue lors de l'annulation de la demande d'accès de l'utilisateur.",
    },
  },
  "search-result": {
    "fetch.error": {
      action: searchSlice.actions.fetchSearchResultFailed,
      title: "Oups !",
      message:
        "L'offre ne peut plus être affichée, veuillez relancer une recherche d'offre d'immersion pour retrouver une offre.",
    },
  },
  "establishment-modification-link": {
    "create.error": {
      action: establishmentSlice.actions.sendModificationLinkFailed,
      title: "Lien non envoyé",
      message:
        "Il y a eu un problème lors de l'envoi du lien de modification de l'entreprise.",
    },
    "create.success": {
      action: establishmentSlice.actions.sendModificationLinkSucceeded,
      title: "Lien envoyé",
      message:
        "Le lien de modification de l'entreprise a bien été envoyé par email.",
    },
  },
  "form-establishment": {
    "fetch.error": {
      action: establishmentSlice.actions.fetchEstablishmentFailed,
      title: "Problème lors de la recuperation des données de l'entreprise",
      message:
        "Une erreur est survenue lors de la recuperation des données de l'entreprise",
    },
    "create.success": {
      action: establishmentSlice.actions.createEstablishmentSucceeded,
      title: "L'entreprise a bien été créée",
      message: "L'entreprise a bien été ajoutée à notre annuaire.",
    },
    "create.error": {
      action: establishmentSlice.actions.createEstablishmentFailed,
      title: "Problème lors de la création de l'entreprise",
      message: "Une erreur est survenue lors de la création de l'entreprise",
    },
    "update.error": {
      action: establishmentSlice.actions.updateEstablishmentFailed,
      title: "Problème lors de la mise à jour de l'entreprise",
      message: "Une erreur est survenue lors de la mise à jour de l'entreprise",
    },
    "update.success": {
      action: establishmentSlice.actions.updateEstablishmentSucceeded,
      title: "L'entreprise a bien été mise à jour",
      message: "L'entreprise a bien été mise à jour",
    },
    "delete.error": {
      action: establishmentSlice.actions.deleteEstablishmentFailed,
      title: "Problème lors de la suppression de l'entreprise",
      message: "Une erreur est survenue lors de la suppression de l'entreprise",
    },
    "delete.success": {
      action: establishmentSlice.actions.deleteEstablishmentSucceeded,
      title: "L'entreprise a bien été supprimée",
      message: "L'entreprise a bien été supprimée",
    },
  },
  "siret-input": {},
  assessment: {
    "create.success": {
      action: assessmentSlice.actions.creationSucceeded,
      title: "Bilan envoyé",
      message: "Le bilan a bien été envoyé",
    },
    "create.error": {
      action: assessmentSlice.actions.creationFailed,
      title: "Problème lors de l'envoi du bilan",
      message: "Une erreur est survenue lors de l'envoi du bilan",
    },
    "fetch.error": {
      action: assessmentSlice.actions.getAssessmentFailed,
      title: "Problème lors de la récupération du bilan",
      message: "Un problème est survenu lors de la récupération du bilan",
    },
  },
};

export const feedbackSlice = createSlice({
  name: "feedbacks",
  initialState: initialFeedbacks,
  reducers: {
    clearFeedbacksTriggered: () => {
      return initialFeedbacks;
    },
  },
  extraReducers: (builder) => {
    keys(feedbackMapping).map((topic) => {
      const feedbackByTopic = feedbackMapping[topic];

      return keys(feedbackByTopic).map((kind) => {
        if (!kind) return;
        return keys(kind).map(() => {
          const uniqueActions = Array.from(
            new Set(
              keys(feedbackByTopic).map(
                (level) => feedbackByTopic[level]?.action,
              ),
            ),
          );
          return uniqueActions.map((action) => {
            if (!action) return;
            return builder.addMatcher(
              isActionWithFeedbackTopic(action.type),
              (state, action) => {
                const actionKindAndLevel = keys(
                  feedbackMapping[action.payload.feedbackTopic],
                ).find((level) => {
                  const feedback =
                    feedbackMapping[action.payload.feedbackTopic][level];
                  return feedback && feedback.action.type === action.type;
                });
                if (!actionKindAndLevel) return;
                const feedbackForActionTopic =
                  feedbackMapping[action.payload.feedbackTopic][
                    actionKindAndLevel
                  ];
                if (!feedbackForActionTopic) return;
                const { level, actionKind } =
                  getLevelAndActionKindFromActionKindAndLevel(
                    actionKindAndLevel,
                  );

                state[action.payload.feedbackTopic] = {
                  on: actionKind,
                  level,
                  message:
                    action.payload.errorMessage ??
                    feedbackForActionTopic.message,
                  title: feedbackForActionTopic.title,
                };
              },
            );
          });
        });
      });
    });
  },
});

const isActionWithFeedbackTopic =
  <T extends Record<string, any>>(actionType: string) =>
  (action: PayloadAction<T>): action is PayloadActionWithFeedbackTopic<T> =>
    "payload" in action &&
    typeof action.payload === "object" &&
    action.payload &&
    "feedbackTopic" in action.payload &&
    action.type === actionType;

export const getLevelAndActionKindFromActionKindAndLevel = (
  actionKindAndLevel: ActionKindAndLevel,
): {
  level: FeedbackLevel;
  actionKind: ActionKind;
} => {
  const [actionKind, level] = actionKindAndLevel.split(".") as [
    ActionKind,
    FeedbackLevel,
  ];
  return { level, actionKind };
};
