import {
  AbsoluteUrl,
  Builder,
  ContactMethod,
  EstablishmentSearchableBy,
  FormEstablishmentDto,
  FormEstablishmentSource,
  Location,
  NafDto,
  NumberEmployeesRange,
  RomeCode,
  WithAcquisition,
  defaultMaxContactsPerMonth,
  errors,
} from "shared";
import { avenueChampsElyseesDto } from "../../core/address/adapters/InMemoryAddressGateway";
import {
  EstablishmentAggregate,
  EstablishmentUserRight,
} from "../entities/EstablishmentAggregate";
import { EstablishmentEntity } from "../entities/EstablishmentEntity";
import { OfferEntity } from "../entities/OfferEntity";

export const TEST_APPELLATION_LABEL = "test_appellation_label";
export const TEST_APPELLATION_CODE = "12345";
export const TEST_LOCATION: Location = {
  id: "11111111-1111-4444-1111-111111111111",
  address: avenueChampsElyseesDto,
  position: { lat: 43.8666, lon: 8.3333 },
};

export const defaultNafCode = "7820Z";
export const defaultLocation: Location = {
  id: "aaaaaaaa-aaaa-4444-aaaa-aaaaaaaaaaaa",
  address: avenueChampsElyseesDto,
  position: {
    lat: 48.866667, // Paris lat/lon
    lon: 2.333333,
  },
};

const validEstablishmentEntityV2: EstablishmentEntity = {
  siret: "78000403200019",
  name: "Company inside repository",
  locations: [defaultLocation],
  customizedName: undefined,
  isCommited: undefined,
  createdAt: new Date("2024-08-08"),
  sourceProvider: "immersion-facile",
  voluntaryToImmersion: true,
  nafDto: { code: defaultNafCode, nomenclature: "NAFRev2" },
  numberEmployeesRange: "10-19",
  updatedAt: new Date("2024-08-10"),
  contactMethod: "EMAIL",
  isOpen: true,
  isMaxDiscussionsForPeriodReached: false,
  maxContactsPerMonth: defaultMaxContactsPerMonth,
  searchableBy: {
    jobSeekers: true,
    students: true,
  },
  additionalInformation: "",
  fitForDisabledWorkers: false,
  website: "",
  score: 10,
};

export class EstablishmentEntityBuilder
  implements Builder<EstablishmentEntity>
{
  constructor(
    private readonly entity: EstablishmentEntity = validEstablishmentEntityV2,
  ) {}

  public build() {
    return this.entity;
  }

  public withAdditionalInformation(additionalInformation: string) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      additionalInformation,
    });
  }

  public withCreatedAt(createdAt: Date) {
    return new EstablishmentEntityBuilder({ ...this.entity, createdAt });
  }

  public withContactMethod(contactMethod: ContactMethod) {
    return new EstablishmentEntityBuilder({ ...this.entity, contactMethod });
  }

  public withCustomizedName(customizedName?: string) {
    return new EstablishmentEntityBuilder({ ...this.entity, customizedName });
  }

  public withFitForDisabledWorkers(fitForDisabledWorkers: boolean) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      fitForDisabledWorkers,
    });
  }

  public withIsCommited(isCommited?: boolean) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      isCommited,
    });
  }

  public withIsOpen(isOpen: boolean) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      isOpen,
    });
  }

  public withIsMaxDiscussionsForPeriodReached(
    isMaxDiscussionsForPeriodReached: boolean,
  ) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      isMaxDiscussionsForPeriodReached,
    });
  }

  public withLastInseeCheck(lastInseeCheck: Date | undefined) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      lastInseeCheckDate: lastInseeCheck,
    });
  }

  public withLocationId(locationId: string) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      locations: [{ ...defaultLocation, id: locationId }],
    });
  }

  public withLocations(locations: Location[]) {
    return new EstablishmentEntityBuilder({ ...this.entity, locations });
  }

  public withMaxContactsPerMonth(maxContactsPerMonth: number) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      maxContactsPerMonth,
    });
  }

  public withNafDto(nafDto: NafDto) {
    return new EstablishmentEntityBuilder({ ...this.entity, nafDto });
  }

  public withName(name: string) {
    return new EstablishmentEntityBuilder({ ...this.entity, name });
  }

  public withNextAvailabilityDate(nextAvailabilityDate: Date | undefined) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      nextAvailabilityDate: nextAvailabilityDate?.toISOString(),
    });
  }

  public withNumberOfEmployeeRange(numberEmployeesRange: NumberEmployeesRange) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      numberEmployeesRange,
    });
  }

  public withSearchableBy(searchableBy: EstablishmentSearchableBy) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      searchableBy,
    });
  }

  public withSiret(siret: string) {
    return new EstablishmentEntityBuilder({ ...this.entity, siret });
  }

  public withSourceProvider(sourceProvider: FormEstablishmentSource) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      sourceProvider,
    });
  }

  public withUpdatedAt(updatedAt: Date) {
    return new EstablishmentEntityBuilder({ ...this.entity, updatedAt });
  }

  public withWebsite(website?: AbsoluteUrl | "") {
    return new EstablishmentEntityBuilder({ ...this.entity, website });
  }

  withAcquisition(withAcquisition: WithAcquisition) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      ...withAcquisition,
    });
  }

  public withScore(score: number) {
    return new EstablishmentEntityBuilder({
      ...this.entity,
      score,
    });
  }
}

