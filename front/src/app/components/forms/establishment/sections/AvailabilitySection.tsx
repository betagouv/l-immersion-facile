import { fr } from "@codegouvfr/react-dsfr";
import Alert from "@codegouvfr/react-dsfr/Alert";
import ButtonsGroup from "@codegouvfr/react-dsfr/ButtonsGroup";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import React from "react";
import { useFormContext } from "react-hook-form";
import {
  FormEstablishmentDto,
  domElementIds,
  immersionFacileContactEmail,
  toDateString,
  toDisplayedDate,
} from "shared";
import { richBooleanSelectOptions } from "src/app/contents/forms/common/values";
import {
  formEstablishmentFieldsLabels,
  mailtoHref,
} from "src/app/contents/forms/establishment/formEstablishment";
import {
  getFormContents,
  makeFieldError,
} from "src/app/hooks/formContents.hooks";
import { Mode, OnStepChange, Step } from "../EstablishmentForm";

export const AvailabilitySection = ({
  mode,
  onStepChange,
  currentStep,
  setAvailableForImmersion,
  availableForImmersion,
}: {
  mode: Mode;
  onStepChange: OnStepChange;
  currentStep: Step;
  setAvailableForImmersion: (value: boolean) => void;
  availableForImmersion: boolean | undefined;
}) => {
  const { register, setValue, getValues, formState, clearErrors } =
    useFormContext<FormEstablishmentDto>();
  const formContents = getFormContents(
    formEstablishmentFieldsLabels(mode),
  ).getFormFields();
  const getFieldError = makeFieldError(formState);

  const shouldShowErrorOnAvailableForImmersion =
    availableForImmersion === undefined &&
    (getFieldError("maxContactsPerWeek") ||
      getFieldError("nextAvailabilityDate"));

  const currentNextAvailabilityDate = getValues("nextAvailabilityDate");

  const currentValueFormatted =
    currentNextAvailabilityDate &&
    toDateString(new Date(currentNextAvailabilityDate));

  const isStepMode = currentStep !== null;

  return (
    <section className={fr.cx("fr-mb-4w")}>
      <RadioButtons
        legend="Êtes-vous disponible actuellement pour recevoir des personnes en immersion ?"
        name="availableForImmersion"
        options={richBooleanSelectOptions.map((option) => ({
          ...option,
          nativeInputProps: {
            ...option.nativeInputProps,
            checked:
              Boolean(option.nativeInputProps.value) === availableForImmersion,
            onChange: () => {
              const isAvailable = option.nativeInputProps.value === 1;
              clearErrors("nextAvailabilityDate");
              clearErrors("maxContactsPerWeek");
              setAvailableForImmersion(isAvailable);
              if (isAvailable) {
                setValue("nextAvailabilityDate", undefined);
              }
            },
          },
        }))}
        orientation="horizontal"
        state={shouldShowErrorOnAvailableForImmersion ? "error" : "default"}
        stateRelatedMessage={
          shouldShowErrorOnAvailableForImmersion
            ? "Veuillez remplir ce champ"
            : null
        }
      />

      {availableForImmersion === false && (
        <Input
          {...formContents.nextAvailabilityDate}
          nativeInputProps={{
            defaultValue: currentValueFormatted,
            onBlur: (event) => {
              setValue(
                "nextAvailabilityDate",
                new Date(event.currentTarget.value).toISOString(),
                {
                  shouldValidate: true,
                },
              );
            },
            onChange: () => {},
            type: "date",
            min: toDateString(new Date()),
          }}
          {...getFieldError("nextAvailabilityDate")}
        />
      )}
      {availableForImmersion !== undefined &&
        (mode === "edit" || mode === "admin") && (
          <Input
            label={
              availableForImmersion
                ? formContents.maxContactsPerWeek.label
                : formContents.maxContactPerWeekWhenAvailable.label
            }
            nativeInputProps={{
              ...formContents.maxContactsPerWeek,
              ...register("maxContactsPerWeek", {
                valueAsNumber: true,
              }),
              type: "number",
              min: 1,
              pattern: "\\d*",
            }}
            {...getFieldError("maxContactsPerWeek")}
          />
        )}
      {mode === "admin" && availableForImmersion === undefined && (
        <div>
          <Alert
            severity="info"
            description={
              <p>
                Mise en relation max/semaine : {getValues().maxContactsPerWeek}{" "}
                <br />
                Prochaine disponibilité :{" "}
                {currentNextAvailabilityDate
                  ? `à partir du ${toDisplayedDate({
                      date: new Date(currentNextAvailabilityDate),
                    })}`
                  : "tout le temps"}
              </p>
            }
            small={true}
            title="Actuellement"
          />
        </div>
      )}
      {availableForImmersion === false && mode === "edit" && (
        <div className={fr.cx("fr-highlight", "fr-ml-0")}>
          <p>
            Vous pouvez demander la suppression définitive de votre entreprise{" "}
            <a href={mailtoHref(getValues().siret)}>en cliquant ici</a>. <br />
            Si vous avez besoin d'aide, envoyez un email à{" "}
            <a href={mailtoHref(immersionFacileContactEmail)}>
              {immersionFacileContactEmail}
            </a>
            .
          </p>
        </div>
      )}
      {isStepMode && (
        <ButtonsGroup
          inlineLayoutWhen="always"
          alignment="left"
          buttonsEquisized
          buttons={[
            {
              children: "Étape précédente",
              iconId: "fr-icon-arrow-left-line",
              priority: "secondary",
              disabled: true,
              id: domElementIds.establishment[
                mode
              ].previousButtonFromStepAndMode({
                currentStep,
                mode,
              }),
            },
            {
              children: "Étape suivante",
              disabled: availableForImmersion === undefined,
              onClick: () =>
                onStepChange(
                  2,
                  mode === "edit"
                    ? ["maxContactsPerWeek", "nextAvailabilityDate"]
                    : ["nextAvailabilityDate"],
                ),
              type: "button",
              iconId: "fr-icon-arrow-right-line",
              iconPosition: "right",
              id: domElementIds.establishment[mode].nextButtonFromStepAndMode({
                currentStep,
                mode,
              }),
            },
          ]}
        />
      )}
    </section>
  );
};
