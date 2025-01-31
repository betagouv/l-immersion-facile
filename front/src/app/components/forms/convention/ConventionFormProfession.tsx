import { fr } from "@codegouvfr/react-dsfr";
import { Input } from "@codegouvfr/react-dsfr/Input";
import React from "react";
import { TextInputError } from "react-design-system";
import { useFormContext } from "react-hook-form";
import {
  AppellationAndRomeDto,
  ConventionReadDto,
  domElementIds,
} from "shared";
import { AppellationAutocomplete } from "src/app/components/forms/autocomplete/AppellationAutocomplete";

type ConventionFormProfessionProps = {
  label: string;
  hintText?: React.ReactNode;
  disabled?: boolean;
  initialFieldValue: AppellationAndRomeDto;
};

export const ConventionFormProfession = ({
  label,
  hintText,
  disabled,
  initialFieldValue,
}: ConventionFormProfessionProps) => {
  const {
    setValue,
    formState: { errors, touchedFields },
    getValues,
  } = useFormContext<ConventionReadDto>();

  const error =
    touchedFields.immersionAppellation &&
    (errors.immersionAppellation as Partial<AppellationAndRomeDto>)
      ?.appellationLabel;

  if (disabled)
    return (
      <Input
        label={label}
        nativeInputProps={{
          name: "immersionAppellation",
          value: getValues().immersionAppellation?.appellationLabel,
        }}
        disabled
      />
    );

  return (
    <>
      <div className={fr.cx("fr-input-group")}>
        <AppellationAutocomplete
          label={label}
          initialValue={initialFieldValue}
          id={
            domElementIds.conventionImmersionRoute.conventionSection
              .immersionAppellation
          }
          onAppellationSelected={(appellation) => {
            setValue("immersionAppellation.romeCode", appellation.romeCode);
            setValue("immersionAppellation.romeLabel", appellation.romeLabel);
            setValue(
              "immersionAppellation.appellationCode",
              appellation.appellationCode,
            );
            setValue(
              "immersionAppellation.appellationLabel",
              appellation.appellationLabel,
            );
          }}
          hintText={hintText}
          onAppellationClear={() => {
            setValue("immersionAppellation.romeCode", "");
            setValue("immersionAppellation.romeLabel", "");
            setValue("immersionAppellation.appellationCode", "");
            setValue("immersionAppellation.appellationLabel", "");
          }}
        />
        {error && <TextInputError errorMessage={error} />}
      </div>
    </>
  );
};
