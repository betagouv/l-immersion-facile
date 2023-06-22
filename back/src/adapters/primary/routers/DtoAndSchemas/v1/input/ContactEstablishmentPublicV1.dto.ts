import {
  ContactEstablishmentRequestDto,
  ContactMethod,
  RomeCode,
  SiretDto,
} from "shared";

type ContactInformationPublicV1<T extends ContactMethod> = {
  offer: { romeLabel: string; romeCode: RomeCode };
  siret: SiretDto;
  potentialBeneficiaryFirstName: string;
  potentialBeneficiaryLastName: string;
  potentialBeneficiaryEmail: string;
  contactMode: T;
};

export type ContactEstablishmentByMailPublicV1Dto =
  ContactInformationPublicV1<"EMAIL"> & {
    message: string;
  };

export type ContactEstablishmentInPersonPublicV1Dto =
  ContactInformationPublicV1<"IN_PERSON">;

export type ContactEstablishmentByPhonePublicV1Dto =
  ContactInformationPublicV1<"PHONE">;

export type ContactEstablishmentPublicV1Dto =
  | ContactEstablishmentByPhonePublicV1Dto
  | ContactEstablishmentInPersonPublicV1Dto
  | ContactEstablishmentByMailPublicV1Dto;

export const contactEstablishmentPublicV1ToDomain = (
  contactRequest: ContactEstablishmentPublicV1Dto,
): ContactEstablishmentRequestDto => {
  // const {
  //   contactMode,
  //   potentialBeneficiaryEmail,
  //   offer,
  //   potentialBeneficiaryFirstName,
  //   potentialBeneficiaryLastName,
  //   siret,
  // } = contactRequest;
  if (contactRequest.contactMode === "EMAIL")
    return {
      ...contactRequest,
      romeCode: contactRequest.offer.romeCode,
      potentialBeneficiaryPhone: "Numéro de téléphone non communiqué",
      immersionObjective: null,
    };

  return {
    ...contactRequest,
    romeCode: contactRequest.offer.romeCode,
  };
};
