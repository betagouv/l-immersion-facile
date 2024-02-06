import { Observable } from "rxjs";
import {
  AddressAndPosition,
  Location,
  LookupAddress,
  LookupLocationInput,
  LookupSearchResult,
} from "shared";

export interface AddressGateway {
  lookupStreetAddress(lookup: LookupAddress): Promise<AddressAndPosition[]>;
  lookupLocation$(query: LookupLocationInput): Observable<LookupSearchResult[]>;
}
