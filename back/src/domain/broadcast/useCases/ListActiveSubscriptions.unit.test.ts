import { expectPromiseToFailWithError, WebhookSubscription } from "shared";
import { ApiConsumerBuilder } from "../../../_testBuilders/ApiConsumerBuilder";
import {
  createInMemoryUow,
  InMemoryUnitOfWork,
} from "../../../adapters/primary/config/uowConfig";
import { ForbiddenError } from "../../../adapters/primary/helpers/httpErrors";
import { InMemoryUowPerformer } from "../../../adapters/secondary/InMemoryUowPerformer";
import { ListActiveSubscriptions } from "./ListActiveSubscriptions";

describe.skip("ListActiveSubscriptions", () => {
  let uow: InMemoryUnitOfWork;
  let listActiveSubscriptions: ListActiveSubscriptions;

  beforeEach(() => {
    uow = createInMemoryUow();
    const uowPerformer = new InMemoryUowPerformer(uow);
    listActiveSubscriptions = new ListActiveSubscriptions(uowPerformer);
  });

  it("throws a forbidden error when jwtPayload is not provided", async () => {
    await expectPromiseToFailWithError(
      listActiveSubscriptions.execute(),
      new ForbiddenError("No JWT payload provided"),
    );
  });

  it("returns empty list if no subscriptions", async () => {
    const apiConsumer = new ApiConsumerBuilder()
      .withConventionRight({
        kinds: ["SUBSCRIPTION"],
        scope: { agencyIds: [] },
        subscriptions: [],
      })
      .build();
    uow.apiConsumerRepository.consumers = [apiConsumer];

    const response = await listActiveSubscriptions.execute(
      undefined,
      apiConsumer,
    );

    expect(response).toEqual([]);
  });

  it("returns subscriptions", async () => {
    const dateNow = new Date("2022-01-01T12:00:00.000Z");
    const subscription: WebhookSubscription = {
      id: "some-id",
      createdAt: dateNow.toISOString(),
      callbackHeaders: {
        authorization: "Bearer some-string-provided-by-consumer",
      },
      callbackUrl:
        "https://some-url-provided-by-consumer.com/on-convention-updated",
      subscribedEvent: "convention.updated",
    };
    const apiConsumer = new ApiConsumerBuilder()
      .withConventionRight({
        kinds: ["SUBSCRIPTION"],
        scope: { agencyIds: [] },
        subscriptions: [
          {
            id: "my-subscription",
            createdAt: new Date().toISOString(),
            callbackHeaders: subscription.callbackHeaders,
            callbackUrl: subscription.callbackUrl,
            subscribedEvent: "convention.updated",
          },
        ],
      })
      .build();
    uow.apiConsumerRepository.consumers = [apiConsumer];

    const response = await listActiveSubscriptions.execute(
      undefined,
      apiConsumer,
    );

    expect(response).toEqual([
      {
        id: "some-id",
        createdAt: "",
        callbackHeaders: {
          authorization: "Bearer some-string-provided-by-consumer",
        },
        callbackUrl:
          "https://some-url-provided-by-consumer.com/on-convention-updated",
        subscribedEvent: "convention.updated",
      },
    ]);
  });
});
