import { Observable, from } from "rxjs";
import { NafRoutes, NafSectionSuggestion } from "shared";
import { HttpClient } from "shared-routes";
import {
  otherwiseThrow,
  throwBadRequestWithExplicitMessage,
} from "src/core-logic/adapters/otherwiseThrow";
import { NafGateway } from "src/core-logic/ports/NafGateway";
import { match } from "ts-pattern";

export class HttpNafGateway implements NafGateway {
  constructor(private readonly httpClient: HttpClient<NafRoutes>) {}

  getNafSuggestions$(searchText: string): Observable<NafSectionSuggestion[]> {
    return from(
      this.httpClient
        .sectionSuggestions({
          queryParams: {
            searchText,
          },
        })
        .then((response) =>
          match(response)
            .with({ status: 200 }, ({ body }) => body)
            .with({ status: 400 }, throwBadRequestWithExplicitMessage)
            .otherwise(otherwiseThrow),
        ),
    );
  }
}
