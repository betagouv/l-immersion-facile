import { Observable } from "rxjs";
import { NafSectionSuggestion } from "shared";

export interface NafGateway {
  getNafSuggestions$(searchText: string): Observable<NafSectionSuggestion[]>;
}
