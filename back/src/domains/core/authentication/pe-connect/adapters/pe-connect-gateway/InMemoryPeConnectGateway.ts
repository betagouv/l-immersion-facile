import { AccessTokenDto } from "../../dto/AccessToken.dto";
import { FtConnectAdvisorDto } from "../../dto/FtConnectAdvisor.dto";
import { FtConnectUserDto } from "../../dto/FtConnectUserDto";
import { FtConnectGateway } from "../../port/FtConnectGateway";

export class InMemoryPeConnectGateway implements FtConnectGateway {
  #accessToken: AccessTokenDto | undefined = undefined;

  #advisors: FtConnectAdvisorDto[] = [];

  #user: FtConnectUserDto | undefined = undefined;

  public async getAccessToken(
    _authorizationCode: string,
  ): Promise<AccessTokenDto | undefined> {
    return this.#accessToken;
  }

  public async getUserAndAdvisors(_accessToken: AccessTokenDto): Promise<
    | {
        user: FtConnectUserDto;
        advisors: FtConnectAdvisorDto[];
      }
    | undefined
  > {
    if (!this.#user) return undefined;
    const peUserAndAdvisor: {
      user: FtConnectUserDto;
      advisors: FtConnectAdvisorDto[];
    } = {
      advisors: this.#advisors,
      user: this.#user,
    };
    return peUserAndAdvisor;
  }

  public setAccessToken(accessToken: AccessTokenDto) {
    this.#accessToken = accessToken;
  }

  public setAdvisors(advisors: FtConnectAdvisorDto[]) {
    this.#advisors = advisors;
  }

  // test
  public setUser(user: FtConnectUserDto | undefined) {
    this.#user = user;
  }
}
