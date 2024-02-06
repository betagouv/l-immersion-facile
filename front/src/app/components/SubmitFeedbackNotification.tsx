import { fr } from "@codegouvfr/react-dsfr";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import React, { ReactNode } from "react";
import {
  SubmitFeedBack,
  isFeedbackError,
} from "src/core-logic/domain/SubmitFeedback";

export type SubmitFeedbackProps<T extends string> = {
  submitFeedback: SubmitFeedBack<T>;
  messageByKind: Record<T, { title: string; message: NonNullable<ReactNode> }>;
};

export const SubmitFeedbackNotification = <T extends string>({
  submitFeedback,
  messageByKind,
}: SubmitFeedbackProps<T>) => {
  if (submitFeedback.kind === "idle") return null;

  return (
    <div className={fr.cx("fr-my-2w")}>
      {isFeedbackError(submitFeedback) ? (
        <Alert
          severity="error"
          title="Désolé : nous n'avons pas été en mesure d'enregistrer vos informations. Veuillez réessayer ultérieurement"
          description={submitFeedback.errorMessage}
        />
      ) : (
        <Alert
          severity="success"
          title={messageByKind[submitFeedback.kind].title}
          description={messageByKind[submitFeedback.kind].message}
        />
      )}
    </div>
  );
};
