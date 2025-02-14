import { Input } from "@codegouvfr/react-dsfr/Input";
import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import { Select } from "@codegouvfr/react-dsfr/SelectNext";
import { keys } from "ramda";
import React, { useCallback, useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useDispatch } from "react-redux";
import {
  BeneficiaryRepresentative,
  ConventionReadDto,
  InternshipKind,
  addressDtoToString,
  domElementIds,
  emailSchema,
  isBeneficiaryMinorAccordingToAge,
  isBeneficiaryStudent,
  levelsOfEducation,
  toLowerCaseWithoutDiacritics,
} from "shared";
import { AddressAutocomplete } from "src/app/components/forms/autocomplete/AddressAutocomplete";
import { ConventionEmailWarning } from "src/app/components/forms/convention/ConventionEmailWarning";
import {
  EmailValidationErrorsState,
  SetEmailValidationErrorsState,
} from "src/app/components/forms/convention/ConventionForm";
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
  setEmailValidationErrors: SetEmailValidationErrorsState;
  emailValidationErrors: EmailValidationErrorsState;
  fromPeConnectedUser?: boolean;
};

export const BeneficiaryFormSection = ({
  internshipKind,
  setEmailValidationErrors,
  emailValidationErrors,
  fromPeConnectedUser,
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
    if (
      hasBeneficiaryRepresentativeData(
        values.signatories.beneficiaryRepresentative,
      ) &&
      !isMinorOrProtected
    ) {
      dispatch(conventionSlice.actions.isMinorChanged(true));
    }
  }, [
    dispatch,
    values.signatories.beneficiaryRepresentative,
    isMinorOrProtected,
  ]);

  useEffect(() => {
    if (userFieldsAreFilled) {
      const { firstName, lastName, email } = connectedUser;
      const valuesToUpdate = {
        "signatories.beneficiary.firstName": firstName,
        "signatories.beneficiary.lastName": lastName,
        "signatories.beneficiary.email": email,
      };
      keys(valuesToUpdate).forEach((key) => setValue(key, valuesToUpdate[key]));
    }
  }, [userFieldsAreFilled, connectedUser, setValue]);

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
  }, [
    hasCurrentEmployer,
    setValue,
    values.signatories.beneficiaryCurrentEmployer,
  ]);

  const levelsOfEducationToSelectOption = levelsOfEducation.map(
    (level: string) => ({ label: level, value: level }),
  );

  const onBirthdateChange = useCallback(
    (value: string) => {
      const newIsMinor = isBeneficiaryMinorAccordingToAge(
        values.dateStart,
        value,
      );
      if (newIsMinor) {
        setValue(
          "signatories.beneficiaryRepresentative.role",
          "beneficiary-representative",
        );
      }
      if (!newIsMinor && !isMinorOrProtected) {
        setValue("signatories.beneficiaryRepresentative", undefined);
      }
      setIsMinorAccordingToAge(newIsMinor);
      dispatch(conventionSlice.actions.isMinorChanged(newIsMinor));
    },
    [dispatch, values.dateStart, setValue, isMinorOrProtected],
  );

  useEffect(() => {
    if (values.signatories.beneficiary.birthdate) {
      onBirthdateChange(values.signatories.beneficiary.birthdate);
    }
  }, [onBirthdateChange, values.signatories.beneficiary.birthdate]);

  return (
    <>
      <Input
        hintText={formContents["signatories.beneficiary.firstName"].hintText}
        label={formContents["signatories.beneficiary.firstName"].label}
        nativeInputProps={{
          ...formContents["signatories.beneficiary.firstName"],
          ...register("signatories.beneficiary.firstName"),
          ...(userFieldsAreFilled
            ? { value: values.signatories.beneficiary.firstName }
            : {}),
        }}
        disabled={fromPeConnectedUser}
        {...getFieldError("signatories.beneficiary.firstName")}
      />
      <Input
        hintText={formContents["signatories.beneficiary.lastName"].hintText}
        label={formContents["signatories.beneficiary.lastName"].label}
        nativeInputProps={{
          ...formContents["signatories.beneficiary.lastName"],
          ...register("signatories.beneficiary.lastName"),
          ...(userFieldsAreFilled
            ? { value: values.signatories.beneficiary.lastName }
            : {}),
        }}
        disabled={fromPeConnectedUser}
        {...getFieldError("signatories.beneficiary.lastName")}
      />

      <Input
        hintText={formContents["signatories.beneficiary.birthdate"].hintText}
        label={formContents["signatories.beneficiary.birthdate"].label}
        nativeInputProps={{
          ...formContents["signatories.beneficiary.birthdate"],
          ...register("signatories.beneficiary.birthdate"),
          onBlur: (event) => {
            onBirthdateChange(event.currentTarget.value);
          },
          type: "date",
          max: "9999-12-31",
        }}
        {...getFieldError("signatories.beneficiary.birthdate")}
      />
      <EmailValidationInput
        hintText={formContents["signatories.beneficiary.email"].hintText}
        label={formContents["signatories.beneficiary.email"].label}
        disabled={
          fromPeConnectedUser &&
          emailSchema.safeParse(values.signatories.beneficiary.email).success
        }
        nativeInputProps={{
          ...formContents["signatories.beneficiary.email"],
          ...register("signatories.beneficiary.email", {
            setValueAs: (value) => toLowerCaseWithoutDiacritics(value),
          }),
          ...(userFieldsAreFilled ? { value: connectedUser.email } : {}),
          onBlur: (event) => {
            setValue(
              "signatories.beneficiary.email",
              toLowerCaseWithoutDiacritics(event.currentTarget.value),
            );
          },
        }}
        {...getFieldError("signatories.beneficiary.email")}
        onEmailValidationFeedback={({ state, stateRelatedMessage }) => {
          const { Bénéficiaire: _, ...rest } = emailValidationErrors;

          setEmailValidationErrors({
            ...rest,
            ...(state === "error"
              ? {
                  Bénéficiaire: stateRelatedMessage,
                }
              : {}),
          });
        }}
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
          <AddressAutocomplete
            {...formContents["signatories.beneficiary.address"]}
            initialSearchTerm={
              values.signatories.beneficiary.address &&
              addressDtoToString(values.signatories.beneficiary.address)
            }
            setFormValue={({ address }) => {
              setValue("signatories.beneficiary.address.city", address.city);
              setValue(
                "signatories.beneficiary.address.postcode",
                address.postcode,
              );
              setValue(
                "signatories.beneficiary.address.streetNumberAndAddress",
                address.streetNumberAndAddress,
              );
              setValue(
                "signatories.beneficiary.address.departmentCode",
                address.departmentCode,
              );
            }}
            id={
              domElementIds.conventionImmersionRoute.beneficiarySection.address
            }
            {...getFieldError("signatories.beneficiary.address")}
          />
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
          id={formContents.isMinor.id}
          options={booleanSelectOptions.map((option) => ({
            ...option,
            nativeInputProps: {
              ...option.nativeInputProps,
              checked:
                Boolean(option.nativeInputProps.value) === isMinorOrProtected,
              onChange: () => {
                const value = Boolean(option.nativeInputProps.value);
                dispatch(conventionSlice.actions.isMinorChanged(value));
                setValue(
                  "signatories.beneficiaryRepresentative",
                  value
                    ? {
                        firstName: "",
                        lastName: "",
                        phone: "",
                        email: "",
                        role: "beneficiary-representative",
                      }
                    : undefined,
                );
              },
            },
          }))}
        />
      )}

      {isMinorOrProtected && (
        <BeneficiaryRepresentativeFields
          setEmailValidationErrors={setEmailValidationErrors}
          emailValidationErrors={emailValidationErrors}
        />
      )}

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
            id={formContents.isCurrentEmployer.id}
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

          {hasCurrentEmployer && (
            <BeneficiaryCurrentEmployerFields
              emailValidationErrors={emailValidationErrors}
              setEmailValidationErrors={setEmailValidationErrors}
            />
          )}
        </>
      )}
    </>
  );
};

const hasBeneficiaryRepresentativeData = (
  beneficiaryRepresentative: BeneficiaryRepresentative | undefined,
): beneficiaryRepresentative is BeneficiaryRepresentative => {
  return !!(
    beneficiaryRepresentative &&
    (beneficiaryRepresentative.firstName ||
      beneficiaryRepresentative.lastName ||
      beneficiaryRepresentative.phone ||
      beneficiaryRepresentative.email)
  );
};
