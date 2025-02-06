import { fr } from "@codegouvfr/react-dsfr";
import { Button } from "@codegouvfr/react-dsfr/Button";
import Checkbox from "@codegouvfr/react-dsfr/Checkbox";
import Input from "@codegouvfr/react-dsfr/Input";
import Table from "@codegouvfr/react-dsfr/Table";
import React, { ElementRef, useState } from "react";
import { Tag } from "react-design-system";
import { useDispatch } from "react-redux";
import {
  AgencyId,
  InclusionConnectedUser,
  SiretDto,
  agencyKindToLabelIncludingIF,
  domElementIds,
  looksLikeSiret,
} from "shared";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { routes } from "src/app/routes/routes";
import { agenciesSelectors } from "src/core-logic/domain/agencies/agencies.selectors";
import { agenciesSlice } from "src/core-logic/domain/agencies/agencies.slice";
import { inclusionConnectedSlice } from "src/core-logic/domain/inclusionConnected/inclusionConnected.slice";

export const RegisterAgenciesForm = ({
  currentUser,
  initialSiret,
}: {
  currentUser: InclusionConnectedUser;
  initialSiret?: SiretDto;
}) => {
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = useState<SiretDto | undefined>(undefined);

  const agencySearchBySiretOrNameInput =
    React.useRef<ElementRef<"input">>(null);

  const [isAllChecked, setIsAllChecked] = useState<boolean>(false);
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<AgencyId[]>([]);

  const onAgencySearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.currentTarget.value);
    setSelectedAgencyIds([]);
    setIsAllChecked(false);
    dispatch(
      agenciesSlice.actions.fetchAgencyOptionsRequested({
        [looksLikeSiret(event.currentTarget.value) ? "siret" : "nameIncludes"]:
          event.currentTarget.value,
        status: ["active", "from-api-PE"],
      }),
    );
  };

  if (inputValue === undefined && initialSiret) {
    setInputValue(initialSiret);
  }

  return (
    <>
      <div className={fr.cx("fr-mt-4w", "fr-mb-2w")}>
        <Input
          label="Se rattacher à un organisme"
          hintText="Rechercher par n° SIRET ou nom sous lequel il est enregistré sur Immersion Facilitée"
          nativeInputProps={{
            id: domElementIds.agencyDashboard.registerAgencies.search,
            type: "search",
            placeholder: "",
            value: inputValue,
            onChange: onAgencySearchChange,
            onKeyDown: (event) => {
              if (event.key === "Escape") {
                agencySearchBySiretOrNameInput.current?.blur();
              }
            },
          }}
        />
      </div>
      <a
        href="https://annuaire-entreprises.data.gouv.fr/"
        target="_blank"
        rel="noreferrer"
        className={fr.cx("fr-link")}
      >
        <i className={fr.cx("fr-icon-information-fill", "fr-icon--sm")} />
        Retrouver votre siret sur l'Annuaire des Entreprises
      </a>

      {inputValue && (
        <>
          <section className={fr.cx("fr-mt-6w")}>
            <div className={fr.cx("fr-grid-row")}>
              <div className={fr.cx("fr-col-12", "fr-col-md-8")}>
                <strong>Résultats pour votre recherche "{inputValue}"</strong>

                <p className={fr.cx("fr-hint-text")}>
                  {selectedAgencyIds.length}{" "}
                  {selectedAgencyIds.length <= 1
                    ? "organisme sélectionné"
                    : "organismes sélectionnés"}
                </p>
              </div>
              <Button
                className={fr.cx("fr-col-12", "fr-col-md-4")}
                id={domElementIds.agencyDashboard.registerAgencies.submitButton}
                priority="secondary"
                onClick={() => {
                  dispatch(
                    inclusionConnectedSlice.actions.registerAgenciesRequested({
                      agencies: selectedAgencyIds,
                      feedbackTopic: "dashboard-agency-register-user",
                    }),
                  );
                }}
                disabled={selectedAgencyIds.length === 0}
              >
                Demander l'accès aux organismes sélectionnés
              </Button>
            </div>
            <AgencyTable
              checkedAgencies={selectedAgencyIds}
              setCheckedAgencies={setSelectedAgencyIds}
              isAllChecked={isAllChecked}
              setIsAllChecked={setIsAllChecked}
              currentUser={currentUser}
            />
          </section>
          <section>
            <h2 className={fr.cx("fr-text--lead")}>
              Vous ne trouvez pas votre organisme ?
            </h2>
            <Button
              linkProps={{
                href: `${routes.addAgency().href}`,
              }}
            >
              Créer un nouvel organisme sur Immersion Facilitée
            </Button>
          </section>
        </>
      )}
    </>
  );
};

const AgencyTable = ({
  isAllChecked,
  setIsAllChecked,
  checkedAgencies,
  setCheckedAgencies,
  currentUser,
}: {
  isAllChecked: boolean;
  setIsAllChecked: (isAllChecked: boolean) => void;
  checkedAgencies: AgencyId[];
  setCheckedAgencies: (agencies: AgencyId[]) => void;
  currentUser: InclusionConnectedUser;
}) => {
  const isFetching = useAppSelector(agenciesSelectors.isLoading);
  const userAgencyIds = currentUser.agencyRights.map(
    (agencyRight) => agencyRight.agency.id,
  );
  const agencies = useAppSelector(agenciesSelectors.options).filter(
    (agency) => !userAgencyIds.includes(agency.id),
  );

  if (isFetching) return <p>Chargement en cours...</p>;
  if (agencies.length === 0)
    return <p>Aucun organisme correspondant à votre recherche</p>;

  return (
    <Table
      fixed
      id={domElementIds.agencyDashboard.registerAgencies.table}
      headers={[
        <Checkbox
          options={[
            {
              label: "",
              nativeInputProps: {
                checked: isAllChecked,
                onChange: (event) => {
                  const checked = event.currentTarget.checked;
                  setIsAllChecked(checked);
                  if (!checked) {
                    setCheckedAgencies([]);
                  } else {
                    setCheckedAgencies(agencies.map(({ id }) => id));
                  }
                },
              },
            },
          ]}
        />,
        "Organismes",
      ]}
      data={agencies.map((agency) => [
        <Checkbox
          options={[
            {
              label: "",
              nativeInputProps: {
                checked: checkedAgencies.includes(agency.id),
                onChange: (event) => {
                  const checked = event.currentTarget.checked;
                  if (checked) {
                    setCheckedAgencies([...checkedAgencies, agency.id]);
                  } else {
                    setCheckedAgencies(
                      checkedAgencies.filter((id) => id !== agency.id),
                    );
                  }
                },
              },
            },
          ]}
        />,
        <>
          <Tag
            theme={
              agency.refersToAgencyName
                ? "structureAccompagnement"
                : "prescripteur"
            }
            label={`${
              agency.refersToAgencyName
                ? "Structure d'accompagnement"
                : "Prescripteur"
            } - ${agencyKindToLabelIncludingIF[agency.kind]}`}
          />
          <br />
          <strong>{agency.name}</strong>
          <br />
          <p>{agency.address.streetNumberAndAddress}</p>
        </>,
      ])}
    />
  );
};
