import { AddressDto, LocationId } from "../address/address.dto";
import { ContactMethod } from "../formEstablishment/FormEstablishment.dto";
import { GeoPositionDto } from "../geoPosition/geoPosition.dto";
import {
  AppellationDto,
  RomeCode,
} from "../romeAndAppellationDtos/romeAndAppellation.dto";
import { SiretDto } from "../siret/siret";
import { DateTimeIsoString } from "../utils/date";

export type SearchResultDto = {
  rome: RomeCode;
  romeLabel: string;
  appellations: AppellationDto[];
  establishmentScore: number;
  naf: string;
  nafLabel: string;
  siret: SiretDto;
  name: string;
  customizedName?: string;
  voluntaryToImmersion: boolean;
  fitForDisabledWorkers?: boolean;
  locationId: LocationId | null;
  position: GeoPositionDto;
  address: AddressDto;
  contactMode?: ContactMethod;
  distance_m?: number;
  numberOfEmployeeRange?: string;
  website?: string;
  additionalInformation?: string;
  urlOfPartner?: string;
  updatedAt?: DateTimeIsoString;
  createdAt?: DateTimeIsoString;
};
