import distanceSearchIcon from "/distance-search-icon.svg";
import locationSearchIcon from "/location-search-icon.svg";
import SearchIcon from "@mui/icons-material/Search";
import { Form, Formik } from "formik";
import React from "react";
import { useDispatch } from "react-redux";
import { RomeAutocomplete } from "src/app/components/RomeAutocomplete";
import { HeaderFooterLayout } from "src/app/layouts/HeaderFooterLayout";
import { useAppSelector } from "src/app/utils/reduxHooks";
import { searchSelectors } from "src/core-logic/search/search.selectors";
import { searchSlice } from "src/core-logic/search/search.slice";
import { AddressAutocomplete } from "src/uiComponents/AddressAutocomplete";
import { HomeImmersionHowTo } from "src/uiComponents/ImmersionHowTo";
import { SearchButton } from "src/uiComponents/SearchButton";
import { StaticDropdown } from "./Dropdown/StaticDropdown";
import { OurAdvises } from "./OurAdvises";
import { SearchResultPanel } from "./SearchResultPanel";

interface SearchInput {
  rome?: string;
  nafDivision?: string;
  lat: number;
  lon: number;
  radiusKm: number;
}

const radiusOptions = [1, 2, 5, 10, 20, 50, 100];
const initiallySelectedIndex = 3; // to get 10 km radius by default

export const SearchPage = () => {
  const searchStatus = useAppSelector(searchSelectors.searchStatus);
  const dispatch = useDispatch();

  return (
    <HeaderFooterLayout>
      <div className="sm:flex sm:items-center bg-gradient-to-b from-immersionRed-dark to-immersionRed-light">
        <div className="h-[672px] flex-1 flex flex-col items-center p-10">
          <h1 className="text-2xl text-white text-center font-bold">
            Trouvez une entreprise accueillante pour réaliser une immersion
            facile
          </h1>
          <span style={{ height: "30px" }} />
          <Formik<SearchInput>
            initialValues={{
              lat: 0,
              lon: 0,
              radiusKm: 10,
            }}
            onSubmit={(values) => {
              dispatch(
                searchSlice.actions.searchRequested({
                  rome: values.rome || undefined,
                  location: {
                    lat: values.lat,
                    lon: values.lon,
                  },
                  distance_km: values.radiusKm,
                }),
              );
            }}
          >
            {({ setFieldValue }) => (
              <Form>
                <div className="gap-5 flex flex-col">
                  <div>
                    <RomeAutocomplete
                      title="Métier recherché"
                      setFormValue={(newValue) =>
                        setFieldValue("rome", newValue.romeCode)
                      }
                      className="searchdropdown-header inputLabel"
                    />
                  </div>

                  <div>
                    <AddressAutocomplete
                      label="Lieu"
                      headerClassName="searchdropdown-header inputLabel"
                      inputStyle={{
                        paddingLeft: "48px",
                        background: `white url(${locationSearchIcon}) no-repeat scroll 11px 8px`,
                      }}
                      setFormValue={({ coordinates }) => {
                        setFieldValue("lat", coordinates.lat);
                        setFieldValue("lon", coordinates.lon);
                      }}
                    />
                  </div>

                  <div>
                    <StaticDropdown
                      inputStyle={{
                        paddingLeft: "48px",
                        background: `white url(${distanceSearchIcon}) no-repeat scroll 11px 8px`,
                      }}
                      title="Rayon"
                      onSelection={(
                        newValue: string,
                        selectedIndex: number,
                      ) => {
                        setFieldValue("radiusKm", radiusOptions[selectedIndex]);
                      }}
                      defaultSelectedIndex={initiallySelectedIndex}
                      options={radiusOptions.map((n) => `${n} km`)}
                    />
                  </div>
                  <SearchButton
                    className="mt-12"
                    dark
                    disabled={
                      searchStatus === "initialFetch" ||
                      searchStatus === "extraFetch"
                    }
                    type="submit"
                  >
                    <SearchIcon />
                    <div>Rechercher</div>
                  </SearchButton>
                </div>
              </Form>
            )}
          </Formik>
        </div>
        <div className="flex flex-col items-center sm:h-[670px] sm:flex-1 sm:overflow-y-scroll">
          <SearchResultPanel />
        </div>
      </div>
      <div>
        <OurAdvises />
        <HomeImmersionHowTo />
      </div>
    </HeaderFooterLayout>
  );
};
