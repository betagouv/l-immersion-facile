import {
  addressStringToDto,
  defaultMaxContactsPerWeek,
  NafDto,
  NumberEmployeesRange,
  SearchImmersionResultDto,
  SiretDto,
} from "shared";
import { createLogger } from "../../../utils/logger";
import { TimeGateway } from "../../core/ports/TimeGateway";
import {
  EstablishmentAggregate,
  EstablishmentEntity,
} from "../entities/EstablishmentEntity";

const logger = createLogger(__filename);

export type LaBonneBoiteCompanyProps = {
  address: string;
  city: string;
  lat: number;
  lon: number;
  matched_rome_code: string;
  matched_rome_label: string;
  naf: string;
  naf_text: string;
  name: string;
  siret: SiretDto;
  stars: number;
  raison_sociale: string;
  url: string; // URL to the company reference page on LaBonneBoite
  social_network: string; // Lien vers réseaux sociaux
  website: string; // URL vers la page de l'entreprise
  headcount_text: string; // Libelle of nb of employees
  distance: number; // Distance to searched geographical position
  alternance: boolean; // Whether or not the company accepts alternance contracts
  boosted: boolean;
  contact_mode: string; // | "Envoyez votre candidature par mail" | "Se présenter spontanément" | "Postulez via le site internet de l'entreprise" |  "Envoyer un CV et une lettre de motivation"
};

// Careful, value objects should be immutable
export class LaBonneBoiteCompanyVO {
  constructor(public readonly props: LaBonneBoiteCompanyProps) {}

  public get siret() {
    return this.props.siret;
  }

  public toSearchResult(): SearchImmersionResultDto {
    return {
      siret: this.props.siret,
      name: this.props.name,
      address: addressStringToDto(this.props.address),
      additionalInformation: "",
      appellationLabels: [],
      customizedName: "",
      distance_m: this.props.distance * 1000,
      fitForDisabledWorkers: false,
      naf: this.props.naf,
      nafLabel: this.props.naf_text,
      numberOfEmployeeRange: this.props.headcount_text
        .replace("salariés", "")
        .replace("salarié", "")
        .trim(),
      position: {
        lat: this.props.lat,
        lon: this.props.lon,
      },
      rome: this.props.matched_rome_code,
      romeLabel: this.props.matched_rome_label,
      urlOfPartner: this.props.url,
      voluntaryToImmersion: false,
      website: "",
    };
  }

  // to be deleted in next commit :
  public toEstablishmentAggregate(
    timeGateway: TimeGateway,
    extraData?: {
      nafDto?: NafDto;
      numberEmployeesRange?: NumberEmployeesRange;
    },
  ): EstablishmentAggregate {
    const establishment: EstablishmentEntity = {
      address: addressStringToDto(this.props.address),
      position: {
        lat: this.props.lat,
        lon: this.props.lon,
      },
      nafDto: extraData?.nafDto ?? { code: this.props.naf, nomenclature: "" }, // Unknown nomenclature (would required to call sirene API)
      sourceProvider: "api_labonneboite",
      name: this.props.name,
      siret: this.props.siret,
      voluntaryToImmersion: false,
      numberEmployeesRange: extraData?.numberEmployeesRange ?? "",
      isActive: true,
      updatedAt: undefined,
      isSearchable: true,
      additionalInformation: "",
      website: this.props.website ?? this.props.url,
      maxContactsPerWeek: defaultMaxContactsPerWeek,
    };

    return {
      establishment,
      immersionOffers: [
        {
          romeCode: this.props.matched_rome_code,
          score: this.props.stars,
          createdAt: timeGateway.now(),
        },
      ],
    };
  }

  public isCompanyRelevant(): boolean {
    const companyNaf = this.props.naf;
    const rome = this.props.matched_rome_code;
    // those conditions are business specific, see with Nathalie for any questions
    const isNafInterim = companyNaf === "7820Z";

    const isNafAutreServiceWithRomeElevageOrToilettage =
      companyNaf.startsWith("9609") && ["A1503", "A1408"].includes(rome);

    const isNafRestaurationRapideWithRomeBoulangerie =
      companyNaf == "5610C" && rome == "D1102";

    const isRomeIgnoredForPublicAdministration =
      companyNaf.startsWith("8411") &&
      [
        "D1202",
        "G1404",
        "G1501",
        "G1502",
        "G1503",
        "G1601",
        "G1602",
        "G1603",
        "G1605",
        "G1802",
        "G1803",
      ].includes(rome);

    const establishmentShouldBeIgnored =
      isNafInterim ||
      isNafAutreServiceWithRomeElevageOrToilettage ||
      isNafRestaurationRapideWithRomeBoulangerie ||
      isRomeIgnoredForPublicAdministration;

    if (establishmentShouldBeIgnored) {
      logger.info({ company: companyNaf }, "Not relevant, discarding.");
      return false;
    } else {
      logger.debug({ company: companyNaf }, "Relevant.");
      return true;
    }
  }
}
