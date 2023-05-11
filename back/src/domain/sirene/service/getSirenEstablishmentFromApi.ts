import { GetSiretRequestDto, SiretEstablishmentDto } from "shared";
import { NotFoundError } from "../../../adapters/primary/helpers/httpErrors";
import { SiretGateway } from "../ports/SirenGateway";

export const getSirenEstablishmentFromApi = async (
  { siret, includeClosedEstablishments }: GetSiretRequestDto,
  sirenGateway: SiretGateway,
): Promise<SiretEstablishmentDto> => {
  const sirenEstablishment = await sirenGateway.getEstablishmentBySiret(
    siret,
    includeClosedEstablishments,
  );

  if (!sirenEstablishment) {
    throw new NotFoundError(
      `Did not find establishment with siret : ${siret} in siren API`,
    );
  }

  return sirenEstablishment;
};
