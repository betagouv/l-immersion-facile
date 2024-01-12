import { Builder } from "../Builder";
import { AppellationAndRomeDto } from "../romeAndAppellationDtos/romeAndAppellation.dto";
import { SiretDto } from "../siret/siret";
import {
  BusinessContactDto,
  EstablishmentCSVRow,
  FormEstablishmentDto,
  FormEstablishmentSource,
} from "./FormEstablishment.dto";
import {
  defaultMaxContactsPerWeek,
  noContactPerWeek,
} from "./FormEstablishment.schema";

export const defaultValidFormEstablishment: FormEstablishmentDto = {
  source: "immersion-facile",
  businessAddress: "1 Rue du Moulin, 12345 Quelque Part",
  businessContact: {
    email: "amil@mail.com",
    firstName: "Esteban",
    lastName: "Ocon",
    phone: "+33012345678",
    job: "a job",
    contactMethod: "EMAIL",
    copyEmails: ["copy1@mail.com", "copy2@mail.com"],
  },
  naf: { code: "A", nomenclature: "nomenclature code A" },
  businessName: "Ma super entreprise",
  businessNameCustomized: "Ma belle enseigne du quartier",
  isEngagedEnterprise: false,
  siret: "01234567890123",
  website: "www@super.com/jobs",
  additionalInformation: "",
  appellations: [
    {
      romeCode: "A1111",
      appellationCode: "11111",
      romeLabel: "Boulangerie",
      appellationLabel: "Boulanger - Boulangère",
    },
    {
      romeCode: "B9112",
      appellationCode: "22222",
      romeLabel: "Patissier",
      appellationLabel: "Patissier - Patissière",
    },
    {
      romeCode: "D1103",
      appellationCode: "33333",
      romeLabel: "Boucherie",
      appellationLabel: "Boucher / Bouchère",
    },
  ],
  maxContactsPerWeek: defaultMaxContactsPerWeek,
};

const emptyFormEstablishment: FormEstablishmentDto = {
  source: "immersion-facile",
  businessAddress: "",
  naf: { code: "", nomenclature: "" },
  businessContact: {
    contactMethod: "EMAIL",
    lastName: "",
    firstName: "",
    phone: "",
    email: "",
    job: "",
    copyEmails: [],
  },
  businessName: "",
  siret: "",
  appellations: [],
  website: "",
  additionalInformation: "",
  maxContactsPerWeek: defaultMaxContactsPerWeek,
};

export class FormEstablishmentDtoBuilder
  implements Builder<FormEstablishmentDto>
{
  #dto: FormEstablishmentDto;

  constructor(dto: FormEstablishmentDto) {
    this.#dto = dto;
  }

  public static valid() {
    return new FormEstablishmentDtoBuilder(defaultValidFormEstablishment);
  }

  public static allEmptyFields() {
    return new FormEstablishmentDtoBuilder(emptyFormEstablishment);
  }

  public build() {
    return this.#dto;
  }

  public buildCsvRow(): EstablishmentCSVRow {
    return FormEstablishmentToEstablishmentCsvRow(this.#dto);
  }

  public withAppellations(appellations: AppellationAndRomeDto[]) {
    return new FormEstablishmentDtoBuilder({
      ...this.#dto,
      appellations,
    });
  }

  public withBusinessAddress(businessAddress: string) {
    return new FormEstablishmentDtoBuilder({ ...this.#dto, businessAddress });
  }

  public withBusinessContact(businessContact: BusinessContactDto) {
    return new FormEstablishmentDtoBuilder({ ...this.#dto, businessContact });
  }

  public withBusinessContactEmail(email: string) {
    return new FormEstablishmentDtoBuilder({
      ...this.#dto,
      businessContact: { ...this.#dto.businessContact, email },
    });
  }

  public withBusinessName(businessName: string) {
    return new FormEstablishmentDtoBuilder({ ...this.#dto, businessName });
  }

  public withFitForDisabledWorkers(fitForDisabledWorkers: boolean) {
    return new FormEstablishmentDtoBuilder({
      ...this.#dto,
      fitForDisabledWorkers,
    });
  }

  public withMaxContactsPerWeek(maxContactsPerWeek: number) {
    return new FormEstablishmentDtoBuilder({
      ...this.#dto,
      maxContactsPerWeek,
    });
  }

  public withNextAvailabilityDate(nextAvailabilityDate: Date | undefined) {
    return new FormEstablishmentDtoBuilder({
      ...this.#dto,
      nextAvailabilityDate: nextAvailabilityDate?.toISOString(),
    });
  }

  public withSiret(siret: SiretDto) {
    return new FormEstablishmentDtoBuilder({ ...this.#dto, siret });
  }

  public withSource(source: FormEstablishmentSource) {
    return new FormEstablishmentDtoBuilder({ ...this.#dto, source });
  }
}

const FormEstablishmentToEstablishmentCsvRow = (
  establishment: FormEstablishmentDto,
): EstablishmentCSVRow => ({
  businessAddress: establishment.businessAddress,
  businessContact_email: establishment.businessContact.email,
  businessContact_firstName: establishment.businessContact.firstName,
  businessContact_lastName: establishment.businessContact.lastName,
  businessContact_phone: establishment.businessContact.phone,
  businessContact_job: establishment.businessContact.job,
  businessContact_contactMethod: establishment.businessContact.contactMethod,
  businessContact_copyEmails:
    establishment.businessContact.copyEmails.join(","),
  naf_code: establishment.naf?.code ?? "",
  businessName: establishment.businessName,
  businessNameCustomized: establishment.businessNameCustomized ?? "",
  siret: establishment.siret,
  website: establishment.website ?? "",
  additionalInformation: establishment.additionalInformation ?? "",
  appellations_code: establishment.appellations
    .map((appellation) => appellation.appellationCode)
    .join(","),
  isEngagedEnterprise: establishment.isEngagedEnterprise ? "1" : "0",
  isSearchable: establishment.maxContactsPerWeek > noContactPerWeek ? "1" : "0",
  fitForDisabledWorkers: establishment.fitForDisabledWorkers ? "1" : "0",
});
