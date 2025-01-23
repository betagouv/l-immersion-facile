import { fr } from "@codegouvfr/react-dsfr";
import { InputProps } from "@codegouvfr/react-dsfr/input";
import React from "react";
import Select, { Props as SelectProps } from "react-select";
export type RSAutocompleteProps = InputProps & {
  selectProps: SelectProps;
};

export const RSAutocomplete = ({
  state,
  stateRelatedMessage,
  label,
  hintText,
  selectProps,
}: RSAutocompleteProps) => {
  const hasError = state === "error";
  return (
    <div className="fr-input-group">
      <label className="fr-label" htmlFor="text-input-groups1">
        {label}
        {hintText && <span className="fr-hint-text">{hintText}</span>}
      </label>

      <Select
        {...selectProps}
        classNamePrefix="im-select"
        className={`im-select ${hasError ? "im-select--has-error" : ""}`}
        unstyled
        classNames={{
          indicatorsContainer: () => fr.cx("fr-hidden"),
          input: () => fr.cx("fr-input", { "fr-input--error": hasError }),
        }}
      />

      {hasError && (
        <p id="text-input-error-desc-error" className="fr-error-text">
          {stateRelatedMessage}
        </p>
      )}
    </div>
  );
};
