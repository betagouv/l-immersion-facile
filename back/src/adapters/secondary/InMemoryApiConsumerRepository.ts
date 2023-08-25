import { addYears, subYears } from "date-fns";
import { values } from "ramda";
import { ApiConsumer, ApiConsumerId } from "shared";
import { ApiConsumerRepository } from "../../domain/auth/ports/ApiConsumerRepository";
import { UuidV4Generator } from "./core/UuidGeneratorImplementations";

const uuidGenerator = new UuidV4Generator();

export const authorizedUnJeuneUneSolutionApiConsumer: ApiConsumer = {
  id: uuidGenerator.new(),
  consumer: "unJeuneUneSolution",
  contact: {
    firstName: "john",
    lastName: "doe",
    emails: ["mail@mail.com"],
    job: "tech",
    phone: "0611223344",
  },
  createdAt: new Date(),
  expirationDate: addYears(new Date(), 1),
  isAuthorized: true,
  description: "a",
};

export const unauthorisedApiConsumer: ApiConsumer = {
  id: uuidGenerator.new(),
  consumer: "unauthorised consumer",
  contact: {
    firstName: "john",
    lastName: "doe",
    emails: ["mail@mail.com"],
    job: "tech",
    phone: "0611223344",
  },
  createdAt: new Date(),
  expirationDate: addYears(new Date(), 1),
  isAuthorized: false,
  description: "",
};

export const outdatedApiConsumer: ApiConsumer = {
  id: uuidGenerator.new(),
  consumer: "outdated consumer",
  contact: {
    firstName: "john",
    lastName: "doe",
    emails: ["mail@mail.com"],
    job: "tech",
    phone: "0611223344",
  },
  createdAt: subYears(new Date(), 2),
  expirationDate: subYears(new Date(), 1),
  isAuthorized: true,
  description: "",
};

export class InMemoryApiConsumerRepository implements ApiConsumerRepository {
  #consumers: Record<ApiConsumerId, ApiConsumer> = {};

  public get consumers(): ApiConsumer[] {
    return values(this.#consumers);
  }

  public set consumers(consumers: ApiConsumer[]) {
    this.#consumers = consumers.reduce<Record<ApiConsumerId, ApiConsumer>>(
      (agg, consumer) => ({ ...agg, [consumer.id]: consumer }),
      {},
    );
  }

  public async getById(id: ApiConsumerId): Promise<ApiConsumer | undefined> {
    return this.#consumers[id];
  }

  public async save(apiConsumer: ApiConsumer): Promise<void> {
    this.#consumers[apiConsumer.id] = apiConsumer;
  }
}
