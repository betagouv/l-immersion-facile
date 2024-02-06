import { fr } from "@codegouvfr/react-dsfr";
import { Pagination } from "@codegouvfr/react-dsfr/Pagination";
import { Select } from "@codegouvfr/react-dsfr/SelectNext";
import React, { useCallback, useEffect, useState } from "react";
import { useStyleUtils } from "react-design-system";
import { useDispatch } from "react-redux";
import { SearchResultDto, domElementIds } from "shared";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { routes } from "src/app/routes/routes";
import { searchSelectors } from "src/core-logic/domain/search/search.selectors";
import { searchSlice } from "src/core-logic/domain/search/search.slice";
import { SearchResult } from "./SearchResult";

type ResultsPerPageOptions = (typeof resultsPerPageOptions)[number];

const resultsPerPageOptions = ["6", "12", "24", "48"] as const;
const defaultResultsPerPage: ResultsPerPageOptions = "12";
const initialPage = 0;

const isResultPerPageOption = (value: string): value is ResultsPerPageOptions =>
  resultsPerPageOptions.includes(value as ResultsPerPageOptions);

export const SearchListResults = () => {
  const searchResults = useAppSelector(searchSelectors.searchResults);
  const [displayedResults, setDisplayedResults] =
    useState<SearchResultDto[]>(searchResults);
  const [resultsPerPage, setResultsPerPage] = useState<ResultsPerPageOptions>(
    defaultResultsPerPage,
  );
  const dispatch = useDispatch();
  const { cx, classes } = useStyleUtils();
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const resultsPerPageValue = parseInt(resultsPerPage);
  const totalPages = Math.ceil(searchResults.length / resultsPerPageValue);
  const getSearchResultsForPage = useCallback(
    (currentPage: number) => {
      const start = currentPage * resultsPerPageValue;
      const end = start + resultsPerPageValue;
      return searchResults.slice(start, end);
    },
    [searchResults, resultsPerPageValue],
  );

  useEffect(() => {
    setDisplayedResults(getSearchResultsForPage(currentPage));
  }, [currentPage, resultsPerPage, getSearchResultsForPage]);
  const hasResults = displayedResults.length > 0;
  return (
    <>
      <div className={fr.cx("fr-container")}>
        <div
          className={fr.cx(
            "fr-grid-row",
            "fr-grid-row--gutters",
            !hasResults && "fr-grid-row--center",
          )}
        >
          {!hasResults && (
            <div
              className={cx(
                fr.cx("fr-col-6", "fr-py-6w"),
                classes["text-centered"],
              )}
            >
              <p className={fr.cx("fr-h6")}>
                Aucun résultat ne correspond à votre recherche 😓
              </p>
              <p>
                Vous pouvez essayer d'élargir votre recherche en augmentant le
                rayon de recherche ou en ne sélectionnant pas de métier.
              </p>
            </div>
          )}
          {hasResults &&
            displayedResults.map((searchResult) => (
              <SearchResult
                key={`${searchResult.siret}-${searchResult.rome}`} // Should be unique !
                establishment={searchResult}
                onButtonClick={() => {
                  const appellations = searchResult.appellations;
                  const appellationCode = appellations?.length
                    ? appellations[0].appellationCode
                    : null;
                  if (appellationCode) {
                    routes
                      .searchResult({
                        siret: searchResult.siret,
                        appellationCode,
                      })
                      .push();
                    return;
                  }
                  dispatch(
                    searchSlice.actions.fetchSearchResultRequested(
                      searchResult,
                    ),
                  );
                  routes
                    .searchResultExternal({
                      siret: searchResult.siret,
                    })
                    .push();
                }}
              />
            ))}
        </div>
      </div>
      <div className={fr.cx("fr-container", "fr-mb-10w")}>
        <div
          className={fr.cx("fr-grid-row", "fr-grid-row--middle", "fr-mt-4w")}
        >
          <div className={fr.cx("fr-col-10", "fr-grid-row")}>
            <Pagination
              showFirstLast
              count={totalPages}
              defaultPage={currentPage + 1}
              getPageLinkProps={(pageNumber) => ({
                title: `Résultats de recherche, page : ${pageNumber}`,
                onClick: (event) => {
                  event.preventDefault();
                  setCurrentPage(pageNumber - 1);
                },
                href: "#", // TODO : PR vers react-dsfr pour gérer pagination full front
                key: `pagination-link-${pageNumber}`,
              })}
              className={fr.cx("fr-mt-1w")}
            />
          </div>
          <div
            className={fr.cx("fr-col-2", "fr-grid-row", "fr-grid-row--right")}
          >
            <Select
              label=""
              options={[
                ...resultsPerPageOptions.map((numberAsString) => ({
                  label: `${numberAsString} résultats / page`,
                  value: numberAsString,
                })),
              ]}
              nativeSelectProps={{
                id: domElementIds.search.resultPerPageDropdown,
                onChange: (event) => {
                  const value = event.currentTarget.value;
                  if (isResultPerPageOption(value)) {
                    setResultsPerPage(value);
                  }
                },
                value: resultsPerPage,
                "aria-label": "Nombre de résultats par page",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};
