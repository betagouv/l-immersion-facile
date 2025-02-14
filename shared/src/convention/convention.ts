import { differenceInCalendarISOWeekYears } from "date-fns";
import { keys, mapObjIndexed, values } from "ramda";
import { Role, SignatoryRole, allSignatoryRoles } from "../role/role.dto";
import { DotNestedKeys } from "../utils";
import { DateString } from "../utils/date";
import {
  BeneficiaryRepresentative,
  ConventionDto,
  ConventionRenewed,
  ConventionStatus,
  ConventionValidatorInputName,
  Signatories,
  Signatory,
} from "./convention.dto";

export const concatValidatorNames = (
  validator: ConventionValidatorInputName,
): string => [validator.firstname, validator.lastname].join(" ").trim();

export const allSignatoriesSigned = (signatories: Signatories) =>
  values(signatories).every((signatory) => !signatory || !!signatory.signedAt);

const getNewStatus = (signatories: Signatories): ConventionStatus => {
  if (allSignatoriesSigned(signatories)) return "IN_REVIEW";
  return "PARTIALLY_SIGNED";
};

const updateSignatoriesOnSignature = (
  signatories: Signatories,
  role: SignatoryRole,
  signedAt: string,
): Signatories => {
  switch (role) {
    case "beneficiary":
      return {
        ...signatories,
        beneficiary: { ...signatories.beneficiary, signedAt },
      };
    case "beneficiary-representative":
      if (!signatories.beneficiaryRepresentative)
        throw new Error(
          "There is no beneficiary representative on signatories.",
        );
      return {
        ...signatories,
        beneficiaryRepresentative: {
          ...signatories.beneficiaryRepresentative,
          signedAt,
        },
      };
    case "establishment-representative":
      return {
        ...signatories,
        establishmentRepresentative: {
          ...signatories.establishmentRepresentative,
          signedAt,
        },
      };
    default: {
      const keyOfRole = keys(signatories).find(
        (signatoryKey) => signatories[signatoryKey]?.role === role,
      );
      if (!keyOfRole) return signatories; // ToDo : throw Forbidden Error
      return {
        ...signatories,
        beneficiary: signatories.beneficiary,
        establishmentRepresentative: signatories.establishmentRepresentative,
        [keyOfRole]: { ...signatories[keyOfRole], signedAt },
      };
    }
  }
};

export const signConventionDtoWithRole = (
  convention: ConventionDto,
  role: SignatoryRole,
  signedAt: string,
): ConventionDto => {
  const updatedSignatories = updateSignatoriesOnSignature(
    convention.signatories,
    role,
    signedAt,
  );

  return {
    ...convention,
    signatories: updatedSignatories,
    status: getNewStatus(updatedSignatories),
  };
};

export const isSignatory = (role: Role): role is SignatoryRole =>
  allSignatoryRoles.includes(role as SignatoryRole);

export type ConventionField = DotNestedKeys<ConventionDto>;

export const getConventionFieldName = (name: ConventionField) => name;

export const isEstablishmentTutorIsEstablishmentRepresentative = (
  convention: Pick<ConventionDto, "signatories" | "establishmentTutor">,
): boolean => {
  const establishmentTutor = convention.establishmentTutor;
  const establishmentRepresentative =
    convention.signatories.establishmentRepresentative;

  return (
    establishmentTutor.firstName === establishmentRepresentative.firstName &&
    establishmentTutor.lastName === establishmentRepresentative.lastName &&
    establishmentTutor.email === establishmentRepresentative.email &&
    establishmentTutor.phone === establishmentRepresentative.phone
  );
};

export const isBeneficiaryMinorAccordingToAge = (
  conventionDateStart: DateString,
  beneficiaryBirthdate: string,
): boolean => {
  const age = differenceInCalendarISOWeekYears(
    new Date(conventionDateStart),
    new Date(beneficiaryBirthdate),
  );
  return age < 18;
};

export const isBeneficiaryMinor = ({
  beneficiaryRepresentative,
  beneficiaryBirthdate,
  conventionDateStart,
}: {
  beneficiaryBirthdate: string;
  beneficiaryRepresentative?: BeneficiaryRepresentative;
  conventionDateStart?: DateString;
}): boolean =>
  !!beneficiaryRepresentative ||
  (!!conventionDateStart &&
    isBeneficiaryMinorAccordingToAge(
      conventionDateStart,
      beneficiaryBirthdate,
    ));

export const hasBeneficiaryCurrentEmployer = (
  convention: Pick<ConventionDto, "signatories">,
): boolean => !!convention.signatories.beneficiaryCurrentEmployer;

export const clearSignaturesAndValidationDate = <C extends ConventionDto>(
  convention: C,
): C => ({
  ...convention,
  dateValidation: undefined,
  signatories: mapObjIndexed(
    (value) => ({
      ...value,
      signedAt: undefined,
    }),
    convention.signatories,
  ),
});

export const isConventionRenewed = (
  convention: ConventionDto,
): convention is ConventionRenewed => {
  const renewedKey: keyof ConventionDto = "renewed";
  return renewedKey in convention;
};

export const isConventionValidated = (convention: ConventionDto) =>
  convention.status === "ACCEPTED_BY_VALIDATOR";

export const hasAllowedRole = ({
  allowedRoles,
  candidateRoles,
}: { allowedRoles: Role[]; candidateRoles: Role[] }) =>
  candidateRoles.some((candidateRole) => allowedRoles.includes(candidateRole));

const processedDataBySignatoryRole: Record<
  SignatoryRole,
  {
    fieldName: ConventionField;
    signatoryFunction: string;
  }
> = {
  beneficiary: {
    fieldName: getConventionFieldName("signatories.beneficiary.signedAt"),
    signatoryFunction: "bénéficiaire",
  },
  "beneficiary-current-employer": {
    fieldName: getConventionFieldName(
      "signatories.beneficiaryCurrentEmployer.signedAt",
    ),
    signatoryFunction: "employeur actuel du bénéficiaire",
  },
  "establishment-representative": {
    fieldName: getConventionFieldName(
      "signatories.establishmentRepresentative.signedAt",
    ),
    signatoryFunction: "représentant de la structure d'accueil",
  },
  "beneficiary-representative": {
    fieldName: getConventionFieldName(
      "signatories.beneficiaryRepresentative.signedAt",
    ),
    signatoryFunction: "représentant légal du bénéficiaire",
  },
};

export const getSignatoryProcessedData = (
  signatory: Signatory,
): {
  fieldName: ConventionField;
  signatoryFullName: string;
  signatoryFunction: string;
} => ({
  ...processedDataBySignatoryRole[signatory.role],
  signatoryFullName: `${signatory.firstName} ${signatory.lastName}`,
});
