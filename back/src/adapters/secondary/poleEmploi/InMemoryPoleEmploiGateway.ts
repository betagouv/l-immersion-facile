import {
  GetAccessTokenResponse,
  PoleEmploiBroadcastResponse,
  PoleEmploiConvention,
  PoleEmploiGateway,
} from "../../../domains/convention/ports/PoleEmploiGateway";

export class InMemoryPoleEmploiGateway implements PoleEmploiGateway {
  #nextResponse: PoleEmploiBroadcastResponse = { status: 200 };

  constructor(public notifications: PoleEmploiConvention[] = []) {}

  public async getAccessToken(scope: string): Promise<GetAccessTokenResponse> {
    return {
      access_token: `fake_access_token_for_scope_${scope}`,
      expires_in: 600,
    };
  }

  public async notifyOnConventionUpdated(
    convention: PoleEmploiConvention,
  ): Promise<PoleEmploiBroadcastResponse> {
    this.notifications.push(convention);
    return this.#nextResponse;
  }

  //For testing purpose

  public setNextResponse(response: PoleEmploiBroadcastResponse) {
    this.#nextResponse = response;
  }
}