export class EstablishmentAggregateBuilder
  implements Builder<EstablishmentAggregate>
{
  constructor(
    private readonly aggregate: EstablishmentAggregate = {
      establishment: new EstablishmentEntityBuilder().build(),
      offers: [new OfferEntityBuilder().build()],
      userRights: [],
    },
  ) {}

  fromFormEstablishment(
    {
      appellations,
      businessAddresses,
      businessContact,
      businessName,
      fitForDisabledWorkers,
      maxContactsPerMonth,
      searchableBy,
      siret,
      businessNameCustomized,
      isEngagedEnterprise,
      website,
      nextAvailabilityDate,
      additionalInformation,
      acquisitionCampaign,
      acquisitionKeyword,
      source,
      naf,
    }: FormEstablishmentDto,
    creationDate: Date,
  ) {
    const builder = new EstablishmentAggregateBuilder()
      .withEstablishmentSiret(siret)
      .withEstablishmentName(businessName)
      .withSearchableBy(searchableBy)
      .withContactMethod(businessContact.contactMethod)
      .withFitForDisabledWorkers(fitForDisabledWorkers)
      .withMaxContactsPerMonth(maxContactsPerMonth)
      .withLocations(
        businessAddresses.map((address) => ({
          address: {
            city: "",
            departmentCode: "",
            postcode: "",
            streetNumberAndAddress: "",
          },
          id: address.id,
          position: { lat: 0, lon: 0 },
        })),
      )
      .withOffers(
        appellations.map((appellation) => ({
          ...appellation,
          createdAt: creationDate,
        })),
      )
      .withEstablishmentCustomizedName(businessNameCustomized)
      .withEstablishmentWebsite(website);

    if (naf) builder.withEstablishmentNaf(naf);

    return builder;
  }

  withEstablishmentWebsite(website?: AbsoluteUrl | "") {
    return new EstablishmentAggregateBuilder().withEstablishment(
      new EstablishmentEntityBuilder(this.aggregate.establishment)
        .withWebsite(website ?? "")
        .build(),
    );
  }

  public build() {
    if (!this.aggregate.userRights.length)
      throw errors.establishment.noUserRights({
        siret: this.aggregate.establishment.siret,
      });
    return this.aggregate;
  }

  public withUserRights(userRights: EstablishmentUserRight[]) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      userRights,
    });
  }

  public withScore(score: number) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withScore(score)
        .build(),
    });
  }

  public withContactMethod(contactMethod: ContactMethod) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withContactMethod(contactMethod)
        .build(),
    });
  }

  public withEstablishment(establishment: EstablishmentEntity) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment,
    });
  }

  public withEstablishmentLastInseeCheckDate(
    lastInseeCheckDate: Date | undefined,
  ) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withLastInseeCheck(lastInseeCheckDate)
        .build(),
    });
  }

  public withEstablishmentNaf(naf: NafDto) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withNafDto(naf)
        .build(),
    });
  }

  public withEstablishmentNextAvailabilityDate(date?: Date) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withNextAvailabilityDate(date)
        .build(),
    });
  }

  withEstablishmentOpen(isOpen: boolean) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withIsOpen(isOpen)
        .build(),
    });
  }

  public withEstablishmentSiret(siret: string) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withSiret(siret)
        .build(),
    });
  }

  public withEstablishmentCreatedAt(createdAt: Date) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withCreatedAt(createdAt)
        .build(),
    });
  }

  public withEstablishmentCustomizedName(name: string | undefined) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withCustomizedName(name)
        .build(),
    });
  }

  public withEstablishmentName(name: string) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withName(name)
        .build(),
    });
  }

  public withEstablishmentUpdatedAt(updatedAt: Date) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withUpdatedAt(updatedAt)
        .build(),
    });
  }

  public withFitForDisabledWorkers(fitForDisabledWorkers: boolean) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withFitForDisabledWorkers(fitForDisabledWorkers)
        .build(),
    });
  }

  public withIsMaxDiscussionsForPeriodReached(
    isMaxDiscussionsForPeriodReached: boolean,
  ) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withIsMaxDiscussionsForPeriodReached(isMaxDiscussionsForPeriodReached)
        .build(),
    });
  }

  public withLocationId(locationId: string) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withLocationId(locationId)
        .build(),
    });
  }

  public withLocations(locations: Location[]) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withLocations(locations)
        .build(),
    });
  }

  public withMaxContactsPerMonth(maxContactsPerMonth: number) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withMaxContactsPerMonth(maxContactsPerMonth)
        .build(),
    });
  }

  public withOffers(offers: OfferEntity[]) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      offers,
    });
  }

  public withSearchableBy(searchableBy: EstablishmentSearchableBy) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withSearchableBy(searchableBy)
        .build(),
    });
  }

  withAcquisition(withAcquisition: WithAcquisition) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withAcquisition(withAcquisition)
        .build(),
    });
  }
}

