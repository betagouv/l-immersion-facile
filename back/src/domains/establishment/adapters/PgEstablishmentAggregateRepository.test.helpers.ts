import { Location } from "shared";
import { EstablishmentAggregate } from "../entities/EstablishmentAggregate";
import { OfferEntity } from "../entities/OfferEntity";
import { OfferEntityBuilder } from "../helpers/EstablishmentBuilders";
import { RepositorySearchResultDto } from "../ports/EstablishmentAggregateRepository";

export const makeExpectedSearchResult = ({
  establishment: establishmentAggregate,
  withOffers,
  withLocationAndDistance,
  nafLabel,
}: {
  establishment: EstablishmentAggregate;
  withOffers: OfferEntity[];
  withLocationAndDistance: Location & { distance?: number };
  nafLabel: string;
}): RepositorySearchResultDto => {
  const firstOffer = withOffers.at(0);
  if (!firstOffer)
    throw new Error(
      "At least one offer is required to make an expected SearchResult",
    );
  return {
    additionalInformation:
      establishmentAggregate.establishment.additionalInformation,
    address: withLocationAndDistance.address,
    appellations: withOffers.map(({ appellationCode, appellationLabel }) => ({
      appellationCode,
      appellationLabel,
    })),
    establishmentScore: establishmentAggregate.establishment.score,
    contactMode: establishmentAggregate.establishment.contactMethod,
    customizedName: establishmentAggregate.establishment.customizedName,
    distance_m: withLocationAndDistance.distance,
    fitForDisabledWorkers:
      establishmentAggregate.establishment.fitForDisabledWorkers,
    locationId: withLocationAndDistance.id,
    naf: establishmentAggregate.establishment.nafDto.code,
    nafLabel,
    name: establishmentAggregate.establishment.name,
    numberOfEmployeeRange:
      establishmentAggregate.establishment.numberEmployeesRange,
    position: withLocationAndDistance.position,
    rome: firstOffer.romeCode,
    romeLabel: firstOffer.romeLabel,
    siret: establishmentAggregate.establishment.siret,
    voluntaryToImmersion:
      establishmentAggregate.establishment.voluntaryToImmersion,
    website: establishmentAggregate.establishment.website,
    isSearchable:
      !establishmentAggregate.establishment.isMaxDiscussionsForPeriodReached, // <<<<< Donnée renvoyée actuellement alors que pas spécifié dans le DTO?!
    updatedAt: establishmentAggregate.establishment.updatedAt?.toISOString(),
    createdAt: establishmentAggregate.establishment.createdAt.toISOString(),
  } as RepositorySearchResultDto; // d'où le as
};

export const sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults = (
  a: RepositorySearchResultDto,
  b: RepositorySearchResultDto,
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

export const cartographeImmersionOffer = new OfferEntityBuilder()
  .withAppellationCode("11704")
  .withAppellationLabel("Cartographe")
  .withRomeCode("M1808")
  .withRomeLabel("Information géographique")
  .build();

export const analysteEnGeomatiqueImmersionOffer = new OfferEntityBuilder()
  .withAppellationCode("10946")
  .withAppellationLabel("Analyste en géomatique")
  .withRomeCode("M1808")
  .withRomeLabel("Information géographique")
  .build();

export const cuvisteOffer = new OfferEntityBuilder()
  .withRomeCode("A1413")
  .withRomeLabel("Fermentation de boissons alcoolisées")
  .withAppellationCode("140927")
  .withAppellationLabel("Cuviste")
  .build();

export const groomChevauxOffer = new OfferEntityBuilder()
  .withRomeCode("A1501")
  .withRomeLabel("Aide aux soins animaux")
  .withAppellationCode("140928")
  .withAppellationLabel("Groom chevaux")
  .build();

export const artisteCirqueOffer = new OfferEntityBuilder()
  .withRomeCode("L1204")
  .withRomeLabel("Arts du cirque et arts visuels")
  .withAppellationCode("11155")
  .withAppellationLabel("Artiste de cirque")
  .build();

export const offer_A1101 = new OfferEntityBuilder()
  .withRomeCode("A1101")
  .withRomeLabel("Conduite d'engins agricoles et forestiers")
  .withAppellationCode("0")
  .withAppellationLabel("")
  .build();

export const offer_A1101_11987 = new OfferEntityBuilder(offer_A1101)
  .withAppellationCode("11987")
  .withAppellationLabel("Chauffeur / Chauffeuse de machines agricoles")
  .build();

export const offer_A1101_12862 = new OfferEntityBuilder(offer_A1101)
  .withAppellationCode("12862")
  .withAppellationLabel("")
  .build();

export const offer_A1101_17751 = new OfferEntityBuilder(offer_A1101)
  .withAppellationCode("17751")
  .withAppellationLabel("Pilote de machines d'abattage")
  .build();

export const offer_A1101_20404 = new OfferEntityBuilder(offer_A1101)
  .withAppellationCode("20404")
  .withAppellationLabel("Tractoriste agricole")
  .build();
