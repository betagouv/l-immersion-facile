import { fr } from "@codegouvfr/react-dsfr";
import { Button } from "@codegouvfr/react-dsfr/Button";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import RadioButtons from "@codegouvfr/react-dsfr/RadioButtons";
import { Select, SelectProps } from "@codegouvfr/react-dsfr/SelectNext";
import { includes, keys } from "ramda";
import React, { ElementRef, useEffect, useRef, useState } from "react";
import {
  Loader,
  MainWrapper,
  PageHeader,
  SearchFilter,
  SectionAccordion,
  SectionTextEmbed,
} from "react-design-system";
import { useForm, useWatch } from "react-hook-form";
import { useDispatch } from "react-redux";
import {
  LatLonDistance,
  SearchSortedBy,
  ValueOf,
  domElementIds,
  searchSortedByOptions,
} from "shared";
import { Breadcrumbs } from "src/app/components/Breadcrumbs";
import { AppellationAutocomplete } from "src/app/components/forms/autocomplete/AppellationAutocomplete";
import { NafAutocomplete } from "src/app/components/forms/autocomplete/NafAutocomplete";
import { PlaceAutocomplete } from "src/app/components/forms/autocomplete/PlaceAutocomplete";
import { HeaderFooterLayout } from "src/app/components/layout/HeaderFooterLayout";
import { SearchInfoSection } from "src/app/components/search/SearchInfoSection";
import { SearchListResults } from "src/app/components/search/SearchListResults";
import { useGetAcquisitionParams } from "src/app/hooks/acquisition.hooks";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { encodedSearchUriParams, useSearch } from "src/app/hooks/search.hooks";
import { useScrollToTop } from "src/app/hooks/window.hooks";
import { routes } from "src/app/routes/routes";
import { featureFlagSelectors } from "src/core-logic/domain/featureFlags/featureFlags.selector";
import { geosearchSlice } from "src/core-logic/domain/geosearch/geosearch.slice";
import { searchSelectors } from "src/core-logic/domain/search/search.selectors";
import {
  SearchPageParams,
  initialState,
  searchSlice,
} from "src/core-logic/domain/search/search.slice";
import { useStyles } from "tss-react/dsfr";
import { Route } from "type-route";
import "./SearchPage.scss";
import Styles from "./SearchPage.styles";

const radiusOptions = ["1", "2", "5", "10", "20", "50", "100"].map(
  (distance) => ({
    label: `${distance} km`,
    value: distance,
  }),
);

const getSearchRouteParam = (
  currentKey: keyof SearchPageParams,
  routeParam: ValueOf<SearchPageParams>,
  defaultValue: unknown,
) => {
  if (!routeParam) {
    return defaultValue;
  }
  return includes(currentKey, encodedSearchUriParams)
    ? decodeURIComponent(`${routeParam}`)
    : routeParam;
};

