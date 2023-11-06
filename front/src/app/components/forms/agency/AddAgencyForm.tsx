import React, { useState } from "react";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { fr } from "@codegouvfr/react-dsfr";
import { Button } from "@codegouvfr/react-dsfr/Button";
import RadioButtons from "@codegouvfr/react-dsfr/RadioButtons";
import { zodResolver } from "@hookform/resolvers/zod";
import { match } from "ts-pattern";
import { v4 as uuidV4 } from "uuid";
import {
  AgencyDto,
  AgencyKind,
  CreateAgencyDto,
  createAgencySchema,
  domElementIds,
  toDotNotation,
} from "shared";
import { ErrorNotifications } from "react-design-system";
import { agencySubmitMessageByKind } from "src/app/components/agency/AgencySubmitFeedback";
import {
  AgencyFormCommonFields,
  AgencyLogoUpload,
} from "src/app/components/forms/agency/AgencyFormCommonFields";
import {
  AgencySelector,
  departmentOptions,
} from "src/app/components/forms/commons/AgencySelector";
import { SubmitFeedbackNotification } from "src/app/components/SubmitFeedbackNotification";
import { formAgencyFieldsLabels } from "src/app/contents/forms/agency/formAgency";
import { RadioButtonOption } from "src/app/contents/forms/common/values";
import {
  formErrorsToFlatErrors,
  getFormContents,
} from "src/app/hooks/formContents.hooks";
import { agencyGateway } from "src/config/dependencies";
import { AgencySubmitFeedback } from "src/core-logic/domain/admin/agenciesAdmin/agencyAdmin.slice";

type CreateAgencyInitialValues = Omit<CreateAgencyDto, "kind"> & {
  kind: AgencyKind | "";
};

export const AddAgencyForm = () => {
  const [hasAgencyReferral, setHasAgencyReferral] = useState<
    boolean | undefined
  >(undefined);

  const agencyRefersToOptions: RadioButtonOption[] = [
    {
      label: "Prescripteur",
      nativeInputProps: {
        value: 1,
        onClick: () => setHasAgencyReferral(false),
      },
    },
    {
      label: "Structure d'accompagnement",
      nativeInputProps: {
        value: 0,
        onClick: () => setHasAgencyReferral(true),
      },
    },
  ];
  return (
    <>
      <RadioButtons
        legend={"Êtes-vous un prescripteur ou une structure d'accompagnement ?"}
        options={agencyRefersToOptions}
      />
      {match(hasAgencyReferral)
        .with(true, () => <AgencyForm hasAgencyReferral={true} />)
        .with(false, () => <AgencyForm hasAgencyReferral={false} />)
        .with(undefined, () => null)
        .exhaustive()}
    </>
  );
};

const AgencyForm = ({ hasAgencyReferral }: { hasAgencyReferral: boolean }) => {
  const [submitFeedback, setSubmitFeedback] = useState<AgencySubmitFeedback>({
    kind: "idle",
  });
  const { getFormErrors, getFormFields } = getFormContents(
    formAgencyFieldsLabels,
  );
  const { refersToAgencyId: refersToAgencyIdField } = getFormFields();
  const methods = useForm<CreateAgencyInitialValues>({
    resolver: zodResolver(createAgencySchema),
    mode: "onTouched",
    defaultValues: initialValues(uuidV4()),
  });

  const { handleSubmit, formState } = methods;

  const onFormValid: SubmitHandler<CreateAgencyInitialValues> = (values) => {
    if (values.kind === "") throw new Error("Agency kind is empty");
    return agencyGateway
      .addAgency({
        ...values,
        kind: values.kind,
        questionnaireUrl:
          values.kind === "pole-emploi" ? "" : values.questionnaireUrl,
      })
      .then(() => setSubmitFeedback({ kind: "agencyAdded" }))
      .catch((e) => {
        //eslint-disable-next-line  no-console
        console.log("AddAgencyPage", e);
        setSubmitFeedback(e);
      });
  };
  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onFormValid)}>
        <p className={fr.cx("fr-text--xs")}>
          Tous les champs marqués d'une astérisque (*) sont obligatoires.
        </p>
        {hasAgencyReferral && (
          <>
            <h2 className={fr.cx("fr-text--lead", "fr-mb-2w")}>
              Prescripteur lié (signataire des conventions)
            </h2>
            <AgencySelector
              fields={{
                agencyDepartmentField: {
                  name: "refersToAgencyDepartment",
                  label: "Département",
                  required: true,
                  id: "refersToAgencyDepartment",
                  placeholder: "Sélectionnez un département",
                },
                agencyIdField: refersToAgencyIdField,
                agencyKindField: {
                  name: "refersToAgencyKind",
                  label: "Type d'organisme",
                  required: true,
                  id: "refersToAgencyKind",
                },
              }}
              initialAgencies={[]}
              shouldLockToPeAgencies={false}
              shouldShowAgencyKindField
              agencyDepartmentOptions={departmentOptions}
              agenciesRetriever={(departementCode) =>
                agencyGateway.listImmersionAgencies(departementCode)
              }
            />
          </>
        )}
        <h2 className={fr.cx("fr-text--lead", "fr-mb-2w")}>
          Structure d'accompagnement
        </h2>
        <AgencyFormCommonFields />
        <AgencyLogoUpload />

        <ErrorNotifications
          labels={getFormErrors()}
          errors={toDotNotation(formErrorsToFlatErrors(formState.errors))}
          visible={
            formState.submitCount !== 0 &&
            Object.values(formState.errors).length > 0
          }
        />
        <SubmitFeedbackNotification
          submitFeedback={submitFeedback}
          messageByKind={agencySubmitMessageByKind}
        />
        <div className={fr.cx("fr-mt-4w")}>
          <Button
            type="submit"
            disabled={formState.isSubmitting || submitFeedback.kind !== "idle"}
            nativeButtonProps={{
              id: domElementIds.addAgency.submitButton,
            }}
          >
            Soumettre
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

const initialValues: (id: AgencyDto["id"]) => CreateAgencyInitialValues = (
  id,
) => ({
  id,
  kind: "",
  name: "",
  address: {
    streetNumberAndAddress: "",
    postcode: "",
    city: "",
    departmentCode: "",
  },
  position: {
    lat: 0,
    lon: 0,
  },
  counsellorEmails: [],
  validatorEmails: [],
  questionnaireUrl: "",
  logoUrl: undefined,
  signature: "",
  agencySiret: "",
});
