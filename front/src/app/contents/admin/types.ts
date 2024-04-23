import { ReactNode } from "react";
import {
  AgencyRefersToInConvention,
  Beneficiary,
  BeneficiaryCurrentEmployer,
  BeneficiaryRepresentative,
  ConventionReadDto,
  EstablishmentRepresentative,
  EstablishmentTutor,
} from "shared";

export type FieldsAndTitle = {
  listTitle: string;
  cols?: string[];
  rowFields: RowFields[];
  additionalClasses?: string;
};

export type ConventionField =
  | keyof ConventionReadDto
  | `agencyRefersTo.${keyof AgencyRefersToInConvention}`
  | `establishmentTutor.${keyof EstablishmentTutor}`
  | `signatories.beneficiary.${keyof Beneficiary<"immersion">}`
  | `signatories.beneficiary.${keyof Beneficiary<"mini-stage-cci">}`
  | `signatories.beneficiaryRepresentative.${keyof BeneficiaryRepresentative}`
  | `signatories.beneficiaryCurrentEmployer.${keyof BeneficiaryCurrentEmployer}`
  | `signatories.establishmentRepresentative.${keyof EstablishmentRepresentative}`;

export type RowFields = {
  title?: string;
  fields: ColField[];
};

export type ColField = {
  key: ConventionField | "additionnalInfos";
  colLabel: string;
  getValue?: (convention: ConventionReadDto) => string | ReactNode;
  copyButton?: (convention: ConventionReadDto) => string | ReactNode;
} | null;
