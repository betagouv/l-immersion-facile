import React from "react";
import { useFormContext } from "react-hook-form";
import { fr } from "@codegouvfr/react-dsfr";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { ConventionDto } from "shared";
import { formConventionFieldsLabels } from "src/app/contents/forms/convention/formConvention";
import {
  makeFieldError,
  useFormContents,
} from "src/app/hooks/formContents.hooks";

type BeneficiaryCurrentEmployerFieldsProperties = {
  disabled: boolean | undefined;
};

export const BeneficiaryCurrentEmployerFields = ({
  disabled,
}: BeneficiaryCurrentEmployerFieldsProperties): JSX.Element => {
  const { getValues, register, formState } = useFormContext<ConventionDto>();
  const values = getValues();
  const { getFormFields } = useFormContents(
    formConventionFieldsLabels(values.internshipKind),
  );
  const formFields = getFormFields();
  const getFieldError = makeFieldError(formState);

  return (
    <>
      <Alert
        severity="info"
        title="Accord de l'employeur"
        className={fr.cx("fr-mb-2w")}
        description={
          <>
            <p>
              <strong>
                Si l'immersion se fait en dehors du temps de travail, l'accord
                de l'employeur n'est pas nécessaire.
              </strong>
            </p>
            <p>
              Le bénéficiaire peut effectuer son immersion sur son temps de
              travail. Dans ce cas, l’accord de son employeur actuel est
              nécessaire. Le contrat de travail n’est pas suspendu et
              l’employeur actuel couvre le risque accident du travail pendant la
              durée de l’immersion.
            </p>
          </>
        }
      />

      <Input
        label={
          formFields["signatories.beneficiaryCurrentEmployer.businessSiret"]
            .label
        }
        hintText={
          formFields["signatories.beneficiaryCurrentEmployer.businessSiret"]
            .hintText
        }
        nativeInputProps={{
          ...formFields["signatories.beneficiaryCurrentEmployer.businessSiret"],
          ...register("signatories.beneficiaryCurrentEmployer.businessSiret"),
        }}
        disabled={disabled}
        {...getFieldError(
          "signatories.beneficiaryCurrentEmployer.businessSiret",
        )}
      />
      <Input
        label={
          formFields["signatories.beneficiaryCurrentEmployer.businessName"]
            .label
        }
        hintText={
          formFields["signatories.beneficiaryCurrentEmployer.businessName"]
            .hintText
        }
        nativeInputProps={{
          ...formFields["signatories.beneficiaryCurrentEmployer.businessName"],
          ...register("signatories.beneficiaryCurrentEmployer.businessName"),
        }}
        disabled={disabled}
        {...getFieldError(
          "signatories.beneficiaryCurrentEmployer.businessName",
        )}
      />
      <Input
        label={
          formFields["signatories.beneficiaryCurrentEmployer.firstName"].label
        }
        hintText={
          formFields["signatories.beneficiaryCurrentEmployer.firstName"]
            .hintText
        }
        nativeInputProps={{
          ...formFields["signatories.beneficiaryCurrentEmployer.firstName"],
          ...register("signatories.beneficiaryCurrentEmployer.firstName"),
        }}
        disabled={disabled}
        {...getFieldError("signatories.beneficiaryCurrentEmployer.firstName")}
      />
      <Input
        {...formFields["signatories.beneficiaryCurrentEmployer.lastName"]}
        label={
          formFields["signatories.beneficiaryCurrentEmployer.lastName"].label
        }
        hintText={
          formFields["signatories.beneficiaryCurrentEmployer.lastName"].hintText
        }
        nativeInputProps={{
          ...formFields["signatories.beneficiaryCurrentEmployer.lastName"],
          ...register("signatories.beneficiaryCurrentEmployer.lastName"),
        }}
        disabled={disabled}
        {...getFieldError("signatories.beneficiaryCurrentEmployer.lastName")}
      />
      <Input
        label={formFields["signatories.beneficiaryCurrentEmployer.job"].label}
        hintText={
          formFields["signatories.beneficiaryCurrentEmployer.job"].hintText
        }
        nativeInputProps={{
          ...formFields["signatories.beneficiaryCurrentEmployer.job"],
          ...register("signatories.beneficiaryCurrentEmployer.job"),
        }}
        disabled={disabled}
        {...getFieldError("signatories.beneficiaryCurrentEmployer.job")}
      />
      <Input
        label={formFields["signatories.beneficiaryCurrentEmployer.phone"].label}
        hintText={
          formFields["signatories.beneficiaryCurrentEmployer.phone"].hintText
        }
        nativeInputProps={{
          ...formFields["signatories.beneficiaryCurrentEmployer.phone"],
          ...register("signatories.beneficiaryCurrentEmployer.phone"),
        }}
        disabled={disabled}
        {...getFieldError("signatories.beneficiaryCurrentEmployer.phone")}
      />
      <Input
        label={formFields["signatories.beneficiaryCurrentEmployer.email"].label}
        hintText={
          formFields["signatories.beneficiaryCurrentEmployer.email"].hintText
        }
        nativeInputProps={{
          ...formFields["signatories.beneficiaryCurrentEmployer.email"],
          ...register("signatories.beneficiaryCurrentEmployer.email"),
        }}
        disabled={disabled}
        {...getFieldError("signatories.beneficiaryCurrentEmployer.email")}
      />
    </>
  );
};
