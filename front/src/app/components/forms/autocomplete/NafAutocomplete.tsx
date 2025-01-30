import { useState } from "react";
import {
  RSAutocomplete,
  type RSAutocompleteComponentProps,
} from "react-design-system";
import { useDispatch } from "react-redux";
import { NafSectionSuggestion } from "shared";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { nafSelectors } from "src/core-logic/domain/naf/naf.selectors";
import { nafSlice } from "src/core-logic/domain/naf/naf.slice";

export type NafAutocompleteProps = RSAutocompleteComponentProps<
  "naf",
  NafSectionSuggestion
>;

export const NafAutocomplete = ({
  onNafSelected,
  onNafClear,
  ...props
}: NafAutocompleteProps) => {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const isLoading = useAppSelector(nafSelectors.isLoading);
  const options = useAppSelector(nafSelectors.currentNafSections);
  return (
    <RSAutocomplete
      {...props}
      selectProps={{
        isLoading,
        inputValue: searchTerm,
        noOptionsMessage: () => <>Saisissez au moins 3 caractères</>,
        placeholder: "Ex : Administration publique",
        onChange: (nafSectionSuggestion, actionMeta) => {
          if (nafSectionSuggestion && actionMeta.action === "select-option") {
            onNafSelected(nafSectionSuggestion.value);
          }
          if (
            actionMeta.action === "clear" ||
            actionMeta.action === "remove-value"
          ) {
            onNafClear();
            dispatch(nafSlice.actions.queryWasEmptied());
          }
        },
        options: options.map((option) => ({
          label: option.label,
          value: option,
        })),
        onInputChange: (value, actionMeta) => {
          setSearchTerm(value);
          if (actionMeta.action === "input-change") {
            dispatch(nafSlice.actions.queryHasChanged(value));
            if (value === "") {
              onNafClear();
              dispatch(nafSlice.actions.queryWasEmptied());
            }
          }
        },
      }}
    />
  );
};
