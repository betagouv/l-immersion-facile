import { SubscriptionParams } from "shared";
import {
  ConventionUpdatedSubscriptionCallbackBody,
  SubscribersGateway,
} from "../../../domain/broadcast/ports/SubscribersGateway";

export type CallbackParams = {
  body: ConventionUpdatedSubscriptionCallbackBody;
  subscriptionParams: SubscriptionParams;
};

export class InMemorySubscribersGateway implements SubscribersGateway {
  #calls: CallbackParams[] = [];

  public get calls(): CallbackParams[] {
    return this.#calls;
  }

  public async notify(
    body: ConventionUpdatedSubscriptionCallbackBody,
    subscriptionParams: SubscriptionParams,
  ): Promise<void> {
    this.#calls.push({ body, subscriptionParams });
  }
}
