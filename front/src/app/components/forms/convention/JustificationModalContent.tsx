import { fr } from "@codegouvfr/react-dsfr";
import Alert from "@codegouvfr/react-dsfr/Alert";
import ButtonsGroup from "@codegouvfr/react-dsfr/ButtonsGroup";
import Input from "@codegouvfr/react-dsfr/Input";
import Select from "@codegouvfr/react-dsfr/SelectNext";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  ConventionDto,
  ConventionStatusWithJustification,
  Role,
  Signatory,
  UpdateConventionStatusRequestDto,
  doesStatusNeedsJustification,
  domElementIds,
  signatoryTitleByRole,
  updateConventionStatusRequestSchema,
} from "shared";
import { ModalWrapperProps } from "src/app/components/forms/convention/VerificationActionButton";
import { makeFieldError } from "src/app/hooks/formContents.hooks";

export const JustificationModalContent = ({
  onSubmit,
  closeModal,
  newStatus,
  convention,
  currentSignatoryRole,
}: {
  onSubmit: (params: UpdateConventionStatusRequestDto) => void;
  closeModal: () => void;
  newStatus: ConventionStatusWithJustification;
  convention: ConventionDto;
  currentSignatoryRole: Role;
  onModalPropsChange: (props: Partial<ModalWrapperProps>) => void;
}) => {
  const { register, handleSubmit, formState } = useForm<
    Partial<UpdateConventionStatusRequestDto>
  >({
    resolver: zodResolver(updateConventionStatusRequestSchema),
    mode: "onTouched",
    defaultValues: {
      status: newStatus,
      conventionId: convention.id,
    },
  });

  const getFieldError = makeFieldError(formState);

  const onFormSubmit: SubmitHandler<Partial<UpdateConventionStatusRequestDto>> =
    (values) => {
      onSubmit(updateConventionStatusRequestSchema.parse(values));
      closeModal();
    };

  const conventionSignatories: Signatory[] = Object.values(
    convention.signatories,
  );
  const getSignatoryOptions = () => {
    const signatoryOptions = conventionSignatories.map((signatory) =>
      signatory && signatory.role !== currentSignatoryRole
        ? {
            label: `${signatory.firstName} ${signatory.lastName} - ${
              signatoryTitleByRole[signatory.role]
            }`,
            value: signatory.role,
          }
        : {
            label: "Vous même",
            value: currentSignatoryRole,
          },
    );

    return [
      ...signatoryOptions,
      ...(currentSignatoryRole === "validator" ||
      currentSignatoryRole === "counsellor"
        ? [
            {
              label: "Vous même",
              value: currentSignatoryRole,
            },
          ]
        : []),
    ];
  };

  return (
    <>
      {newStatus === "DRAFT" && (
        <>
          <Alert
            severity="warning"
            title="Attention !"
            className={fr.cx("fr-mb-2w")}
            description="Ne surtout pas demander de modification pour relancer un signataire manquant. 
            Cela revient à annuler les signatures déjà enregistrées. 
            Si vous souhaitez le relancer, contactez-le directement par e-mail ou par téléphone."
          />
        </>
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
          {newStatus === "DRAFT" && (
            <Select
              label="À qui souhaitez-vous envoyer la demande de modification ?"
              placeholder="Sélectionnez un signataire"
              options={getSignatoryOptions()}
              nativeSelectProps={{
                ...register("modifierRole"),
                id: domElementIds.manageConvention.modifierRoleSelect,
              }}
              {...getFieldError("modifierRole")}
            />
          )}
          <Input
            textArea
            label={inputLabelByStatus[newStatus]}
            nativeTextAreaProps={{
              ...register("statusJustification"),
            }}
            {...getFieldError("statusJustification")}
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
  CANCELLED: "Pourquoi souhaitez-vous annuler cette convention ?",
  DEPRECATED: "Pourquoi l'immersion est-elle obsolète ?",
};

const confirmByStatus: Record<ConventionStatusWithJustification, string> = {
  DRAFT: "Confirmer la demande de modification",
  REJECTED: "Confirmer le refus",
  CANCELLED: "Confirmer l'annulation",
  DEPRECATED: "Confirmer que la demande est obsolète",
};
