import { Builder, RomeCode, SearchImmersionResultDto } from "shared";
import { UuidV4Generator } from "../adapters/secondary/core/UuidGeneratorImplementations";
import { TEST_ROME_LABEL } from "../adapters/secondary/immersionOffer/InMemoryEstablishmentAggregateRepository";
import { ContactEntity } from "../domain/immersionOffer/entities/ContactEntity";
import {
  EstablishmentAggregate,
  EstablishmentEntity,
} from "../domain/immersionOffer/entities/EstablishmentEntity";
import { ImmersionOfferEntityV2 } from "../domain/immersionOffer/entities/ImmersionOfferEntity";
import { ContactEntityBuilder } from "./ContactEntityBuilder";
import { EstablishmentEntityBuilder } from "./EstablishmentEntityBuilder";
import { ImmersionOfferEntityV2Builder } from "./ImmersionOfferEntityV2Builder";

const validEstablishmentAggregate: EstablishmentAggregate = {
  establishment: new EstablishmentEntityBuilder().build(),
  immersionOffers: [new ImmersionOfferEntityV2Builder().build()],
  contact: new ContactEntityBuilder().build(),
};

export class EstablishmentAggregateBuilder
  implements Builder<EstablishmentAggregate>
{
  constructor(
    private readonly aggregate: EstablishmentAggregate = validEstablishmentAggregate,
  ) {}

  public withEstablishment(establishment: EstablishmentEntity) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment,
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

  public withImmersionOffers(immersionOffers: ImmersionOfferEntityV2[]) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      immersionOffers,
    });
  }

  public withContact(contact: ContactEntity | undefined) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      contact,
    });
  }
  public withoutContact() {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      contact: undefined,
    });
  }

  public withEstablishmentSiret(siret: string) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder().withSiret(siret).build(),
    });
  }
  public withContactId(id: string) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      contact: new ContactEntityBuilder().withId(id).build(),
    });
  }
  public withGeneratedContactId() {
    return this.withContactId(new UuidV4Generator().new());
  }

  public withMaxContactsPerWeek(maxContactsPerWeek: number) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withMaxContactsPerWeek(maxContactsPerWeek)
        .build(),
    });
  }

  public withIsSearchable(isSearchable: boolean) {
    return new EstablishmentAggregateBuilder({
      ...this.aggregate,
      establishment: new EstablishmentEntityBuilder(
        this.aggregate.establishment,
      )
        .withIsSearchable(isSearchable)
        .build(),
    });
  }

  build() {
    return this.aggregate;
  }
}

export const establishmentAggregateToSearchResultByRome = (
  establishmentAggregate: EstablishmentAggregate,
  romeCode: RomeCode,
  withContactDetails: boolean,
  distance_m?: number,
): SearchImmersionResultDto => ({
  rome: romeCode,
  naf: establishmentAggregate.establishment.nafDto.code,
  nafLabel: establishmentAggregate.establishment.nafDto.nomenclature,
  siret: establishmentAggregate.establishment.siret,
  name: establishmentAggregate.establishment.name,
  numberOfEmployeeRange:
    establishmentAggregate.establishment.numberEmployeesRange,
  voluntaryToImmersion:
    establishmentAggregate.establishment.voluntaryToImmersion,
  additionalInformation:
    establishmentAggregate.establishment.additionalInformation,
  position: establishmentAggregate.establishment.position,
  address: establishmentAggregate.establishment.address,
  contactMode: establishmentAggregate.contact?.contactMethod,
  distance_m,
  romeLabel: TEST_ROME_LABEL,
  website: establishmentAggregate.establishment.website,
  appellations: establishmentAggregate.immersionOffers
    .filter((immersionOffer) => immersionOffer.romeCode === romeCode)
    .map((immersionOffer) => ({
      appellationCode: immersionOffer.appellationCode,
      appellationLabel: immersionOffer.appellationLabel,
    })),
  ...(withContactDetails && establishmentAggregate.contact
    ? {
        contactDetails: {
          id: establishmentAggregate.contact.id,
          email: establishmentAggregate.contact.email,
          firstName: establishmentAggregate.contact.firstName,
          lastName: establishmentAggregate.contact.lastName,
          job: establishmentAggregate.contact.job,
          phone: establishmentAggregate.contact.phone,
        },
      }
    : undefined),
});
