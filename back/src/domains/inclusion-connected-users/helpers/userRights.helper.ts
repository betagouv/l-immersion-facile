import {
  OAuthGatewayProvider,
  UserId,
  UserWithRights,
  WithEstablishmentData,
  WithEstablishments,
  errors,
} from "shared";
import { getAgencyRightByUserId } from "../../../utils/agency";
import { makeProvider } from "../../core/authentication/inclusion-connect/port/OAuthGateway";
import { UserOnRepository } from "../../core/authentication/inclusion-connect/port/UserRepository";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { EstablishmentAggregate } from "../../establishment/entities/EstablishmentAggregate";

export const getUserWithRights = async (
  uow: UnitOfWork,
  userId: UserId,
): Promise<UserWithRights> => {
  const provider = await makeProvider(uow);
  const user = await uow.userRepository.getById(userId, provider);
  if (!user) throw errors.user.notFound({ userId });
  const agencyRights = await getAgencyRightByUserId(uow, user.id);

  return {
    ...user,
    agencyRights,
    ...(await withEstablishments(uow, user, provider)),
  };
};

const withEstablishments = async (
  uow: UnitOfWork,
  user: UserOnRepository,
  provider: OAuthGatewayProvider,
): Promise<WithEstablishments> => {
  const establishmentAggregates =
    await uow.establishmentAggregateRepository.getEstablishmentAggregatesByFilters(
      {
        userId: user.id,
      },
    );
  const establishments: WithEstablishmentData[] = await Promise.all(
    establishmentAggregates.map((establishment) =>
      makeEstablishmentRights(uow, provider, establishment, user.id),
    ),
  );
  return establishments.length ? { establishments } : {};
};

const makeEstablishmentRights = async (
  uow: UnitOfWork,
  provider: OAuthGatewayProvider,
  { establishment, userRights }: EstablishmentAggregate,
  userId: UserId,
) => {
  const userRight = userRights.find((userRight) => userRight.userId === userId);
  if (!userRight) {
    throw errors.establishment.noUserRights({
      siret: establishment.siret,
    });
  }

  const adminUsers = await uow.userRepository.getByIds(
    userRights
      .filter((user) => user.role === "establishment-admin")
      .map(({ userId }) => userId),
    provider,
  );

  return {
    siret: establishment.siret,
    businessName: establishment.customizedName
      ? establishment.customizedName
      : establishment.name,
    role: userRight.role,
    admins: adminUsers.map(({ firstName, lastName, email }) => ({
      firstName,
      lastName,
      email,
    })),
  };
};