const defaultValidOfferEntity: OfferEntity = {
  romeCode: "B1805",
  appellationLabel: "Styliste",
  appellationCode: "19540",
  romeLabel: "Stylisme",
  createdAt: new Date("2022-05-15T12:00:00.000"),
};

export class OfferEntityBuilder implements Builder<OfferEntity> {
  constructor(
    private readonly entity: OfferEntity = {
      ...defaultValidOfferEntity,
    },
  ) {}

  public build() {
    return this.entity;
  }

  public withAppellationCode(appellationCode: string) {
    return new OfferEntityBuilder({
      ...this.entity,
      appellationCode,
    });
  }

  public withAppellationLabel(appellationLabel: string) {
    return new OfferEntityBuilder({
      ...this.entity,
      appellationLabel,
    });
  }

  public withCreatedAt(createdAt: Date) {
    return new OfferEntityBuilder({
      ...this.entity,
      createdAt,
    });
  }

  public withRomeCode(romeCode: RomeCode) {
    return new OfferEntityBuilder({
      ...this.entity,
      romeCode,
    });
  }

  public withRomeLabel(romeLabel: string) {
    return new OfferEntityBuilder({
      ...this.entity,
      romeLabel,
    });
  }
}

export const secretariatOffer = new OfferEntityBuilder()
  .withRomeCode("M1607")
  .withAppellationLabel("Secrétaire")
  .withAppellationCode("19364")
  .withRomeLabel("Secrétariat")
  .build();

export const boulangerOffer = new OfferEntityBuilder()
  .withRomeCode("D1102")
  .withAppellationLabel("Boulanger / Boulangère")
  .withAppellationCode("11573")
  .withRomeLabel("Boulangerie - viennoiserie")
  .build();

export const boulangerAssistantOffer = new OfferEntityBuilder()
  .withRomeCode("D1102")
  .withAppellationLabel("Boulanger / Boulangère assistant de l'enfer!!!")
  .withAppellationCode("00666")
  .withRomeLabel("Boulangerie - viennoiserie")
  .build();
