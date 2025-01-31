import { Observable, Subject, delay, of } from "rxjs";
import { NafSectionSuggestion } from "shared";
import { NafGateway } from "src/core-logic/ports/NafGateway";

export class SimulatedNafGateway implements NafGateway {
  public nafSuggestions$ = new Subject<NafSectionSuggestion[]>();

  constructor(private readonly simulatedLatency = 0) {}

  #simulatedResponse: NafSectionSuggestion[] = [
    {
      label: "Agriculture, sylviculture et pêche",
      nafCodes: ["1000A", "1000B"],
    },
    {
      label: "Industries extractives",
      nafCodes: ["1000C", "1000D"],
    },
    {
      label: "Industrie manufacturière",
      nafCodes: ["1000E", "1000F"],
    },
  ];

  getNafSuggestions$(searchTerm: string): Observable<NafSectionSuggestion[]> {
    return of(
      this.#simulatedResponse.filter((suggestion) =>
        suggestion.label.includes(searchTerm),
      ),
    ).pipe(delay(this.simulatedLatency));
  }
}
