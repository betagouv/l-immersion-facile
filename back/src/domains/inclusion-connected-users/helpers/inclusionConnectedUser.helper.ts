import { toPairs, uniq, values } from "ramda";
import {
  AbsoluteUrl,
  AgencyId,
  AgencyRight,
  AgencyWithUsersRights,
  ConventionsEstablishmentDashboard,
  EstablishmentDashboards,
  InclusionConnectedUser,
  OAuthGatewayProvider,
  UserId,
  UserWithAgencyRights,
  WithDashboards,
  agencyRoleIsNotToReview,
} from "shared";
import { AgencyRightOfUser } from "../../agency/ports/AgencyRepository";
import { makeProvider } from "../../core/authentication/inclusion-connect/port/OAuthGateway";
import { UserOnRepository } from "../../core/authentication/inclusion-connect/port/UserRepository";
import { DashboardGateway } from "../../core/dashboard/port/DashboardGateway";
import { TimeGateway } from "../../core/time-gateway/ports/TimeGateway";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { getUserWithRights } from "./userRights.helper";

export const getIcUserByUserId = async (
  uow: UnitOfWork,
  userId: UserId,
  dashboardGateway: DashboardGateway,
  timeGateway: TimeGateway,
): Promise<InclusionConnectedUser> => {
  const userWithAdminAndAgencyRights = await getUserWithRights(uow, userId);

  return {
    ...userWithAdminAndAgencyRights,
    ...(await withDashboards(
      uow,
      userWithAdminAndAgencyRights,
      dashboardGateway,
      timeGateway,
    )),
  };
};

export const getIcUsersByUserIds = async (
  uow: UnitOfWork,
  userIds: UserId[],
): Promise<InclusionConnectedUser[]> => {
  const provider = await makeProvider(uow);
  const users = await uow.userRepository.getByIds(userIds, provider);

  const userRightsByUser = (
    await Promise.all(
      userIds.map(async (userId) => ({
        userId,
        rights: await uow.agencyRepository.getAgenciesRightsByUserId(userId),
      })),
    )
  ).reduce<Record<UserId, AgencyRightOfUser[]>>(
    (acc, current) => ({ ...acc, [current.userId]: current.rights }),
    {},
  );

  const agenciesRelatedToUsersByAgencyId = (
    await uow.agencyRepository.getByIds(
      uniq(
        values(userRightsByUser).flatMap((rights) =>
          rights.map((right) => right.agencyId),
        ),
      ),
    )
  ).reduce<Record<AgencyId, AgencyWithUsersRights>>(
    (acc, current) => ({ ...acc, [current.id]: current }),
    {},
  );

  return Promise.all(
    users.map<Promise<InclusionConnectedUser>>(async (user) => ({
      ...user,
      agencyRights: await makeAgencyRights(
        userRightsByUser[user.id],
        agenciesRelatedToUsersByAgencyId,
        uow,
        provider,
      ),
      dashboards: { agencies: {}, establishments: {} },
    })),
  );
};

const makeAgencyRights = (
  userRights: AgencyRightOfUser[],
  agenciesRelatedToUsersByAgencyId: Record<AgencyId, AgencyWithUsersRights>,
  uow: UnitOfWork,
  provider: OAuthGatewayProvider,
): Promise<AgencyRight[]> =>
  Promise.all(
    userRights.map<Promise<AgencyRight>>(async ({ agencyId, ...rights }) => {
      const { usersRights, ...agency } =
        agenciesRelatedToUsersByAgencyId[agencyId];

      const adminUsers = await uow.userRepository.getByIds(
        toPairs(usersRights)
          .filter(([_, userRight]) => userRight?.roles.includes("agency-admin"))
          .map(([id]) => id),
        provider,
      );

      return {
        ...rights,
        agency: {
          ...agency,
          admins: adminUsers.map((user) => user.email),
        },
      };
    }),
  );

