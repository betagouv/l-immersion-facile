import React, { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useDispatch } from "react-redux";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { Select } from "@codegouvfr/react-dsfr/SelectNext";
import { differenceInYears } from "date-fns";
import { keys } from "ramda";
import {
  ConventionReadDto,
  InternshipKind,
  isBeneficiaryStudent,
  levelsOfEducation,
} from "shared";
import { ConventionEmailWarning } from "src/app/components/forms/convention/ConventionEmailWarning";
import { booleanSelectOptions } from "src/app/contents/forms/common/values";
import { formConventionFieldsLabels } from "src/app/contents/forms/convention/formConvention";
import {
  getFormContents,
  makeFieldError,
} from "src/app/hooks/formContents.hooks";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { authSelectors } from "src/core-logic/domain/auth/auth.selectors";
import { conventionSelectors } from "src/core-logic/domain/convention/convention.selectors";
import { conventionSlice } from "src/core-logic/domain/convention/convention.slice";
import { EmailValidationInput } from "../../../commons/EmailValidationInput";
import { BeneficiaryCurrentEmployerFields } from "./BeneficiaryCurrentEmployerFields";
import { BeneficiaryEmergencyContactFields } from "./BeneficiaryEmergencyContactFields";
import { BeneficiaryRepresentativeFields } from "./BeneficiaryRepresentativeFields";

