import {
  AgencyId,
  Email,
  GetUsersFilters,
  InclusionConnectedUser,
  OAuthGatewayProvider,
  User,
  UserId,
  WithAgencyRole,
  WithEstablishments,
  WithIsBackOfficeAdmin,
  errors,
} from "shared";

export type InclusionConnectedFilters = Partial<WithAgencyRole> & {
  agencyId?: AgencyId;
  email?: Email;
  isNotifiedByEmail?: boolean;
};

export type InclusionConnectedUserWithoutRights = Omit<
  InclusionConnectedUser,
  "agencyRights"
>;

export type UserOnRepository = User &
  WithIsBackOfficeAdmin &
  WithEstablishments;

export interface UserRepository {
  delete(id: UserId): Promise<void>;
  save(user: User, provider: OAuthGatewayProvider): Promise<void>;
  updateEmail(userId: string, email: string): Promise<void>;
  findByExternalId(
    externalId: string,
    provider: OAuthGatewayProvider,
  ): Promise<User | undefined>;
  findByEmail(
    email: Email,
    provider: OAuthGatewayProvider,
  ): Promise<User | undefined>;

  getById(
    userId: string,
    provider: OAuthGatewayProvider,
  ): Promise<UserOnRepository | undefined>;

  getUsers(filters: GetUsersFilters): Promise<User[]>;
}

export const getUsersByIds = async (
  userRepository: UserRepository,
  provider: OAuthGatewayProvider,
  ids: UserId[],
): Promise<UserOnRepository[]> =>
  Promise.all(
    ids.map((id) =>
      userRepository.getById(id, provider).then((user) => {
        if (!user) throw errors.user.notFound({ userId: id });
        return user;
      }),
    ),
  );
