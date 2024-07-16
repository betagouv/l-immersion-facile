import {
  AddressDto,
  FormEstablishmentSource,
  GeoPositionDto,
  Location,
  NumberEmployeesRange,
  SearchResultDto,
} from "shared";
import { ContactEntity } from "../entities/ContactEntity";
import { EstablishmentAggregate } from "../entities/EstablishmentEntity";
import { OfferEntity } from "../entities/OfferEntity";
import {
  ContactEntityBuilder,
  EstablishmentAggregateBuilder,
  EstablishmentEntityBuilder,
  OfferEntityBuilder,
  defaultLocation,
} from "../helpers/EstablishmentBuilders";
import { EstablishmentAggregateRepository } from "../ports/EstablishmentAggregateRepository";

export type PgEstablishmentRow = {
  siret: string;
  name: string | null;
  customized_name?: string | null;
  number_employees: string | null;
  naf_code: string;
  naf_nomenclature: string;
  update_date?: Date;
  is_open: boolean;
  is_commited?: boolean | null;
  fit_for_disabled_workers: boolean | null;
  max_contacts_per_week: number;
  last_insee_check_date?: Date;
};

export type InsertEstablishmentAggregateProps = {
  siret: string;
  romeAndAppellationCodes?: { romeCode: string; appellationCode: string }[];
  establishmentPosition?: GeoPositionDto;
  contact?: ContactEntity;
  sourceProvider?: FormEstablishmentSource;
  createdAt?: Date;
  locationId?: string;
  isOpen?: boolean;
  isSearchable?: boolean;
  address?: AddressDto;
  nafCode?: string;
  numberEmployeesRange?: NumberEmployeesRange;
  offerCreatedAt?: Date;
  fitForDisabledWorkers?: boolean;
  searchableByStudents?: boolean;
  searchableByJobSeekers?: boolean;
  offerScore?: number;
};

export const insertEstablishmentAggregate = async (
  establishmentAggregateRepository: EstablishmentAggregateRepository,
  {
    searchableByStudents,
    searchableByJobSeekers,
    siret,
    establishmentPosition = defaultLocation.position,
    romeAndAppellationCodes = [
      {
        romeCode: "A1413",
        appellationCode: "140927", // "Cuviste"
      },
    ],
    contact,
    sourceProvider = "immersion-facile",
    isOpen = true,
    isSearchable = true,
    locationId,
    address,
    nafCode,
    numberEmployeesRange,
    createdAt = new Date(),
    offerCreatedAt,
    fitForDisabledWorkers,
    offerScore,
  }: InsertEstablishmentAggregateProps,
  index = 0,
) => {
  const establishment = new EstablishmentEntityBuilder()
    .withSiret(siret)
    .withIsOpen(isOpen)
    .withLocations([
      {
        id: locationId ?? `11111111-1111-4444-1111-11111111000${index}`,
        address: address ?? defaultLocation.address,
        position: establishmentPosition,
      },
    ])
    .withSearchableBy({
      jobSeekers: searchableByJobSeekers ?? false,
      students: searchableByStudents ?? false,
    })
    .withCreatedAt(createdAt)
    .withNumberOfEmployeeRange(numberEmployeesRange ?? "6-9")
    .withNafDto({ code: nafCode ?? "8622B", nomenclature: "8622B" })
    .withSourceProvider(sourceProvider)
    .withFitForDisabledWorkers(fitForDisabledWorkers)
    .withIsSearchable(isSearchable)
    .build();

  const aggregate = new EstablishmentAggregateBuilder()
    .withEstablishment(establishment)
    .withContact(
      contact ??
        new ContactEntityBuilder()
          .withId(`22222222-2222-4444-2222-22222222000${index}`)
          .build(),
    )
    .withOffers(
      romeAndAppellationCodes.map(({ romeCode, appellationCode }) =>
        new OfferEntityBuilder()
          .withRomeCode(romeCode)
          .withAppellationCode(appellationCode)
          .withCreatedAt(offerCreatedAt ?? new Date())
          .withScore(offerScore)
          .build(),
      ),
    )
    .build();

  await establishmentAggregateRepository.insertEstablishmentAggregate(
    aggregate,
  );
};

export const makeExpectedSearchResult = ({
  establishement,
  withOffers,
  withLocationAndDistance,
}: {
  establishement: EstablishmentAggregate;
  withOffers: OfferEntity[];
  withLocationAndDistance: Location & { distance: number };
}): SearchResultDto => {
  const firstOffer = withOffers.at(0);
  if (!firstOffer)
    throw new Error(
      "At least one offer is required to make an expected SearchResult",
    );
  return {
    additionalInformation: establishement.establishment.additionalInformation,
    address: withLocationAndDistance.address,
    appellations: withOffers.map(
      ({ appellationCode, appellationLabel, score }) => ({
        appellationCode,
        appellationLabel,
        score,
      }),
    ),
    contactMode: establishement.contact?.contactMethod,
    customizedName: establishement.establishment.customizedName,
    distance_m: withLocationAndDistance.distance,
    fitForDisabledWorkers: establishement.establishment.fitForDisabledWorkers,
    locationId: withLocationAndDistance.id,
    naf: establishement.establishment.nafDto.code,
    nafLabel: "Activités des agences de travail temporaire",
    name: establishement.establishment.name,
    numberOfEmployeeRange: establishement.establishment.numberEmployeesRange,
    position: withLocationAndDistance.position,
    rome: firstOffer.romeCode,
    romeLabel: firstOffer.romeLabel,
    siret: establishement.establishment.siret,
    voluntaryToImmersion: establishement.establishment.voluntaryToImmersion,
    website: establishement.establishment.website,
    isSearchable: true, // <<<<< Donnée renvoyée actuellement ?!
  } as SearchResultDto; // d'où le as
};

export const sortSearchResultsByDistanceAndRomeAndSiret = (
  a: SearchResultDto,
  b: SearchResultDto,
): number => {
  if (a.distance_m && b.distance_m) {
    if (a.distance_m > b.distance_m) return 1;
    if (a.distance_m < b.distance_m) return -1;
  }
  if (a.rome > b.rome) return 1;
  if (a.rome < b.rome) return -1;

  if (a.siret > b.siret) return 1;
  if (a.siret < b.siret) return -1;
  return 0;
};
