import { useState } from "react";
import {
  type OptionType,
  RSAutocomplete,
  type RSAutocompleteComponentProps,
} from "react-design-system";
import { useDispatch } from "react-redux";
import { ActionMeta, SingleValue } from "react-select";
import { LookupSearchResult } from "shared";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { geosearchSelectors } from "src/core-logic/domain/geosearch/geosearch.selectors";
import { geosearchSlice } from "src/core-logic/domain/geosearch/geosearch.slice";

export type NafAutocompleteProps = RSAutocompleteComponentProps<
  "naf",
  LookupSearchResult
>;

export const NafAutocomplete = ({
  onNafSelected,
  onNafClear,
  ...props
}: NafAutocompleteProps) => {
  const dispatch = useDispatch();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const isSearching: boolean = useAppSelector(geosearchSelectors.isLoading);
  const searchSuggestions = useAppSelector(geosearchSelectors.suggestions);
  const options = searchSuggestions.map((suggestion) => ({
    value: suggestion,
    label: suggestion.label,
  }));
  return (
    <RSAutocomplete
      {...props}
      selectProps={{
        isLoading: isSearching,
        inputValue: searchTerm,
        noOptionsMessage: () => <>Saisissez au moins 3 caractères</>,
        placeholder: "Ex : Administration publique",
        onChange: (
          searchResult: SingleValue<OptionType<LookupSearchResult>>,
          actionMeta: ActionMeta<OptionType<LookupSearchResult>>,
        ) => {
          if (searchResult && actionMeta.action === "select-option") {
            onNafSelected(searchResult.value);
            dispatch(
              geosearchSlice.actions.suggestionHasBeenSelected(
                searchResult.value,
              ),
            );
          }
          if (
            actionMeta.action === "clear" ||
            actionMeta.action === "remove-value"
          ) {
            onNafClear();
            geosearchSlice.actions.queryWasEmptied();
          }
        },
        options,
        onInputChange: (value, actionMeta) => {
          setSearchTerm(value);
          if (actionMeta.action === "input-change") {
            dispatch(geosearchSlice.actions.queryHasChanged(value));
            if (value === "") {
              onNafClear();
              dispatch(geosearchSlice.actions.queryWasEmptied());
            }
          }
        },
      }}
    />
  );
};
