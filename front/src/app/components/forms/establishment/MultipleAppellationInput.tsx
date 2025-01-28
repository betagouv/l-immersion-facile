import { fr } from "@codegouvfr/react-dsfr";
import { Button } from "@codegouvfr/react-dsfr/Button";
import React from "react";
import {
  AppellationAndRomeDto,
  AppellationCode,
  AppellationLabel,
  emptyAppellationAndRome,
} from "shared";
import { useStyles } from "tss-react/dsfr";
import { v4 as uuidV4 } from "uuid";
import { AppellationAutocomplete } from "../autocomplete/AppellationAutocomplete";

type MultipleAppellationInputProps = {
  name: string;
  label?: string;
  currentAppellations: AppellationAndRomeDto[];
  onAppellationAdd: (appellation: AppellationAndRomeDto, index: number) => void;
  onAppellationDelete: (index: number) => void;
  error?: string;
  id: string;
  disabled?: boolean;
};

const getAppellationKey = (
  appellationCode: AppellationCode,
  appellationLabel: AppellationLabel,
) => {
  if (appellationCode === "" && appellationLabel === "") return uuidV4();
  return `${appellationCode}-${appellationLabel}`;
};

export const MultipleAppellationInput = ({
  name,
  label,
  currentAppellations,
  onAppellationAdd,
  onAppellationDelete,
  error,
  id,
  disabled = false,
}: MultipleAppellationInputProps) => {
  const { cx } = useStyles();
  return (
    <div
      className={cx(fr.cx("fr-input-group"), "im-appellation-autocomplete")}
      id={id}
    >
      <>
        {label && <h2 className={fr.cx("fr-text--lead")}>{label}</h2>}
        {currentAppellations.map(
          ({ appellationCode, appellationLabel }, index) => (
            <div
              className={fr.cx("fr-grid-row", "fr-grid-row--bottom")}
              key={getAppellationKey(appellationCode, appellationLabel)}
            >
              <div className={fr.cx("fr-col", !!index && "fr-mt-2w")}>
                <AppellationAutocomplete
                  disabled={disabled}
                  label={"Rechercher un métier *"}
                  initialValue={currentAppellations[index]}
                  onAppellationSelected={(selectedAppellation) => {
                    onAppellationAdd(selectedAppellation, index);
                  }}
                  onAppellationClear={() => {
                    onAppellationDelete(index);
                  }}
                  id={`${id}-${index}`}
                />
              </div>
              <Button
                type="button"
                iconId="fr-icon-delete-bin-line"
                title="Suppression"
                disabled={disabled}
                id="im-multiple-appellation-input__delete-option-button"
                onClick={() => {
                  onAppellationDelete(index);
                }}
              />
            </div>
          ),
        )}
      </>

      <Button
        className={fr.cx("fr-my-4v")}
        type="button"
        iconId="fr-icon-add-line"
        title="Ajouter un métier"
        id={`${id}-add-option-button`}
        priority="secondary"
        onClick={() => {
          onAppellationAdd(emptyAppellationAndRome, currentAppellations.length);
        }}
        disabled={disabled}
      >
        Ajouter un métier
      </Button>

      {error?.length && (
        <div
          id={`${name}-error-description`}
          className={fr.cx("fr-error-text")}
        >
          {typeof error === "string" ? error : "Indiquez au moins 1 métier."}
        </div>
      )}
    </div>
  );
};
