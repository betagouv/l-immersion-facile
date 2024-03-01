import {
  AddressAndPosition,
  ConventionJwtPayload,
  WithLookupAddressQueryParams,
  withLookupStreetAddressQueryParamsSchema,
} from "shared";
import { UseCase } from "../../UseCase";
import { AddressGateway } from "../ports/AddressGateway";

export class LookupStreetAddress extends UseCase<
  WithLookupAddressQueryParams,
  AddressAndPosition[]
> {
  protected inputSchema = withLookupStreetAddressQueryParamsSchema;

  constructor(private addressApiGateway: AddressGateway) {
    super();
  }

  protected _execute(
    params: WithLookupAddressQueryParams,
    _jwtPayload?: ConventionJwtPayload | undefined,
  ): Promise<AddressAndPosition[]> {
    return this.addressApiGateway.lookupStreetAddress(params.lookup);
  }
}
