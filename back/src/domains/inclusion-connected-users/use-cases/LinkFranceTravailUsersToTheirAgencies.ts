import { partition } from "ramda";
import {
  AgencyGroup,
  AgencyRight,
  AgencyWithUsersRights,
  UserWithRights,
  activeAgencyStatuses,
  agencyRoleIsNotToReview,
  toAgencyDtoForAgencyUsersAndAdmins,
} from "shared";
import { z } from "zod";
import {
  getAgencyEmailsByRole,
  updateRightsOnMultipleAgenciesForUser,
} from "../../../utils/agency";
import { TransactionalUseCase } from "../../core/UseCase";
import { UserAuthenticatedPayload } from "../../core/events/events";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { getUserWithRights } from "../helpers/userRights.helper";

const userAuthenticatedSchema: z.Schema<UserAuthenticatedPayload> = z.object({
  userId: z.string(),
  provider: z.enum(["inclusionConnect", "proConnect"]),
  codeSafir: z.string().or(z.null()),
});

export class LinkFranceTravailUsersToTheirAgencies extends TransactionalUseCase<UserAuthenticatedPayload> {
  inputSchema = userAuthenticatedSchema;

  protected async _execute(
    { userId, codeSafir }: UserAuthenticatedPayload,
    uow: UnitOfWork,
  ): Promise<void> {
    if (!codeSafir) return;
    const user = await getUserWithRights(uow, userId);
    if (isIcUserAlreadyHasValidRight(user, codeSafir)) return;

    const agencyWithSafir = await uow.agencyRepository.getBySafir(codeSafir);
    if (
      agencyWithSafir &&
      activeAgencyStatuses.includes(agencyWithSafir.status)
    )
      return updateActiveAgencyWithSafir(uow, agencyWithSafir, userId);

    const groupWithSafir =
      await uow.agencyGroupRepository.getByCodeSafir(codeSafir);
    if (groupWithSafir) return updateAgenciesOfGroup(uow, groupWithSafir, user);
  }
}

const isIcUserAlreadyHasValidRight = (
  icUser: UserWithRights,
  codeSafir: string,
): boolean =>
  icUser.agencyRights.some(
    ({ agency, roles }) =>
      agency.codeSafir === codeSafir && agencyRoleIsNotToReview(roles),
  );

const updateActiveAgencyWithSafir = (
  uow: UnitOfWork,
  agencyWithSafir: AgencyWithUsersRights,
  userId: string,
): Promise<void> =>
  uow.agencyRepository.update({
    id: agencyWithSafir.id,
    usersRights: {
      ...agencyWithSafir.usersRights,
      [userId]: { roles: ["validator"], isNotifiedByEmail: false },
    },
  });

const updateAgenciesOfGroup = async (
  uow: UnitOfWork,
  agencyGroupWithSafir: AgencyGroup,
  user: UserWithRights,
): Promise<void> => {
  const agenciesRelatedToGroup = await uow.agencyRepository.getByIds(
    agencyGroupWithSafir.agencyIds,
  );

  const [agencyRightsWithConflicts, agencyRightsWithoutConflicts] = partition(
    ({ agency }) => agencyGroupWithSafir.agencyIds.includes(agency.id),
    user.agencyRights,
  );

  const otherAgencyRights = await Promise.all(
    agenciesRelatedToGroup
      .filter((agency) => activeAgencyStatuses.includes(agency.status))
      .map(async (agency): Promise<AgencyRight> => {
        const existingAgencyRight = agencyRightsWithConflicts.find(
          (agencyRight) => agencyRight.agency.id === agency.id,
        );

        return existingAgencyRight &&
          agencyRoleIsNotToReview(existingAgencyRight.roles)
          ? existingAgencyRight
          : {
              agency: toAgencyDtoForAgencyUsersAndAdmins(
                agency,
                await getAgencyEmailsByRole({
                  agency,
                  role: "agency-admin",
                  uow,
                }),
              ),
              roles: ["agency-viewer"],
              isNotifiedByEmail: false,
            };
      }),
  );

  const agencyRightsForUser: AgencyRight[] = [
    ...agencyRightsWithoutConflicts,
    ...otherAgencyRights,
  ];

  return updateRightsOnMultipleAgenciesForUser(
    uow,
    user.id,
    agencyRightsForUser,
  );
};
