import { Flavor, InclusionConnectJwt, UserWithRights } from "..";
import { ConventionDto } from "../convention/convention.dto";
import {
  AgencyRole,
  User,
} from "../inclusionConnectedAllowed/inclusionConnectedAllowed.dto";
import { ConventionEstablishmentRole, Role } from "../role/role.dto";
import { allowedStartInclusionConnectLoginPages } from "../routes/routes";
import { ExcludeFromExisting, ExtractFromExisting } from "../utils";

export type IdToken = Flavor<string, "IdToken">;
export type IdentityProvider = "inclusionConnect" | "proConnect";
export type OAuthState = Flavor<string, "OAuthState">;
export type OAuthCode = Flavor<string, "OAuthCode">;
export type AuthenticateWithOAuthCodeParams = WithSourcePage & {
  state: OAuthState;
  code: OAuthCode;
};

export type AllowedStartInclusionConnectLoginSourcesKind =
  (typeof allowedStartInclusionConnectLoginPages)[number];

export type WithSourcePage = {
  page: AllowedStartInclusionConnectLoginSourcesKind;
};

export type AuthenticatedUserQueryParams = {
  token: InclusionConnectJwt;
  idToken: string;
  siret?: string; // remove optional when inclusion connect is removed
} & Pick<User, "email" | "firstName" | "lastName">;

type InclusionConnectConventionManageAllowedRole =
  | ConventionEstablishmentRole
  | ExtractFromExisting<Role, "back-office">
  | ExcludeFromExisting<AgencyRole, "to-review">;

export const getIcUserRoleForAccessingConvention = (
  convention: ConventionDto,
  user: UserWithRights,
): InclusionConnectConventionManageAllowedRole[] => {
  const roles: InclusionConnectConventionManageAllowedRole[] = [];
  if (user.isBackofficeAdmin) roles.push("back-office");
  if (convention.signatories.establishmentRepresentative.email === user.email)
    roles.push("establishment-representative");
  if (
    convention.establishmentTutor.email === user.email ||
    // WUT ?
    user.establishments?.some((e) => e.siret === convention.siret)
  )
    roles.push("establishment-tutor");
  const agencyRight = user.agencyRights.find(
    (agencyRight) => agencyRight.agency.id === convention.agencyId,
  );

  if (agencyRight && agencyRoleIsNotToReview(agencyRight.roles))
    roles.push(...agencyRight.roles);

  return roles;
};

export const agencyRoleIsNotToReview = (
  agencyRoles: AgencyRole[],
): agencyRoles is ExcludeFromExisting<AgencyRole, "to-review">[] =>
  !agencyRoles.includes("to-review");

export const inclusionConnectTokenExpiredMessage = "Token is expired";
