import { Builder } from "../Builder";
import { WithAcquisition } from "../acquisition.dto";
import { Email } from "../email/email.dto";
import { AppellationAndRomeDto } from "../romeAndAppellationDtos/romeAndAppellation.dto";
import { SiretDto } from "../siret/siret";
import {
  BusinessContactDto,
  EstablishmentCSVRow,
  EstablishmentSearchableBy,
  FormEstablishmentAddress,
  FormEstablishmentDto,
  FormEstablishmentSource,
} from "./FormEstablishment.dto";
import {
  defaultMaxContactsPerMonth,
  noContactPerMonth,
} from "./FormEstablishment.schema";

export const defaultFormEstablishmentAddress = {
  id: "364efc5a-db4f-452c-8d20-95c6a23f21fe",
  rawAddress: "1 Rue du Moulin, 12345 Quelque Part",
};

const defaultBusinessContactDto: BusinessContactDto = {
  email: "amil@mail.com",
  firstName: "Esteban",
  lastName: "Ocon",
  phone: "+33612345678",
  job: "a job",
  contactMethod: "EMAIL",
  copyEmails: ["copy1@mail.com", "copy2@mail.com"],
};

export const defaultValidFormEstablishment: FormEstablishmentDto = {
  source: "immersion-facile",
  businessAddresses: [defaultFormEstablishmentAddress],
  businessContact: defaultBusinessContactDto,
  naf: { code: "7201A", nomenclature: "nomenclature code 7201A" },
  businessName: "Ma super entreprise",
  businessNameCustomized: "Ma belle enseigne du quartier",
  isEngagedEnterprise: false,
  fitForDisabledWorkers: false,
  siret: "01234567890123",
  website: "https://www@super.com/jobs",
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
  maxContactsPerMonth: defaultMaxContactsPerMonth,
  searchableBy: {
    jobSeekers: true,
    students: true,
  },
  acquisitionKeyword: undefined,
  acquisitionCampaign: undefined,
};

export const fullyUpdatedFormEstablishment: FormEstablishmentDto = {
  source: "immersion-facile",
  businessAddresses: [
    {
      id: "fbd6096d-b514-4d54-a16e-46c89f75d83c",
      rawAddress: "1 rue de la paix, 75001 Paris",
    },
    {
      id: "fbd6096d-b514-4d54-a16e-46c89f75d83d",
      rawAddress: "2 rue de la paix, 93000 Bobigny",
    },
  ],
  businessContact: {
    email: "my-updated-email@test.com",
    contactMethod: "PHONE",
    firstName: "Jean-Luc",
    lastName: "Deloin",
    copyEmails: ["updated-copy-email@test.com"],
    job: "new job",
    phone: "+33612345679",
  },
  naf: { code: "8054B", nomenclature: "nomenclature code B" },
  businessName: "Edited Business Name",
  siret: "01234567890123",
  website: "https://updated.website.com",
  additionalInformation: "This is an updated information",
  appellations: [
    {
      romeCode: "A1234",
      appellationCode: "11234",
      romeLabel: "Label rome 1",
      appellationLabel: "Appellation 1",
    },
    {
      romeCode: "B1234",
      appellationCode: "21234",
      romeLabel: "Label rome 2",
      appellationLabel: "Appellation 2",
    },
  ],
  maxContactsPerMonth: defaultMaxContactsPerMonth - 5,
  searchableBy: {
    jobSeekers: false,
    students: true,
  },
  businessNameCustomized: "Updated Business Name",
  fitForDisabledWorkers: false,
  isEngagedEnterprise: false,
  nextAvailabilityDate: new Date("2025-02-01").toISOString(),
};

const emptyFormEstablishment: FormEstablishmentDto = {
  source: "immersion-facile",
  businessAddresses: [
    {
      id: "",
      rawAddress: "",
    },
  ],
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
  fitForDisabledWorkers: false,
  maxContactsPerMonth: defaultMaxContactsPerMonth,
  searchableBy: {
    jobSeekers: true,
    students: false,
  },
  acquisitionKeyword: undefined,
  acquisitionCampaign: undefined,
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

  public static fullyUpdated() {
    return new FormEstablishmentDtoBuilder(fullyUpdatedFormEstablishment);
  }

  public build() {
    return this.#dto;
  }

  public buildCsvRow(): EstablishmentCSVRow {
    return formEstablishmentToEstablishmentCsvRow(this.#dto);
  }

  public withAppellations(appellations: AppellationAndRomeDto[]) {
    return new FormEstablishmentDtoBuilder({
      ...this.#dto,
      appellations,
    });
  }

  public withBusinessAddresses(businessAddresses: FormEstablishmentAddress[]) {
    return new FormEstablishmentDtoBuilder({ ...this.#dto, businessAddresses });
  }

  public withBusinessContact(businessContact: BusinessContactDto) {
    return new FormEstablishmentDtoBuilder({ ...this.#dto, businessContact });
  }

  public withBusinessContactEmail(email: Email) {
    return new FormEstablishmentDtoBuilder({
      ...this.#dto,
      businessContact: { ...this.#dto.businessContact, email },
    });
  }

  public withBusinessContactCopyEmails(copyEmails: Email[]) {
    return new FormEstablishmentDtoBuilder({
      ...this.#dto,
      businessContact: { ...this.#dto.businessContact, copyEmails },
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

  public withMaxContactsPerMonth(maxContactsPerMonth: number) {
    return new FormEstablishmentDtoBuilder({
      ...this.#dto,
      maxContactsPerMonth: maxContactsPerMonth,
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

  public withAcquisition(params: WithAcquisition) {
    return new FormEstablishmentDtoBuilder({ ...this.#dto, ...params });
  }

  public withSearchableBy({ jobSeekers, students }: EstablishmentSearchableBy) {
    return new FormEstablishmentDtoBuilder({
      ...this.#dto,
      searchableBy: { jobSeekers, students },
    });
  }
}

const formEstablishmentToEstablishmentCsvRow = (
  establishment: FormEstablishmentDto,
): EstablishmentCSVRow => ({
  businessAddress: establishment.businessAddresses[0].rawAddress,
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
  isSearchable:
    establishment.maxContactsPerMonth > noContactPerMonth ? "1" : "0",
  fitForDisabledWorkers: establishment.fitForDisabledWorkers ? "1" : "0",
  searchableByStudents: establishment.searchableBy.students ? "1" : "0",
  searchableByJobSeekers: establishment.searchableBy.jobSeekers ? "1" : "0",
});

export class BusinessContactDtoBuilder implements Builder<BusinessContactDto> {
  #dto: BusinessContactDto;

  constructor(dto: BusinessContactDto = defaultBusinessContactDto) {
    this.#dto = dto;
  }

  public withFirstName(firstName: string) {
    return new BusinessContactDtoBuilder({ ...this.#dto, firstName });
  }

  public withLastName(lastName: string) {
    return new BusinessContactDtoBuilder({ ...this.#dto, lastName });
  }

  public withEmail(email: Email) {
    return new BusinessContactDtoBuilder({ ...this.#dto, email });
  }

  public withCopyEmails(copyEmails: Email[]) {
    return new BusinessContactDtoBuilder({ ...this.#dto, copyEmails });
  }

  public build() {
    return this.#dto;
  }
}
