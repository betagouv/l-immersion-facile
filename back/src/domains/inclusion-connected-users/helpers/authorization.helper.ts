import {
  AgencyId,
  InclusionConnectDomainJwtPayload,
  InclusionConnectedUser,
  errors,
} from "shared";
import { makeProvider } from "../../core/authentication/inclusion-connect/port/OAuthGateway";
import { UserOnRepository } from "../../core/authentication/inclusion-connect/port/UserRepository";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";

export const throwIfIcUserNotBackofficeAdmin = async (
  uow: UnitOfWork,
  jwtPayload: InclusionConnectDomainJwtPayload,
) => {
  const user = await uow.userRepository.getById(
    jwtPayload.userId,
    await makeProvider(uow),
  );
  if (!user) throw errors.user.notFound({ userId: jwtPayload.userId });
  if (!user.isBackofficeAdmin)
    throw errors.user.notBackOfficeAdmin({ userId: jwtPayload.userId });
};

export const throwIfNotAdmin = (user: UserOnRepository | undefined) => {
  if (!user) throw errors.user.unauthorized();
  if (!user.isBackofficeAdmin) throw errors.user.forbidden({ userId: user.id });
};

export const throwIfNotAgencyAdminOrBackofficeAdmin = (
  agencyId: AgencyId,
  currentUser?: InclusionConnectedUser,
): void => {
  if (!currentUser) throw errors.user.unauthorized();
  if (currentUser.isBackofficeAdmin) return;

  const hasPermission = currentUser.agencyRights.some(
    (agencyRight) =>
      agencyRight.agency.id === agencyId &&
      agencyRight.roles.includes("agency-admin"),
  );

  if (!hasPermission) {
    throw errors.user.forbidden({ userId: currentUser.id });
  }
};
