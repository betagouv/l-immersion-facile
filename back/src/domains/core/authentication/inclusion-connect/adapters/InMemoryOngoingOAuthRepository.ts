import { InclusionConnectState } from "shared";
import { IdentityProvider, OngoingOAuth } from "../entities/OngoingOAuth";
import { OngoingOAuthRepository } from "../port/OngoingOAuthRepositiory";

export class InMemoryOngoingOAuthRepository implements OngoingOAuthRepository {
  // for test purpose
  public ongoingOAuths: OngoingOAuth[] = [];

  public async findByState(
    state: InclusionConnectState,
    provider: IdentityProvider,
  ) {
    return this.ongoingOAuths.find(
      (ongoingOAuth) =>
        ongoingOAuth.state === state && ongoingOAuth.provider === provider,
    );
  }

  public async save(newOngoingOAuth: OngoingOAuth): Promise<void> {
    const existingOngoingOAuth = await this.findByState(
      newOngoingOAuth.state,
      "inclusionConnect",
    );

    if (!existingOngoingOAuth) {
      this.ongoingOAuths.push(newOngoingOAuth);
      return;
    }

    Object.assign(existingOngoingOAuth, newOngoingOAuth);
  }
}
