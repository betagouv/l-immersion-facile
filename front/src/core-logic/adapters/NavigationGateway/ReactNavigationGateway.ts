import { AbsoluteUrl } from "shared";
import { FormEstablishmentParamsInUrl } from "src/app/routes/routeParams/formEstablishment";
import { routes } from "src/app/routes/routes";
import { NavigationGateway } from "src/core-logic/ports/NavigationGateway";

export class ReactNavigationGateway implements NavigationGateway {
  public goToUrl(url: AbsoluteUrl): void {
    window.location.href = url;
  }

  public navigateToEstablishmentForm(
    formEstablishmentParamsInUrl: FormEstablishmentParamsInUrl,
  ): void {
    routes.formEstablishment(formEstablishmentParamsInUrl).push();
  }
}
