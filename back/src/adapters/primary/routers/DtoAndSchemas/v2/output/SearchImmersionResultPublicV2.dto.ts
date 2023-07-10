import {
  AddressDto,
  AppellationDto,
  GeoPositionDto,
  RomeCode,
  SearchImmersionResultDto,
  SiretDto,
} from "shared";
import { ContactMethod } from "../../../../../../domain/immersionOffer/entities/ContactEntity";

export type SearchContactDto = {
  id: string;
  lastName: string;
  firstName: string;
  email: string;
  job: string;
  phone: string;
};

export type SearchImmersionResultPublicV2 = {
  rome: RomeCode;
  romeLabel: string;
  appellations: AppellationDto[];
  naf: string;
  nafLabel: string;
  siret: SiretDto;
  name: string;
  voluntaryToImmersion: boolean;
  position: GeoPositionDto;
  address: AddressDto;
  contactMode?: ContactMethod;
  distance_m?: number;
  contactDetails?: SearchContactDto;
  numberOfEmployeeRange?: string;
  website?: string;
  additionalInformation?: string;
};

export const domainToSearchImmersionResultPublicV2 = ({
  appellations,
  ...domain
}: SearchImmersionResultDto): SearchImmersionResultPublicV2 => ({
  appellations,
  ...domain,
});
