import { useEffect, useMemo, useState } from "react";
import {
  RSAutocomplete,
  type RSAutocompleteComponentProps,
} from "react-design-system";
import {
  AppellationAndRomeDto,
  AppellationMatchDto,
  ROME_AND_APPELLATION_MIN_SEARCH_TEXT_LENGTH,
} from "shared";
import { useDebounce } from "src/app/hooks/useDebounce";
import { outOfReduxDependencies } from "src/config/dependencies";

export type AppellationAutocompleteProps = RSAutocompleteComponentProps<
  "appellation",
  AppellationAndRomeDto
> & {
  useNaturalLanguage?: boolean;
  initialValue?: AppellationAndRomeDto;
};

export const AppellationAutocomplete = ({
  onAppellationSelected,
  onAppellationClear,
  useNaturalLanguage = false,
  initialValue,
  ...props
}: AppellationAutocompleteProps) => {
  const initialOption: AppellationMatchDto | null = useMemo(
    () =>
      initialValue
        ? {
            appellation: initialValue,
            matchRanges: [],
          }
        : null,
    [initialValue],
  );

  const [selectedOption, setSelectedOption] =
    useState<AppellationMatchDto | null>(initialOption);
  const [searchTerm, setSearchTerm] = useState<string>(
    initialValue?.appellationLabel ?? "",
  );
  const [options, setOptions] = useState<AppellationMatchDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceSearchTerm = useDebounce(searchTerm);
  useEffect(() => {
    if (initialOption && selectedOption === null) {
      setSelectedOption(initialOption);
    }
  }, [initialOption, selectedOption]);
  useEffect(() => {
    (async () => {
      const sanitizedTerm = debounceSearchTerm.trim();
      if (
        !sanitizedTerm ||
        sanitizedTerm.length < ROME_AND_APPELLATION_MIN_SEARCH_TEXT_LENGTH
      ) {
        setOptions([]);
        return [];
      }
      try {
        setIsSearching(true);
        const appellationOptions =
          await outOfReduxDependencies.formCompletionGateway.getAppellationDtoMatching(
            sanitizedTerm,
            useNaturalLanguage,
          );
        setOptions(appellationOptions);
      } catch (e: any) {
        // biome-ignore lint/suspicious/noConsoleLog: <explanation>
        console.log("AppellationAutocomplete", e);
      } finally {
        setIsSearching(false);
      }
    })();
  }, [debounceSearchTerm]);

  const noOptionText = ({
    isSearching,
    debounceSearchTerm,
    searchTerm,
  }: {
    isSearching: boolean;
    debounceSearchTerm: string;
    searchTerm: string;
  }) => {
    if (!searchTerm) return "Saisissez un métier";
    if (searchTerm.length < ROME_AND_APPELLATION_MIN_SEARCH_TEXT_LENGTH)
      return "Saisissez au moins 3 caractères";
    if (isSearching || searchTerm !== debounceSearchTerm) return "...";
    return "Aucun métier trouvé";
  };
  return (
    <RSAutocomplete
      {...props}
      selectProps={{
        defaultInputValue: initialValue?.appellationLabel,
        isLoading: isSearching,
        inputId: props.id ?? "im-select__input--appellation",
        loadingMessage: () => <>Recherche de métier en cours... 🔎</>,
        inputValue: searchTerm,
        noOptionsMessage: () =>
          noOptionText({ isSearching, debounceSearchTerm, searchTerm }),
        placeholder: "Ex : Boulanger, styliste, etc.",
        onChange: (searchResult, actionMeta) => {
          if (actionMeta.action === "clear") {
            onAppellationClear();
          }
          if (searchResult && actionMeta.action === "select-option") {
            onAppellationSelected(searchResult.value);
          }
        },
        options: options.map((option) => ({
          value: option.appellation,
          label: option.appellation.appellationLabel,
        })),
        onInputChange: (value) => {
          setSearchTerm(value);
        },
      }}
    />
  );
};
