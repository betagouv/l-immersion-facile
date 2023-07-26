import { SearchImmersionResultDto } from "shared";
import { EstablishmentGroupEntity } from "../../../domain/immersionOffer/entities/EstablishmentGroupEntity";
import { EstablishmentGroupRepository } from "../../../domain/immersionOffer/ports/EstablishmentGroupRepository";

export const stubSearchResult: SearchImmersionResultDto = {
  rome: "D1101",
  siret: "11112222111122",
  distance_m: 0,
  name: "Company inside repository",
  website: "www.jobs.fr",
  additionalInformation: "",
  voluntaryToImmersion: true,
  position: { lon: 50, lat: 35 },
  romeLabel: "Boucherie",
  appellations: [
    { appellationLabel: "Boucher / Bouchère", appellationCode: "11564" },
  ],
  naf: "7820Z",
  nafLabel: "Activités des agences de travail temporaire",
  address: {
    streetNumberAndAddress: "30 avenue des champs Elysées",
    postcode: "75017",
    city: "Paris",
    departmentCode: "75",
  },
  contactMode: "EMAIL",
  numberOfEmployeeRange: "10-19",
};

/* eslint-disable @typescript-eslint/require-await */
export class InMemoryEstablishmentGroupRepository
  implements EstablishmentGroupRepository
{
  // for test purpose
  private groupsByName: Record<string, EstablishmentGroupEntity> = {};

  public async findSearchImmersionResultsBySlug(): Promise<
    SearchImmersionResultDto[]
  > {
    return [stubSearchResult];
  }

  public async save(group: EstablishmentGroupEntity) {
    this.groupsByName[group.name] = group;
  }

  public get groups(): EstablishmentGroupEntity[] {
    return Object.values(this.groupsByName);
  }

  public set groups(groups: EstablishmentGroupEntity[]) {
    this.groupsByName = groups.reduce(
      (acc, group) => ({ ...acc, [group.name]: group }),
      {} satisfies Record<string, EstablishmentGroupEntity>,
    );
  }
}

/* eslint-enable @typescript-eslint/require-await */
