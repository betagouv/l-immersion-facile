import React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { fr, FrIconClassName } from "@codegouvfr/react-dsfr";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { ButtonsGroup } from "@codegouvfr/react-dsfr/ButtonsGroup";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ConventionStatus,
  ConventionStatusWithJustification,
  doesStatusNeedsJustification,
  domElementIds,
  UpdateConventionStatusRequestDto,
  WithStatusJustification,
  withStatusJustificationSchema,
} from "shared";

export type VerificationActionButtonProps = {
  onSubmit: (params: UpdateConventionStatusRequestDto) => void;
  disabled?: boolean;
  newStatus: VerificationActions;
  children: string;
};

type VerificationActions = Exclude<
  ConventionStatus,
  "READY_TO_SIGN" | "PARTIALLY_SIGNED" | "IN_REVIEW"
>;

const { JustificationModal, openJustificationModal, closeJustificationModal } =
  createModal({
    name: "justification",
    isOpenedByDefault: false,
  });

export const VerificationActionButton = ({
  newStatus,
  disabled,
  children,
  onSubmit,
}: VerificationActionButtonProps) => {
  const iconByStatus: Partial<Record<ConventionStatus, FrIconClassName>> = {
    REJECTED: "fr-icon-close-circle-line",
    DRAFT: "fr-icon-edit-line",
    CANCELLED: "fr-icon-delete-bin-line",
  };
  const selectedIcon = iconByStatus[newStatus];
  const actionButtonStatusId: Record<VerificationActions, string> = {
    DRAFT: domElementIds.manageConvention.conventionValidationRequestEditButton,
    REJECTED: domElementIds.manageConvention.conventionValidationRejectButton,
    ACCEPTED_BY_VALIDATOR:
      domElementIds.manageConvention.conventionValidationValidateButton,
    ACCEPTED_BY_COUNSELLOR:
      domElementIds.manageConvention.conventionValidationValidateButton,
    CANCELLED: domElementIds.manageConvention.conventionValidationCancelButton,
  };

  return (
    <>
      <Button
        iconId={selectedIcon ?? "fr-icon-checkbox-circle-line"}
        priority={newStatus === "REJECTED" ? "secondary" : "primary"}
        onClick={() => {
          doesStatusNeedsJustification(newStatus)
            ? openJustificationModal()
            : onSubmit({ status: newStatus });
        }}
        className={fr.cx("fr-m-1w")}
        disabled={disabled}
        nativeButtonProps={{
          id: actionButtonStatusId[newStatus],
        }}
      >
        {children}
      </Button>

      {doesStatusNeedsJustification(newStatus) && (
        <JustificationModal title={children}>
          <JustificationModalContent
            onSubmit={onSubmit}
            closeModal={closeJustificationModal}
            newStatus={newStatus}
          />
        </JustificationModal>
      )}
    </>
  );
};

const JustificationModalContent = ({
  onSubmit,
  closeModal,
  newStatus,
}: {
  onSubmit: (params: UpdateConventionStatusRequestDto) => void;
  closeModal: () => void;
  newStatus: VerificationActions;
}) => {
  const { register, handleSubmit } = useForm<WithStatusJustification>({
    resolver: zodResolver(withStatusJustificationSchema),
    mode: "onTouched",
    defaultValues: { statusJustification: "" },
  });
  const onFormSubmit: SubmitHandler<WithStatusJustification> = (values) => {
    onSubmit({ ...values, status: newStatus });
    closeModal();
  };
  return (
    <>
      {newStatus === "DRAFT" && (
        <Alert
          severity="warning"
          title="Attention !"
          className={fr.cx("fr-mb-2w")}
          description="Ne surtout pas demander de modification si une signature manque !
      Cela revient à annuler les signatures déjà enregistrées. Pour
      relancer un signataire manquant, le contacter par mail."
        />
      )}
      {newStatus === "REJECTED" && (
        <Alert
          severity="warning"
          title="Attention !"
          className={fr.cx("fr-mb-2w")}
          description="Ne surtout pas refuser une immersion si une signature manque ! Cela
  revient à annuler les signatures déjà enregistrées. Pour relancer un
  signataire manquant, le contacter par mail."
        />
      )}
      {newStatus === "CANCELLED" && (
        <Alert
          severity="warning"
          title="Attention ! Cette opération est irréversible !"
          className={fr.cx("fr-mb-2w")}
          description="Vous souhaitez annuler une convention qui a déjà été validée. Veuillez indiquer votre nom et prénom afin de garantir un suivi des annulations de convention."
        />
      )}
      {doesStatusNeedsJustification(newStatus) && (
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <Input
            textArea
            label={inputLabelByStatus[newStatus]}
            nativeTextAreaProps={{
              ...register("statusJustification"),
            }}
          />
          <ButtonsGroup
            alignment="center"
            inlineLayoutWhen="always"
            buttons={[
              {
                type: "button",
                priority: "secondary",
                onClick: closeModal,
                nativeButtonProps: {
                  id: domElementIds.manageConvention
                    .justificationModalCancelButton,
                },
                children: "Annuler",
              },
              {
                type: "submit",
                nativeButtonProps: {
                  id: domElementIds.manageConvention
                    .justificationModalSubmitButton,
                },
                children: confirmByStatus[newStatus],
              },
            ]}
          />
        </form>
      )}
    </>
  );
};

const inputLabelByStatus: Record<ConventionStatusWithJustification, string> = {
  DRAFT: "Précisez la raison et la modification nécessaire",
  REJECTED: "Pourquoi l'immersion est-elle refusée ?",
  CANCELLED: "Pourquoi souhaitez-vous annuler cette convention?",
};

const confirmByStatus: Record<ConventionStatusWithJustification, string> = {
  DRAFT: "Confirmer la demande de modification",
  REJECTED: "Confirmer le refus",
  CANCELLED: "Confirmer l'annulation",
};
