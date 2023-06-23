import { AddressDto } from "../address/address.dto";
import { ContactMethod } from "../formEstablishment/FormEstablishment.dto";
import { GeoPositionDto } from "../geoPosition/geoPosition.dto";
import {
  AppellationDto_To_Rename,
  RomeCode,
} from "../romeAndAppellationDtos/romeAndAppellation.dto";
import { SiretDto } from "../siret/siret";

export type SearchContactDto = {
  id: string;
  lastName: string;
  firstName: string;
  email: string;
  job: string;
  phone: string;
};

export type SearchImmersionResultDto = {
  rome: RomeCode;
  romeLabel: string;
  appellations: AppellationDto_To_Rename[];
  naf: string;
  nafLabel: string;
  siret: SiretDto;
  name: string;
  customizedName?: string;
  voluntaryToImmersion: boolean;
  fitForDisabledWorkers?: boolean;
  position: GeoPositionDto;
  address: AddressDto;
  contactMode?: ContactMethod;
  distance_m?: number;
  contactDetails?: SearchContactDto;
  numberOfEmployeeRange?: string;
  website?: string;
  additionalInformation?: string;
  urlOfPartner?: string;
};
