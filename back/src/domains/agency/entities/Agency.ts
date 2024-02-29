import { AgencyDto } from "shared";
import { ConflictError } from "../../../config/helpers/httpErrors";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";

export const throwConflictErrorOnSimilarAgencyFound = async ({
  uow,
  agency,
}: {
  uow: UnitOfWork;
  agency: AgencyDto;
}) => {
  const hasSimilarAgency =
    await uow.agencyRepository.alreadyHasActiveAgencyWithSameAddressAndKind({
      address: agency.address,
      kind: agency.kind,
      idToIgnore: agency.id,
    });

  if (hasSimilarAgency)
    throw new ConflictError(
      "Une autre agence du même type existe avec la même adresse",
    );
};
