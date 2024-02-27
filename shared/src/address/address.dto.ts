import {
  GeoPositionDto,
  WithGeoPosition,
} from "../geoPosition/geoPosition.dto";
import { Flavor } from "../typeFlavors";

export type DepartmentName = Flavor<string, "DepartmentName">;
export type DepartmentCode = Flavor<string, "DepartmentCode">;

export type Postcode = Flavor<string, "Postcode">;

export type LookupAddress = Flavor<string, "LookupAddress">;
export type WithLookupAddressQueryParams = { lookup: LookupAddress };

export type LookupLocationInput = Flavor<string, "LookupLocation">;
export type WithLookupLocationInputQueryParams = { query: LookupLocationInput };

export type StreetNumberAndAddress = Flavor<string, "StreetNumberAndAddress">;
export type City = Flavor<string, "City">;

export type LookupSearchResult = WithGeoPosition & {
  label: string;
};

export type AddressDto = {
  streetNumberAndAddress: StreetNumberAndAddress;
  postcode: Postcode; // (ex: "75001")
  departmentCode: DepartmentCode; // numéro de département (ex: "75")
  city: City;
};

export type LocationId = Flavor<string, "AddressId">;

export type Location = {
  id: LocationId;
  position: GeoPositionDto;
  address: AddressDto;
};

export type AddressAndPosition = Omit<Location, "id">;

export const departmentNameToDepartmentCode: Record<
  DepartmentName,
  DepartmentCode
> = {
  Ain: "01",
  Aisne: "02",
  Allier: "03",
  "Alpes-de-Haute-Provence": "04",
  "Hautes-Alpes": "05",
  "Alpes-Maritimes": "06",
  Ardèche: "07",
  Ardennes: "08",
  Ariège: "09",
  Aube: "10",
  Aude: "11",
  Aveyron: "12",
  "Bouches-du-Rhône": "13",
  Calvados: "14",
  Cantal: "15",
  Charente: "16",
  "Charente-Maritime": "17",
  Cher: "18",
  Corrèze: "19",
  "Côte-d'Or": "21",
  "Côtes-d'Armor": "22",
  Creuse: "23",
  Dordogne: "24",
  Doubs: "25",
  Drôme: "26",
  Eure: "27",
  "Eure-et-Loir": "28",
  Finistère: "29",
  "Corse-du-Sud": "2A",
  "Haute-Corse": "2B",
  Gard: "30",
  "Haute-Garonne": "31",
  Gers: "32",
  Gironde: "33",
  Hérault: "34",
  "Ille-et-Vilaine": "35",
  Indre: "36",
  "Indre-et-Loire": "37",
  Isère: "38",
  Jura: "39",
  Landes: "40",
  "Loir-et-Cher": "41",
  Loire: "42",
  "Haute-Loire": "43",
  "Loire-Atlantique": "44",
  Loiret: "45",
  Lot: "46",
  "Lot-et-Garonne": "47",
  Lozère: "48",
  "Maine-et-Loire": "49",
  Manche: "50",
  Marne: "51",
  "Haute-Marne": "52",
  Mayenne: "53",
  "Meurthe-et-Moselle": "54",
  Meuse: "55",
  Morbihan: "56",
  Moselle: "57",
  Nièvre: "58",
  Nord: "59",
  Oise: "60",
  Orne: "61",
  "Pas-de-Calais": "62",
  "Puy-de-Dôme": "63",
  "Pyrénées-Atlantiques": "64",
  "Hautes-Pyrénées": "65",
  "Pyrénées-Orientales": "66",
  "Bas-Rhin": "67",
  "Haut-Rhin": "68",
  Rhône: "69",
  "Haute-Saône": "70",
  "Saône-et-Loire": "71",
  Sarthe: "72",
  Savoie: "73",
  "Haute-Savoie": "74",
  Paris: "75",
  "Seine-Maritime": "76",
  "Seine-et-Marne": "77",
  Yvelines: "78",
  "Deux-Sèvres": "79",
  Somme: "80",
  Tarn: "81",
  "Tarn-et-Garonne": "82",
  Var: "83",
  Vaucluse: "84",
  Vendée: "85",
  Vienne: "86",
  "Haute-Vienne": "87",
  Vosges: "88",
  Yonne: "89",
  "Territoire-de-Belfort": "90",
  Essonne: "91",
  "Hauts-de-Seine": "92",
  "Seine-Saint-Denis": "93",
  "Val-de-Marne": "94",
  "Val-d'Oise": "95",
  Guadeloupe: "971",
  Martinique: "972",
  Guyane: "973",
  "La Réunion": "974",
  Mayotte: "976",
  "Saint-Martin": "971",
  "Saint-Pierre-et-Miquelon": "975",
};

export const getDepartmentCodeFromDepartmentNameOrCity: Record<
  DepartmentName,
  DepartmentCode
> = {
  ...departmentNameToDepartmentCode,
  "Île-de-France": "75",
  "Métropole de Lyon": "69",
  "Auvergne-Rhône-Alpes": "69",
};

// prettier-ignore
const nouvelleAquitaineDepartmentsCodes = [
  "16",
  "17",
  "19",
  "23",
  "24",
  "33",
  "40",
  "47",
  "64",
  "79",
  "86",
  "87",
];
// prettier-ignore
const occitanieDepartmentsCodes = [
  "09",
  "11",
  "12",
  "30",
  "31",
  "32",
  "34",
  "46",
  "48",
  "65",
  "66",
  "81",
  "82",
];
const paysDeLaLoireDepartmentsCodes = ["44", "49", "53", "72", "85"];
const bretagneDepartmentsCodes = ["22", "29", "35", "56"];

export const miniStageRestrictedDepartments: DepartmentCode[] = [
  ...bretagneDepartmentsCodes,
  ...nouvelleAquitaineDepartmentsCodes,
  ...paysDeLaLoireDepartmentsCodes,
  ...occitanieDepartmentsCodes,
];