type beneficiaryFormSectionProperties = {
  internshipKind: InternshipKind;
};
export const BeneficiaryFormSection = ({
  internshipKind,
}: beneficiaryFormSectionProperties): JSX.Element => {
  const [isMinorAccordingToAge, setIsMinorAccordingToAge] = useState(false);
  const isMinorOrProtected = useAppSelector(conventionSelectors.isMinor);
  const hasCurrentEmployer = useAppSelector(
    conventionSelectors.hasCurrentEmployer,
  );
  const isSuccessfullyPeConnected = useAppSelector(authSelectors.isPeConnected);
  const connectedUser = useAppSelector(authSelectors.connectedUser);
  const userFieldsAreFilled = isSuccessfullyPeConnected && !!connectedUser;
  const { register, getValues, setValue, formState } =
    useFormContext<ConventionReadDto>();
  const values = getValues();
  const dispatch = useDispatch();
  const getFieldError = makeFieldError(formState);
  const { getFormFields } = getFormContents(
    formConventionFieldsLabels(values.internshipKind),
  );
  const formContents = getFormFields();

  useEffect(() => {
    if (userFieldsAreFilled) {
      const valuesToUpdate = {
        "signatories.beneficiary.firstName": connectedUser.firstName,
        "signatories.beneficiary.lastName": connectedUser.lastName,
        "signatories.beneficiary.email": connectedUser.email,
      };
      keys(valuesToUpdate).forEach((key) => setValue(key, valuesToUpdate[key]));
    }
  }, [userFieldsAreFilled]);

  useEffect(() => {
    const initialValues = values.signatories.beneficiaryRepresentative;
    setValue(
      "signatories.beneficiaryRepresentative",
      isMinorOrProtected && initialValues
        ? {
            ...initialValues,
            role: "beneficiary-representative",
          }
        : undefined,
    );
  }, [isMinorOrProtected]);

  useEffect(() => {
    const initialValues = values.signatories.beneficiaryCurrentEmployer;
    setValue(
      "signatories.beneficiaryCurrentEmployer",
      hasCurrentEmployer && initialValues
        ? {
            ...initialValues,
            role: "beneficiary-current-employer",
          }
        : undefined,
    );
  }, [hasCurrentEmployer]);

  const levelsOfEducationToSelectOption = levelsOfEducation.map(
    (level: string) => ({ label: level, value: level }),
  );

  return (
    <>
      <Input
        hintText={formContents["signatories.beneficiary.firstName"].hintText}
        label={formContents["signatories.beneficiary.firstName"].label}
        nativeInputProps={{
          ...formContents["signatories.beneficiary.firstName"],
          ...register("signatories.beneficiary.firstName"),
          ...(userFieldsAreFilled ? { value: connectedUser.firstName } : {}),
        }}
        disabled={userFieldsAreFilled}
        {...getFieldError("signatories.beneficiary.firstName")}
      />
      <Input
        hintText={formContents["signatories.beneficiary.lastName"].hintText}
        label={formContents["signatories.beneficiary.lastName"].label}
        nativeInputProps={{
          ...formContents["signatories.beneficiary.lastName"],
          ...register("signatories.beneficiary.lastName"),
          ...(userFieldsAreFilled ? { value: connectedUser.lastName } : {}),
        }}
        disabled={userFieldsAreFilled}
        {...getFieldError("signatories.beneficiary.lastName")}
      />

      <Input
        hintText={formContents["signatories.beneficiary.birthdate"].hintText}
        label={formContents["signatories.beneficiary.birthdate"].label}
        nativeInputProps={{
          ...formContents["signatories.beneficiary.birthdate"],
          ...register("signatories.beneficiary.birthdate"),
          onBlur: (event) => {
            const age = differenceInYears(
              new Date(values.dateStart),
              new Date(event.target.value),
            );
            const newIsMinor = age < 18;
            setIsMinorAccordingToAge(newIsMinor);
            dispatch(conventionSlice.actions.isMinorChanged(newIsMinor));
          },
          type: "date",
          max: "9999-12-31",
        }}
        {...getFieldError("signatories.beneficiary.birthdate")}
      />
      <EmailValidationInput
        hintText={formContents["signatories.beneficiary.email"].hintText}
        label={formContents["signatories.beneficiary.email"].label}
        disabled={userFieldsAreFilled}
        nativeInputProps={{
          ...formContents["signatories.beneficiary.email"],
          ...register("signatories.beneficiary.email"),
          ...(userFieldsAreFilled ? { value: connectedUser.email } : {}),
        }}
        {...getFieldError("signatories.beneficiary.email")}
      />

      {values.signatories.beneficiary.email && <ConventionEmailWarning />}
      <Input
        label={formContents["signatories.beneficiary.phone"].label}
        hintText={formContents["signatories.beneficiary.phone"].hintText}
        nativeInputProps={{
          ...formContents["signatories.beneficiary.phone"],
          ...register("signatories.beneficiary.phone"),
          type: "tel",
        }}
        {...getFieldError("signatories.beneficiary.phone")}
      />
      {values.internshipKind === "mini-stage-cci" && (
        <>
          <Select
            label={
              formContents["signatories.beneficiary.levelOfEducation"].label
            }
            hint={
              formContents["signatories.beneficiary.levelOfEducation"].hintText
            }
            options={levelsOfEducationToSelectOption}
            nativeSelectProps={{
              ...formContents["signatories.beneficiary.levelOfEducation"],
              ...register("signatories.beneficiary.levelOfEducation"),
              value: isBeneficiaryStudent(values.signatories.beneficiary)
                ? values.signatories.beneficiary.levelOfEducation
                : "",
            }}
            {...getFieldError("signatories.beneficiary.levelOfEducation")}
          />

          <Input
            label={formContents["signatories.beneficiary.schoolName"].label}
            hintText={
              formContents["signatories.beneficiary.schoolName"].hintText
            }
            nativeInputProps={{
              ...formContents["signatories.beneficiary.schoolName"],
              ...register("signatories.beneficiary.schoolName"),
            }}
            {...getFieldError("signatories.beneficiary.schoolName")}
          />

          <Input
            label={formContents["signatories.beneficiary.schoolPostcode"].label}
            hintText={
              formContents["signatories.beneficiary.schoolPostcode"].hintText
            }
            nativeInputProps={{
              ...formContents["signatories.beneficiary.schoolPostcode"],
              ...register("signatories.beneficiary.schoolPostcode"),
            }}
            {...getFieldError("signatories.beneficiary.schoolPostcode")}
          />
        </>
      )}
      <Input
        label={formContents["signatories.beneficiary.financiaryHelp"].label}
        hintText={
          formContents["signatories.beneficiary.financiaryHelp"].hintText
        }
        textArea
        nativeTextAreaProps={{
          ...formContents["signatories.beneficiary.financiaryHelp"],
          ...register("signatories.beneficiary.financiaryHelp"),
        }}
        {...getFieldError("signatories.beneficiary.financiaryHelp")}
      />

      {!isMinorAccordingToAge && (
        <RadioButtons
          legend={formContents.isMinor.label}
          hintText={formContents.isMinor.hintText}
          options={booleanSelectOptions.map((option) => ({
            ...option,
            nativeInputProps: {
              ...option.nativeInputProps,
              checked:
                Boolean(option.nativeInputProps.value) === isMinorOrProtected,
              onChange: () => {
                dispatch(
                  conventionSlice.actions.isMinorChanged(
                    Boolean(option.nativeInputProps.value),
                  ),
                );
              },
            },
          }))}
        />
      )}

      {isMinorOrProtected && <BeneficiaryRepresentativeFields />}

      <RadioButtons
        legend={formContents["signatories.beneficiary.isRqth"].label}
        hintText={formContents["signatories.beneficiary.isRqth"].hintText}
        options={booleanSelectOptions.map((option) => ({
          ...option,
          nativeInputProps: {
            ...option.nativeInputProps,
            checked:
              Boolean(option.nativeInputProps.value) ===
              values.signatories.beneficiary.isRqth,
            onChange: () => {
              setValue(
                "signatories.beneficiary.isRqth",
                Boolean(option.nativeInputProps.value),
                { shouldValidate: true },
              );
            },
          },
        }))}
      />

      {!isMinorOrProtected && <BeneficiaryEmergencyContactFields />}

      {internshipKind !== "mini-stage-cci" && (
        <>
          <RadioButtons
            legend={formContents.isCurrentEmployer.label}
            hintText={formContents.isCurrentEmployer.hintText}
            options={booleanSelectOptions.map((option) => ({
              ...option,
              nativeInputProps: {
                ...option.nativeInputProps,
                checked:
                  Boolean(option.nativeInputProps.value) === hasCurrentEmployer,
                onChange: () => {
                  dispatch(
                    conventionSlice.actions.isCurrentEmployerChanged(
                      Boolean(option.nativeInputProps.value),
                    ),
                  );
                },
              },
            }))}
          />

          {hasCurrentEmployer && <BeneficiaryCurrentEmployerFields />}
        </>
      )}
    </>
  );
};