export const SearchPage = ({
  route,
  useNaturalLanguageForAppellations,
}: {
  route: Route<typeof routes.search | typeof routes.searchDiagoriente>;
  useNaturalLanguageForAppellations?: boolean;
}) => {
  const { cx } = useStyles();
  const dispatch = useDispatch();
  const initialSearchSliceState = initialState;
  const searchStatus = useAppSelector(searchSelectors.searchStatus);
  const searchResults = useAppSelector(searchSelectors.searchResults);
  const isLoading = useAppSelector(searchSelectors.isLoading);
  const { triggerSearch, changeCurrentPage } = useSearch(route);
  const [searchMade, setSearchMade] = useState<SearchPageParams | null>(null);
  const searchResultsWrapper = useRef<ElementRef<"div">>(null);
  const innerSearchResultWrapper = useRef<ElementRef<"div">>(null);
  const acquisitionParams = useGetAcquisitionParams();
  const { enableSearchByScore } = useAppSelector(
    featureFlagSelectors.featureFlagState,
  );

  const initialValues: SearchPageParams = {
    place: "",
    sortedBy: enableSearchByScore ? "score" : "date",
    appellations: undefined,
    distanceKm: undefined,
    latitude: undefined,
    longitude: undefined,
    fitForDisabledWorkers: undefined,
    currentPage: 1,
    ...acquisitionParams,
  };
  const [tempValue, setTempValue] = useState<SearchPageParams>(initialValues);
  const filterFormValues = (values: SearchPageParams) =>
    keys(values).reduce(
      (acc, key) => ({
        ...acc,
        ...(values[key] ? { [key]: values[key] } : {}),
      }),
      {} as SearchPageParams,
    );
  const routeParams = route.params as Partial<SearchPageParams>;
  const methods = useForm<SearchPageParams>({
    defaultValues: keys(initialValues).reduce(
      (acc, currentKey) => ({
        ...acc,
        [currentKey]: getSearchRouteParam(
          currentKey,
          routeParams[currentKey],
          initialValues[currentKey],
        ),
      }),
      {},
    ),
    mode: "onTouched",
  });
  const { handleSubmit, setValue, register, control, getValues } = methods;
  const formValues = getValues();
  const [lat, lon, distanceKm, place] = useWatch({
    control,
    name: ["latitude", "longitude", "distanceKm", "place"],
  });

  const availableForInitialSearchRequest =
    keys(routeParams).length &&
    searchStatus === initialSearchSliceState.searchStatus &&
    lat !== 0 &&
    lon !== 0;

  const getSearchResultsSummary = (resultsNumber: number) => {
    const plural = resultsNumber > 1 ? "s" : "";
    return (
      <>
        <strong>{resultsNumber}</strong> résultat{plural} trouvé{plural}
      </>
    );
  };

  const setTempValuesAsFormValues = (values: Partial<SearchPageParams>) => {
    keys(values).forEach((key) => {
      setValue(key, values[key]);
    });
  };

  const onSearchFormSubmit = (updatedValues: SearchPageParams) => {
    setTempValue(updatedValues);
    setTempValuesAsFormValues(updatedValues);
    setSearchMade(updatedValues);
    triggerSearch(filterFormValues(updatedValues));
  };

  useScrollToTop(formValues.currentPage);

  useEffect(() => {
    if (availableForInitialSearchRequest) {
      onSearchFormSubmit(filterFormValues(formValues));
    }
  }, [
    availableForInitialSearchRequest,
    onSearchFormSubmit,
    filterFormValues,
    formValues,
  ]);

  useEffect(() => {
    return () => {
      dispatch(searchSlice.actions.clearSearchStatusRequested());
      dispatch(geosearchSlice.actions.queryWasEmptied());
    };
  }, [dispatch]);

  const filteredSortOptions = getSortedByOptions(
    areValidGeoParams(formValues),
    enableSearchByScore.isActive,
  );

  const appellationInputLabel = (
    <>
      {useNaturalLanguageForAppellations
        ? "Je recherche le métier ou la compétence"
        : "Je recherche le métier..."}
    </>
  );

  const placeInputLabel = <>...dans la ville</>;
  const shouldShowInitialScreen = searchStatus === "noSearchMade";

  return (
    <HeaderFooterLayout>
      <MainWrapper vSpacing={0} layout="fullscreen">
        {shouldShowInitialScreen ? (
          <>
            <PageHeader
              title="Trouver une immersion"
              breadcrumbs={<Breadcrumbs />}
            >
              <p>Dans une entreprise ou une administration publique</p>
              <form
                onSubmit={handleSubmit((value) =>
                  onSearchFormSubmit(filterFormValues(value)),
                )}
                className={cx(
                  fr.cx("fr-grid-row", "fr-grid-row--gutters"),
                  Styles.form,
                  Styles.formV2,
                )}
                id={domElementIds.search.searchForm}
              >
                <div className={cx(fr.cx("fr-col-12", "fr-col-lg-4"))}>
                  <AppellationAutocomplete
                    label={appellationInputLabel}
                    initialValue={
                      formValues.appellations
                        ? formValues.appellations[0]
                        : undefined
                    }
                    onAppellationSelected={(newAppellationAndRome) => {
                      setValue("appellations", [newAppellationAndRome]);
                    }}
                    onAppellationClear={() => {
                      setValue("appellations", undefined);
                    }}
                    id={domElementIds.search.appellationAutocomplete}
                    selectProps={{
                      placeholder: useNaturalLanguageForAppellations
                        ? "Ex : Boulanger, faire du pain, etc"
                        : "Ex : Boulanger, styliste, etc",
                    }}
                    useNaturalLanguage={useNaturalLanguageForAppellations}
                  />
                </div>
                <div className={cx(fr.cx("fr-col-12", "fr-col-lg-4"))}>
                  <PlaceAutocomplete
                    label={placeInputLabel}
                    initialInputValue={place}
                    onPlaceSelected={(lookupSearchResult) => {
                      if (!lookupSearchResult) return;
                      setValue("latitude", lookupSearchResult.position.lat);
                      setValue("longitude", lookupSearchResult.position.lon);
                      setValue("place", lookupSearchResult.label);
                      if (!formValues.distanceKm) {
                        setValue("distanceKm", 10);
                      }
                    }}
                    id={domElementIds.search.placeAutocompleteInput}
                    onPlaceClear={() => {
                      setValue("latitude", initialValues.latitude);
                      setValue("longitude", initialValues.latitude);
                      setValue("place", initialValues.place);
                      if (formValues.sortedBy === "distance") {
                        setValue("sortedBy", "date");
                      }
                      setValue("distanceKm", initialValues.distanceKm);
                    }}
                  />
                </div>
                <div className={cx(fr.cx("fr-col-12", "fr-col-lg-2"))}>
                  <Select
                    label="Distance maximum"
                    options={radiusOptions}
                    disabled={!lat || !lon}
                    nativeSelectProps={{
                      ...register("distanceKm"),
                      title:
                        !lat || !lon
                          ? "Pour sélectionner une distance, vous devez d'abord définir une ville."
                          : undefined,
                      id: domElementIds.search.distanceSelect,
                      value: `${distanceKm === undefined ? "" : distanceKm}`,
                      onChange: (event) => {
                        const value = parseInt(event.currentTarget.value);
                        setValue("distanceKm", value);
                        if (!value) {
                          setValue("sortedBy", "date");
                        }
                      },
                    }}
                  />
                </div>

                <div className={cx(fr.cx("fr-col-12", "fr-col-lg-2"))}>
                  <Button
                    type="submit"
                    nativeButtonProps={{
                      id: domElementIds.search.searchSubmitButton,
                    }}
                    disabled={!canSubmitSearch(formValues)}
                  >
                    Rechercher
                  </Button>
                </div>
              </form>
            </PageHeader>

            <div className={fr.cx("fr-pt-6w", "fr-mt-6w", "fr-hr")}>
              <SearchInfoSection />
              <SectionAccordion />
              <SectionTextEmbed
                videoUrl="https://immersion.cellar-c2.services.clever-cloud.com/video_immersion_en_entreprise.mp4"
                videoPosterUrl="https://immersion.cellar-c2.services.clever-cloud.com/video_immersion_en_entreprise_poster.webp"
                videoDescription="https://immersion.cellar-c2.services.clever-cloud.com/video_immersion_en_entreprise_transcript.vtt"
                videoTranscription="https://immersion.cellar-c2.services.clever-cloud.com/video_immersion_en_entreprise_transcript.txt"
              />
            </div>
          </>
        ) : (
          <>
            {isLoading && <Loader />}
            <Breadcrumbs />
            <form
              onSubmit={handleSubmit((value) => {
                if (tempValue !== null) {
                  const updatedValues: SearchPageParams = {
                    ...value,
                    ...tempValue,
                  };
                  onSearchFormSubmit(updatedValues);
                }
              })}
              className={cx(
                fr.cx("fr-container", "fr-mb-6w"),
                Styles.searchFilters,
              )}
              id={domElementIds.search.searchForm}
            >
              <SearchFilter
                defaultValue="Tous les métiers"
                iconId="fr-icon-briefcase-fill"
                id={domElementIds.search.appellationFilterTag}
                values={
                  formValues.appellations
                    ? formValues.appellations.map(
                        (appellation) => appellation.appellationLabel,
                      )
                    : []
                }
                onReset={() => {
                  const updatedValues = {
                    ...tempValue,
                    appellations: undefined,
                  };
                  onSearchFormSubmit(updatedValues);
                }}
                submenu={{
                  title: "Quel métier souhaitez-vous découvrir ?",
                  content: (
                    <>
                      <AppellationAutocomplete
                        className={fr.cx("fr-mb-2w")}
                        label={appellationInputLabel}
                        initialValue={
                          route.params.appellations
                            ? route.params.appellations[0]
                            : undefined
                        }
                        onAppellationSelected={(newAppellationAndRome) => {
                          setTempValue({
                            ...tempValue,
                            appellations: [newAppellationAndRome],
                          });
                        }}
                        onAppellationClear={() => {
                          setTempValue({
                            ...tempValue,
                            appellations: undefined,
                          });
                        }}
                        id={domElementIds.search.appellationAutocomplete}
                        selectProps={{
                          placeholder: useNaturalLanguageForAppellations
                            ? "Ex : Boulanger, faire du pain, etc"
                            : "Ex : Boulanger, styliste, etc",
                        }}
                        useNaturalLanguage={useNaturalLanguageForAppellations}
                      />
                      {tempValue.appellations?.length && (
                        <p className={fr.cx("fr-hint-text", "fr-mt-2w")}>
                          <strong>
                            Les résultats seront étendus aux autres métiers du
                            secteur "{tempValue.appellations[0].romeLabel}"
                          </strong>
                          , c’est pour cela que vous pourrez voir des métiers
                          proches mais ne correspondant pas précisément à votre
                          recherche dans les résultats.
                        </p>
                      )}
                      <NafAutocomplete
                        label="Et / ou un secteur d'activité"
                        onNafSelected={() => {}}
                        onNafClear={() => {}}
                        className={fr.cx("fr-mt-2w")}
                        initialInputValue={"initial value"}
                      />
                    </>
                  ),
                }}
              />
              <SearchFilter
                defaultValue="France entière"
                id={domElementIds.search.locationFilterTag}
                iconId="fr-icon-map-pin-2-fill"
                values={place ? [`${place} (${distanceKm}km)`] : []}
                onReset={() => {
                  const updatedValues: SearchPageParams =
                    tempValue.sortedBy === "distance"
                      ? {
                          ...tempValue,
                          place: initialValues.place,
                          latitude: 0,
                          longitude: 0,
                          distanceKm: 0,
                        }
                      : {
                          ...tempValue,
                          place: initialValues.place,
                          latitude: initialValues.latitude,
                          longitude: initialValues.longitude,
                          distanceKm: undefined,
                        };
                  onSearchFormSubmit(updatedValues);
                }}
                submenu={{
                  title: "Où souhaitez-vous faire votre immersion ?",
                  content: (
                    <>
                      <PlaceAutocomplete
                        label={placeInputLabel}
                        onPlaceSelected={(lookupSearchResult) => {
                          if (!lookupSearchResult) return;
                          const newValues = {
                            place: lookupSearchResult.label,
                            latitude: lookupSearchResult.position.lat,
                            longitude: lookupSearchResult.position.lon,
                          };
                          setTempValue({
                            ...tempValue,
                            ...newValues,
                            distanceKm: tempValue.distanceKm || 10,
                          });
                        }}
                        onPlaceClear={() => {
                          const updatedInitialValues: SearchPageParams =
                            tempValue.sortedBy === "distance"
                              ? {
                                  ...tempValue,
                                  place: initialValues.place,
                                  latitude: 0,
                                  longitude: 0,
                                  distanceKm: 0,
                                }
                              : {
                                  ...tempValue,
                                  place: initialValues.place,
                                  latitude: initialValues.latitude,
                                  longitude: initialValues.longitude,
                                };
                          setTempValue(updatedInitialValues);

                          if (formValues.sortedBy === "distance") {
                            setTempValue({
                              ...tempValue,
                              sortedBy: "date",
                            });
                          }
                        }}
                        className={fr.cx("fr-mt-2w")}
                        initialInputValue={place}
                        id={domElementIds.search.placeAutocompleteInput}
                      />

                      <Select
                        label="Dans un rayon de :"
                        options={radiusOptions}
                        disabled={!tempValue.latitude || !tempValue.longitude}
                        nativeSelectProps={{
                          ...register("distanceKm"),
                          title:
                            !tempValue.latitude || !tempValue.longitude
                              ? "Pour sélectionner une distance, vous devez d'abord définir une ville."
                              : undefined,
                          id: domElementIds.search.distanceSelect,
                          value: `${tempValue.distanceKm || ""}`,
                          onChange: (event) => {
                            const value = parseInt(event.currentTarget.value);
                            setTempValue({
                              ...tempValue,
                              distanceKm: value,
                            });
                            if (!value) {
                              setTempValue({
                                ...tempValue,
                                distanceKm: value,
                              });
                            }
                          },
                        }}
                      />
                    </>
                  ),
                }}
              />
              <SearchFilter
                defaultValue="Toutes les entreprises"
                iconId="fr-icon-equalizer-fill"
                id={domElementIds.search.fitForDisableWorkersFilterTag}
                values={
                  formValues.fitForDisabledWorkers
                    ? ["Acceptant les personnes en situation de handicap"]
                    : []
                }
                onReset={() => {
                  const updatedValues = {
                    ...tempValue,
                    fitForDisabledWorkers: undefined,
                  };
                  onSearchFormSubmit(updatedValues);
                }}
                submenu={{
                  title: "Plus de critères",
                  content: (
                    <>
                      <p>Afficher uniquement les entreprises&nbsp;:</p>
                      <Checkbox
                        options={[
                          {
                            label:
                              "Personnes en situation de handicap bienvenues",
                            nativeInputProps: {
                              checked: tempValue.fitForDisabledWorkers,
                              onChange: (event) => {
                                setTempValue({
                                  ...tempValue,
                                  fitForDisabledWorkers:
                                    event.currentTarget.checked ?? undefined,
                                });
                              },
                            },
                          },
                        ]}
                      />
                    </>
                  ),
                }}
              />
              <SearchFilter
                defaultValue="Trier par pertinence"
                iconId="fr-icon-arrow-down-line"
                id={domElementIds.search.sortFilterTag}
                values={
                  formValues.sortedBy
                    ? [sortedByOptionsLabel[formValues.sortedBy]]
                    : []
                }
                submenu={{
                  title: "Ordre d’affichage",
                  content: (
                    <RadioButtons
                      id={domElementIds.search.sortRadioButtons}
                      options={filteredSortOptions.map((option) => ({
                        ...option,
                        nativeInputProps: {
                          name: register("sortedBy").name,
                          value: option.value,
                          disabled: option.disabled,
                          checked: tempValue
                            ? option.value === tempValue.sortedBy
                            : false,
                          onClick: (event) => {
                            const updatedSortedBy = isSearchSortedBy(
                              event.currentTarget.value,
                            )
                              ? event.currentTarget.value
                              : "score";
                            if (
                              updatedSortedBy === "distance" &&
                              areValidGeoParams(tempValue)
                            ) {
                              setTempValue({
                                ...tempValue,
                                sortedBy: "distance",
                              });
                            }
                            if (updatedSortedBy !== "distance") {
                              setTempValue({
                                ...tempValue,
                                sortedBy: updatedSortedBy,
                              });
                            }
                          },
                        },
                      }))}
                    />
                  ),
                }}
              />
            </form>

            <div ref={searchResultsWrapper}>
              {searchMade !== null && (
                <div
                  ref={innerSearchResultWrapper}
                  className={fr.cx("fr-pb-1w")}
                >
                  <div className={fr.cx("fr-container")}>
                    <div
                      className={cx(fr.cx("fr-mb-4w"), Styles.resultsSummary)}
                    >
                      {searchStatus === "ok" && (
                        <>
                          <h2 className={fr.cx("fr-h5", "fr-mb-0")}>
                            {getSearchResultsSummary(searchResults.length)}
                          </h2>
                          {routeParams.appellations &&
                            routeParams.appellations.length > 0 && (
                              <span className={cx(fr.cx("fr-text--xs"))}>
                                pour la recherche{" "}
                                <strong className={fr.cx("fr-text--bold")}>
                                  {routeParams.appellations[0].appellationLabel}
                                </strong>
                                , étendue au secteur{" "}
                                <a
                                  href={`https://candidat.francetravail.fr/metierscope/fiche-metier/${routeParams.appellations[0].romeCode}`}
                                  target="_blank"
                                  className={fr.cx("fr-text--bold")}
                                  rel="noreferrer"
                                >
                                  {routeParams.appellations[0].romeLabel}
                                </a>
                              </span>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                  <SearchListResults
                    currentPage={formValues.currentPage}
                    showDistance={areValidGeoParams(searchMade)}
                    setCurrentPageValue={(newPageValue: number) => {
                      setValue("currentPage", newPageValue);
                      changeCurrentPage({
                        ...formValues,
                        currentPage: newPageValue,
                      });
                    }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </MainWrapper>
    </HeaderFooterLayout>
  );
};

const areValidGeoParams = (
  geoParams: Partial<LatLonDistance>,
): geoParams is LatLonDistance => {
  return (
    geoParams.latitude !== undefined &&
    geoParams.longitude !== undefined &&
    geoParams.distanceKm !== undefined &&
    geoParams.distanceKm > 0
  );
};

const areEmptyGeoParams = (
  geoParams: Partial<LatLonDistance>,
): geoParams is Partial<LatLonDistance> => {
  return (
    geoParams.latitude === undefined &&
    geoParams.longitude === undefined &&
    geoParams.distanceKm === undefined
  );
};

const canSubmitSearch = (values: SearchPageParams) => {
  const geoParams = {
    latitude: values.latitude,
    longitude: values.longitude,
    distanceKm: values.distanceKm,
  };
  return areValidGeoParams(geoParams) || areEmptyGeoParams(geoParams);
};

export const getSortedByOptions = (
  hasGeoParams: boolean,
  hasScoreEnabled: boolean,
): SelectProps.Option<SearchSortedBy>[] => [
  ...(hasScoreEnabled
    ? [
        {
          label: sortedByOptionsLabel.score,
          value: "score" as const,
        },
      ]
    : []),
  {
    label: sortedByOptionsLabel.date,
    value: "date" as const,
  },
  {
    label: sortedByOptionsLabel.distance,
    value: "distance" as const,
    disabled: !hasGeoParams,
  },
];

const sortedByOptionsLabel = {
  date: "Trier par date de publication",
  score: "Trier par pertinence",
  distance: "Trier par proximité",
};

const isSearchSortedBy = (value: string): value is SearchSortedBy =>
  searchSortedByOptions.includes(value as SearchSortedBy);
