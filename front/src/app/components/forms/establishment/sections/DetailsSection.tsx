import React from "react";
import { useFormContext } from "react-hook-form";
import { useDispatch } from "react-redux";
import { fr } from "@codegouvfr/react-dsfr";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { ButtonProps } from "@codegouvfr/react-dsfr/Button";
import ButtonsGroup from "@codegouvfr/react-dsfr/ButtonsGroup";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { keys } from "ramda";
import { match } from "ts-pattern";
import {
  AppellationAndRomeDto,
  domElementIds,
  emptyAppellationAndRome,
  FormEstablishmentDto,
  removeAtIndex,
  toDotNotation,
} from "shared";
import { ErrorNotifications } from "react-design-system";
import { CreationSiretRelatedInputs } from "src/app/components/forms/establishment/CreationSiretRelatedInputs";
import { EditionSiretRelatedInputs } from "src/app/components/forms/establishment/EditionSiretRelatedInputs";
import { booleanSelectOptions } from "src/app/contents/forms/common/values";
import { formEstablishmentFieldsLabels } from "src/app/contents/forms/establishment/formEstablishment";
import {
  formErrorsToFlatErrors,
  getFormContents,
  makeFieldError,
} from "src/app/hooks/formContents.hooks";
import { useAdminToken } from "src/app/hooks/jwt.hooks";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { establishmentSelectors } from "src/core-logic/domain/establishmentPath/establishment.selectors";
import { establishmentSlice } from "src/core-logic/domain/establishmentPath/establishment.slice";
import { Mode, OnStepChange, Step } from "../EstablishmentForm";
import { MultipleAppellationInput } from "../MultipleAppellationInput";
import { SearchResultPreview } from "../SearchResultPreview";

