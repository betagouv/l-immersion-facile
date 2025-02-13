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
  agencyKindToLabel,
  agencyStatusToLabel,
  allAgencyStatuses,
  domElementIds,
  editAgencySchema,
} from "shared";
import { AgencyFormCommonFields } from "src/app/components/forms/agency/AgencyFormCommonFields";
import { AgencyOverviewRouteName } from "src/app/components/forms/agency/AgencyOverview";
import { formAgencyFieldsLabels } from "src/app/contents/forms/agency/formAgency";
import {
  displayReadableError,
  getFormContents,
  makeFieldError,
  toErrorsWithLabels,
} from "src/app/hooks/formContents.hooks";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import "src/assets/admin.css";
import { agencyAdminSelectors } from "src/core-logic/domain/admin/agenciesAdmin/agencyAdmin.selectors";
import { agencyAdminSlice } from "src/core-logic/domain/admin/agenciesAdmin/agencyAdmin.slice";
import { updateAgencySlice } from "src/core-logic/domain/agencies/update-agency/updateAgency.slice";

type EditAgencyFormProperties = {
  agency: AgencyDto;
  routeName: AgencyOverviewRouteName;
};

const kindOptions = Object.entries(agencyKindToLabel).map(([value, label]) => ({
  label,
  value: value,
}));

const statusListOfOptions = allAgencyStatuses.map((agencyStatus) => ({
  value: agencyStatus,
  label: agencyStatusToLabel[agencyStatus],
}));

export const EditAgencyForm = ({
  agency,
  routeName,
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

  const adminAgencyIds = domElementIds.admin.agencyTab;

  const agencyDashboardAgencyIds = domElementIds.agencyDashboard.agencyDetails;

  const isRouteAdmin =
    routeName === "adminAgencies" || routeName === "adminAgencyDetail";

  const refersToOtherAgency = !!agency.refersToAgencyId;
  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit((values) => {
          isRouteAdmin
            ? dispatch(agencyAdminSlice.actions.updateAgencyRequested(values))
            : dispatch(
                updateAgencySlice.actions.updateAgencyRequested({
                  ...values,
                  feedbackTopic: "agency-for-dashboard",
                }),
              );
        })}
        id={
          isRouteAdmin
            ? adminAgencyIds.editAgencyForm
            : agencyDashboardAgencyIds.editAgencyForm
        }
        data-matomo-name={
          isRouteAdmin
            ? adminAgencyIds.editAgencyForm
            : agencyDashboardAgencyIds.editAgencyForm
        }
      >
        <div className={fr.cx("fr-mb-4w")}>
          <AgencyFormCommonFields
            addressInitialValue={agency.address}
            refersToOtherAgency={refersToOtherAgency}
            mode="edit"
            disableAgencyName={!isRouteAdmin}
          />

          {isRouteAdmin && (
            <>
              <Select
                label={"!Type de structure!"}
                options={kindOptions}
                nativeSelectProps={{
                  ...register("kind"),
                  id: adminAgencyIds.editAgencyFormKindSelector,
                }}
              />

              <Select
                label="!Statut de l'agence !"
                options={statusListOfOptions}
                placeholder="Sélectionner un statut"
                nativeSelectProps={{
                  ...register("status"),
                  id: adminAgencyIds.editAgencyFormStatusSelector,
                }}
              />

              <Input
                label="!Code Safir de l'agence !"
                nativeInputProps={{
                  ...register("codeSafir"),
                  placeholder: "Code Safir ",
                  id: adminAgencyIds.editAgencyFormSafirCodeInput,
                }}
                {...getFieldError("codeSafir")}
              />
            </>
          )}
        </div>
        <ErrorNotifications
          errorsWithLabels={toErrorsWithLabels({
            labels: getFormErrors(),
            errors: displayReadableError(formState.errors),
          })}
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
              id: isRouteAdmin
                ? adminAgencyIds.editAgencyFormEditSubmitButton
                : agencyDashboardAgencyIds.editAgencyFormEditSubmitButton,
            }}
          >
            Mettre à jour
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};
