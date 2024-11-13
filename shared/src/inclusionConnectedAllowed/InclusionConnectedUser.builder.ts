import { Builder } from "../Builder";
import { Email } from "../email/email.dto";
import {
  AgencyRight,
  InclusionConnectedUser,
  User,
  UserId,
  UserWithAdminRights,
  WithEstablismentsSiretAndName,
} from "./inclusionConnectedAllowed.dto";

const defaultUser: User = {
  id: "default-user-id",
  email: "default.user@mail.com",
  firstName: "Default",
  lastName: "User",
  externalId: null,
  createdAt: new Date("2024-04-28T12:00:00.000Z").toISOString(),
};

const defaultInclusionConnectedUser: InclusionConnectedUser = {
  id: "default-inclusion-connect-user-id",
  email: "default.user@mail.com",
  firstName: "Default",
  lastName: "User",
  externalId: "default-external-id",
  createdAt: new Date("2024-04-28T12:00:00.000Z").toISOString(),
  agencyRights: [],
  dashboards: { agencies: {}, establishments: {} },
  establishments: [],
  isBackofficeAdmin: false,
};

export class UserBuilder implements Builder<User> {
  #dto: User = defaultUser;

  constructor(dto = defaultUser) {
    this.#dto = dto;
  }

  withId(id: UserId) {
    return new UserBuilder({ ...this.#dto, id });
  }

  withExternalId(externalId: string | null) {
    return new UserBuilder({ ...this.#dto, externalId });
  }

  withFirstName(firstName: string) {
    return new UserBuilder({ ...this.#dto, firstName });
  }

  withLastName(lastName: string) {
    return new UserBuilder({ ...this.#dto, lastName });
  }

  withEmail(email: Email) {
    return new UserBuilder({ ...this.#dto, email });
  }

  withCreatedAt(date: Date) {
    return new UserBuilder({ ...this.#dto, createdAt: date.toISOString() });
  }

  build() {
    return this.#dto;
  }
}

export class InclusionConnectedUserBuilder
  implements Builder<InclusionConnectedUser>
{
  #dto: InclusionConnectedUser = defaultInclusionConnectedUser;

  constructor(dto = defaultInclusionConnectedUser) {
    this.#dto = dto;
  }

  build() {
    return this.#dto;
  }

  buildUser(): UserWithAdminRights {
    const { agencyRights: _, dashboards: ____, ...user } = this.#dto;
    return user;
  }

  buildAgencyRights(): AgencyRight[] {
    return this.#dto.agencyRights;
  }

  withCreatedAt(createdAt: Date): InclusionConnectedUserBuilder {
    return new InclusionConnectedUserBuilder({
      ...this.#dto,
      createdAt: createdAt.toISOString(),
    });
  }

  withIsAdmin(isBackofficeAdmin: boolean): InclusionConnectedUserBuilder {
    return new InclusionConnectedUserBuilder({
      ...this.#dto,
      isBackofficeAdmin,
    });
  }

  withExternalId(externalId: string): InclusionConnectedUserBuilder {
    return new InclusionConnectedUserBuilder({ ...this.#dto, externalId });
  }

  withId(id: UserId) {
    return new InclusionConnectedUserBuilder({ ...this.#dto, id });
  }

  withFirstName(firstName: string) {
    return new InclusionConnectedUserBuilder({ ...this.#dto, firstName });
  }

  withLastName(lastName: string) {
    return new InclusionConnectedUserBuilder({ ...this.#dto, lastName });
  }
  withEmail(email: Email) {
    return new InclusionConnectedUserBuilder({ ...this.#dto, email });
  }

  withAgencyRights(agencyRights: AgencyRight[]) {
    return new InclusionConnectedUserBuilder({ ...this.#dto, agencyRights });
  }

  withEstablishments(
    establishments: WithEstablismentsSiretAndName[] | undefined,
  ) {
    return new InclusionConnectedUserBuilder({ ...this.#dto, establishments });
  }
}