export const DetailsSection = ({
  mode,
  isEstablishmentAdmin,
  currentStep,
  onStepChange,
}: {
  isEstablishmentAdmin: boolean;
  mode: Mode;
  currentStep: Step;
  onStepChange: OnStepChange;
}) => {
  const adminJwt = useAdminToken();
  const dispatch = useDispatch();
  const methods = useFormContext<FormEstablishmentDto>();
  const {
    watch,
    setValue,
    register,
    formState: { errors, touchedFields, isSubmitting, submitCount },
  } = methods;
  const formValues = watch();
  const getFieldError = makeFieldError(methods.formState);
  const feedback = useAppSelector(establishmentSelectors.feedback);
  const formErrors = getFormContents(
    formEstablishmentFieldsLabels,
  ).getFormErrors();
  const formContents = getFormContents(
    formEstablishmentFieldsLabels,
  ).getFormFields();

  const onClickEstablishmentDeleteButton = () => {
    const confirmed = confirm(
      `⚠️ Etes-vous sûr de vouloir supprimer cet établissement ? ⚠️
                (cette opération est irréversible 💀)`,
    );
    if (confirmed && adminJwt)
      dispatch(
        establishmentSlice.actions.establishmentDeletionRequested({
          siret: formValues.siret,
          jwt: adminJwt,
        }),
      );
    if (confirmed && !adminJwt) alert("Vous n'êtes pas admin.");
  };

  const isStepMode = currentStep !== null;

  const buttons: [ButtonProps, ...ButtonProps[]] = [
    {
      children: isEstablishmentAdmin
        ? "Enregistrer les modifications"
        : "Enregistrer mes informations",
      iconId: "fr-icon-checkbox-circle-line",
      iconPosition: "right",
      type: "submit",
      disabled: isSubmitting,
      id: getSubmitButtonId(isEstablishmentAdmin, mode),
    },
  ];
  if (isStepMode) {
    buttons.unshift({
      children: "Étape précédente",
      iconId: "fr-icon-arrow-left-line",
      priority: "secondary",
      type: "button",
      id: domElementIds.establishment.previousButtonFromStepAndMode({
        currentStep,
        mode,
      }),
      onClick: () => onStepChange(3, []),
    });
  }

  if (isEstablishmentAdmin) {
    buttons.push({
      children: "Supprimer l'entreprise",
      iconId: "fr-icon-delete-bin-line",
      priority: "secondary",
      type: "button",
      onClick: onClickEstablishmentDeleteButton,
      disabled: isSubmitting,
      id: domElementIds.admin.manageEstablishment.submitDeleteButton,
    });
  }

  return (
    <section className={fr.cx("fr-mb-4w")}>
      <h2 className={fr.cx("fr-text--lead")}>
        Comment souhaitez-vous apparaître dans notre annuaire ?
      </h2>
      {match(mode)
        .with("create", () => <CreationSiretRelatedInputs />)
        .with("edit", () => (
          <EditionSiretRelatedInputs
            businessAddress={formValues.businessAddress}
          />
        ))
        .with("admin", () => (
          <EditionSiretRelatedInputs
            businessAddress={formValues.businessAddress}
          />
        ))
        .exhaustive()}

      <RadioButtons
        {...formContents["isEngagedEnterprise"]}
        legend={formContents["isEngagedEnterprise"].label}
        options={booleanSelectOptions.map((option) => ({
          ...option,
          nativeInputProps: {
            ...option.nativeInputProps,
            checked:
              Boolean(option.nativeInputProps.value) ===
              formValues["isEngagedEnterprise"],
            onChange: () => {
              setValue(
                "isEngagedEnterprise",
                option.nativeInputProps.value === 1,
              );
            },
          },
        }))}
      />
      <RadioButtons
        {...formContents["fitForDisabledWorkers"]}
        legend={formContents["fitForDisabledWorkers"].label}
        options={booleanSelectOptions.map((option) => ({
          ...option,
          nativeInputProps: {
            ...option.nativeInputProps,
            checked:
              Boolean(option.nativeInputProps.value) ===
              formValues["fitForDisabledWorkers"],
            onChange: () => {
              setValue(
                "fitForDisabledWorkers",
                option.nativeInputProps.value === 1,
              );
            },
          },
        }))}
      />
      <Input
        label={formContents.website.label}
        hintText={formContents.website.hintText}
        nativeInputProps={{
          ...formContents.website,
          ...register("website"),
        }}
        {...getFieldError("website")}
      />
      <Input
        label={formContents.additionalInformation.label}
        hintText={formContents.additionalInformation.hintText}
        textArea
        nativeTextAreaProps={{
          ...formContents.additionalInformation,
          ...register("additionalInformation"),
        }}
        {...getFieldError("additionalInformation")}
      />

      <h2 className={fr.cx("fr-text--lead", "fr-mb-2w")}>
        Les métiers que vous proposez à l'immersion :
      </h2>
      <MultipleAppellationInput
        {...formContents.appellations}
        onAppellationAdd={(appellation, index) => {
          const appellationsToUpdate = formValues.appellations;
          appellationsToUpdate[index] = appellation;
          setValue("appellations", appellationsToUpdate);
        }}
        onAppellationDelete={(appellationIndex) => {
          const appellationsToUpdate = formValues.appellations;
          const newAppellations: AppellationAndRomeDto[] =
            appellationIndex === 0 && appellationsToUpdate.length === 1
              ? [emptyAppellationAndRome]
              : removeAtIndex(formValues.appellations, appellationIndex);
          setValue("appellations", newAppellations);
        }}
        currentAppellations={formValues.appellations}
        error={errors?.appellations?.message}
      />
      {keys(errors).length === 0 && keys(touchedFields).length > 0 && (
        <SearchResultPreview establishment={formValues} />
      )}
      <ErrorNotifications
        labels={formErrors}
        errors={toDotNotation(formErrorsToFlatErrors(errors))}
        visible={submitCount !== 0 && Object.values(errors).length > 0}
      />
      {feedback.kind === "submitErrored" && (
        <Alert
          severity="error"
          title="Erreur lors de l'envoi du formulaire de référencement d'entreprise"
          description={
            "Veuillez nous excuser. Un problème est survenu qui a compromis l'enregistrement de vos informations."
          }
        />
      )}
      {feedback.kind === "deleteErrored" && (
        <Alert
          severity="error"
          title="Erreur lors de la suppression"
          description="Veuillez nous excuser. Un problème est survenu lors de la suppression de l'entreprise."
        />
      )}

      <ButtonsGroup
        inlineLayoutWhen="always"
        alignment="left"
        buttonsEquisized
        buttons={buttons}
      />
    </section>
  );
};
function getSubmitButtonId(
  isEstablishmentAdmin: boolean,
  mode: Mode,
): string | undefined {
  if (isEstablishmentAdmin)
    return domElementIds.admin.manageEstablishment.submitEditButton;
  if (mode === "edit")
    return domElementIds.establishment.submitEditEstablishmentButton;
  return domElementIds.establishment.submitCreateEstablishmentButton;
}
