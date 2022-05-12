import { NavigationGateway } from "src/core-logic/ports/NavigationGateway";
import { SiretDto } from "shared/src/siret";
export class InMemoryEstablishmentUiGateway implements NavigationGateway {
  navigateToEstablishementForm(siret: SiretDto): Promise<void> {
    this.navigateToEstablishementFormState = siret;
    return Promise.resolve();
  }
  navigateToEstablishementFormState: boolean | SiretDto = false;
}