async function makeAgencyDashboards(
  uow: UnitOfWork,
  user: UserWithAgencyRights,
  dashboardGateway: DashboardGateway,
  timeGateway: TimeGateway,
) {
  const apiConsumers = await uow.apiConsumerRepository.getAll();

  const agencyIdsWithEnoughPrivileges = user.agencyRights
    .filter(({ roles }) => agencyRoleIsNotToReview(roles))
    .map(({ agency }) => agency.id);

  const isSynchronisationEnableForAgency = user.agencyRights.some(
    (agencyRight) =>
      agencyRight.agency.kind === "pole-emploi" ||
      apiConsumers.some(
        (apiconsumer) =>
          apiconsumer.rights.convention.scope.agencyIds?.includes(
            agencyRight.agency.id,
          ) ||
          apiconsumer.rights.convention.scope.agencyKinds?.includes(
            agencyRight.agency.kind,
          ),
      ),
  );

  return {
    ...(agencyIdsWithEnoughPrivileges.length > 0
      ? {
          agencyDashboardUrl: await dashboardGateway.getAgencyUserUrl(
            user.id,
            timeGateway.now(),
          ),
        }
      : {}),
    ...(agencyIdsWithEnoughPrivileges.length > 0
      ? {
          erroredConventionsDashboardUrl: isSynchronisationEnableForAgency
            ? await dashboardGateway.getErroredConventionsDashboardUrl(
                user.id,
                timeGateway.now(),
              )
            : undefined,
        }
      : {}),
  };
}

async function withDashboards(
  uow: UnitOfWork,
  user: UserWithAgencyRights,
  dashboardGateway: DashboardGateway,
  timeGateway: TimeGateway,
): Promise<WithDashboards> {
  return {
    dashboards: {
      agencies: await makeAgencyDashboards(
        uow,
        user,
        dashboardGateway,
        timeGateway,
      ),
      establishments: await makeEstablishmentDashboard(
        uow,
        user,
        dashboardGateway,
        timeGateway,
      ),
    },
  };
}

async function makeEstablishmentDashboard(
  uow: UnitOfWork,
  user: UserOnRepository,
  dashboardGateway: DashboardGateway,
  timeGateway: TimeGateway,
): Promise<EstablishmentDashboards> {
  const conventions = await makeConventionEstablishmentDashboard(
    uow,
    user,
    dashboardGateway,
    timeGateway,
  );
  const discussions = await makeDiscussionsEstablishmentDashboard(
    uow,
    user,
    dashboardGateway,
    timeGateway,
  );
  return {
    ...(conventions ? { conventions } : {}),
    ...(discussions ? { discussions } : {}),
  };
}

async function makeConventionEstablishmentDashboard(
  uow: UnitOfWork,
  user: UserOnRepository,
  dashboardGateway: DashboardGateway,
  timeGateway: TimeGateway,
): Promise<ConventionsEstablishmentDashboard | undefined> {
  const hasConventionForEstablishmentRepresentative =
    (
      await uow.conventionRepository.getIdsByEstablishmentRepresentativeEmail(
        user.email,
      )
    ).length > 0;

  const hasConventionForEstablishmentTutor =
    (await uow.conventionRepository.getIdsByEstablishmentTutorEmail(user.email))
      .length > 0;

  return hasConventionForEstablishmentRepresentative ||
    hasConventionForEstablishmentTutor
    ? {
        url: await dashboardGateway.getEstablishmentConventionsDashboardUrl(
          user.id,
          timeGateway.now(),
        ),
        role: hasConventionForEstablishmentRepresentative
          ? "establishment-representative"
          : "establishment-tutor",
      }
    : undefined;
}

async function makeDiscussionsEstablishmentDashboard(
  uow: UnitOfWork,
  user: UserOnRepository,
  dashboardGateway: DashboardGateway,
  timeGateway: TimeGateway,
): Promise<AbsoluteUrl | undefined> {
  const hasDiscussion = await uow.discussionRepository.hasDiscussionMatching({
    establishmentRepresentativeEmail: user.email,
  });
  return hasDiscussion
    ? dashboardGateway.getEstablishmentDiscussionsDashboardUrl(
        user.id,
        timeGateway.now(),
      )
    : undefined;
}
