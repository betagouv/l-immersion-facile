import { fr } from "@codegouvfr/react-dsfr";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { Select } from "@codegouvfr/react-dsfr/SelectNext";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { ErrorNotifications } from "react-design-system";
import { FormProvider, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import {
  AgencyDto,
  AgencyStatus,
  allAgencyStatuses,
  domElementIds,
  editAgencySchema,
  toDotNotation,
} from "shared";
import {
  AgencyFormCommonFields,
  AgencyLogoUpload,
} from "src/app/components/forms/agency/AgencyFormCommonFields";
import { formAgencyFieldsLabels } from "src/app/contents/forms/agency/formAgency";
import {
  formErrorsToFlatErrors,
  getFormContents,
  makeFieldError,
} from "src/app/hooks/formContents.hooks";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import "src/assets/admin.css";
import { agencyAdminSelectors } from "src/core-logic/domain/admin/agenciesAdmin/agencyAdmin.selectors";
import { agencyAdminSlice } from "src/core-logic/domain/admin/agenciesAdmin/agencyAdmin.slice";
import { icUsersAdminSlice } from "src/core-logic/domain/admin/icUsersAdmin/icUsersAdmin.slice";

type EditAgencyFormProperties = {
  agency: AgencyDto;
};

const agencyStatusToLabel: Record<AgencyStatus, string> = {
  active: "Active",
  closed: "Fermée",
  rejected: "Rejetée",
  needsReview: "En attende d'activation",
  "from-api-PE": "Import Api",
};

const statusListOfOptions = allAgencyStatuses.map((agencyStatus) => ({
  value: agencyStatus,
  label: agencyStatusToLabel[agencyStatus],
}));

export const EditAgencyForm = ({
  agency,
}: EditAgencyFormProperties): JSX.Element => {
  const dispatch = useDispatch();
  const agencyState = useAppSelector(agencyAdminSelectors.agencyState);
  const { getFormErrors } = getFormContents(formAgencyFieldsLabels);
  const methods = useForm<AgencyDto>({
    resolver: zodResolver(editAgencySchema),
    mode: "onTouched",
    defaultValues: agency,
  });
  const { register, handleSubmit, formState } = methods;

  const getFieldError = makeFieldError(formState);

  const refersToOtherAgency = !!agency.refersToAgencyId;
  return (
    <FormProvider {...methods}>
      <form
        className={fr.cx("fr-my-4w")}
        onSubmit={handleSubmit((values) => {
          dispatch(agencyAdminSlice.actions.updateAgencyRequested(values));
          dispatch(
            icUsersAdminSlice.actions.fetchAgencyUsersRequested({
              agencyId: agency.id,
            }),
          );
        })}
        id={domElementIds.admin.agencyTab.editAgencyForm}
        data-matomo-name={domElementIds.admin.agencyTab.editAgencyForm}
      >
        <div className={fr.cx("fr-mb-4w")}>
          <AgencyFormCommonFields
            addressInitialValue={agency.address}
            refersToOtherAgency={refersToOtherAgency}
          />

          <Select
            label="!Statut de l'agence !"
            options={statusListOfOptions}
            placeholder="Sélectionner un statut"
            nativeSelectProps={{
              ...register("status"),
              id: domElementIds.admin.agencyTab.editAgencyFormStatusSelector,
            }}
          />

          <Input
            label="!Code Safir de l'agence !"
            nativeInputProps={{
              ...register("codeSafir"),
              placeholder: "Code Safir ",
              id: domElementIds.admin.agencyTab.editAgencyFormSafirCodeInput,
            }}
            {...getFieldError("codeSafir")}
          />

          <AgencyLogoUpload />
        </div>
        <ErrorNotifications
          labels={getFormErrors()}
          errors={toDotNotation(formErrorsToFlatErrors(formState.errors))}
          visible={
            formState.submitCount !== 0 &&
            Object.values(formState.errors).length > 0
          }
        />

        <div className={fr.cx("fr-mt-4w")}>
          <Button
            type="submit"
            disabled={agencyState.isUpdating}
            nativeButtonProps={{
              id: domElementIds.admin.agencyTab.editAgencyFormEditSubmitButton,
            }}
          >
            Mettre à jour
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};
