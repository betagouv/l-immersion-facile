import { ImmersionObjective } from "../convention/convention.dto";
import { ContactMethod } from "../formEstablishment/FormEstablishment.dto";
import { RomeCode } from "../romeAndAppellationDtos/romeAndAppellation.dto";
import { SiretDto } from "../siret/siret";

export type ContactInformations<T extends ContactMethod> = {
  romeCode: RomeCode;
  siret: SiretDto;
  potentialBeneficiaryFirstName: string;
  potentialBeneficiaryLastName: string;
  potentialBeneficiaryEmail: string;
  contactMode: T;
};

export type ContactEstablishmentByMailDto = ContactInformations<"EMAIL"> & {
  message: string;
  potentialBeneficiaryPhone: string;
  immersionObjective: ImmersionObjective | null;
  potentialBeneficiaryResumeLink?: string;
};

export type ContactEstablishmentInPersonDto = ContactInformations<"IN_PERSON">;

export type ContactEstablishmentByPhoneDto = ContactInformations<"PHONE">;

export type ContactEstablishmentRequestDto =
  | ContactEstablishmentByPhoneDto
  | ContactEstablishmentInPersonDto
  | ContactEstablishmentByMailDto;
