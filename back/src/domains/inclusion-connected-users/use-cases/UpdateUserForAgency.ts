import { keys } from "ramda";
import {
  AgencyUsersRights,
  AgencyWithUsersRights,
  Email,
  InclusionConnectedUser,
  UserParamsForAgency,
  errors,
  userParamsForAgencySchema,
} from "shared";
import { TransactionalUseCase } from "../../core/UseCase";
import { makeProvider } from "../../core/authentication/inclusion-connect/port/OAuthGateway";
import {
  UserOnRepository,
  UserRepository,
} from "../../core/authentication/inclusion-connect/port/UserRepository";
import { CreateNewEvent } from "../../core/events/ports/EventBus";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../core/unit-of-work/ports/UnitOfWorkPerformer";
import {
  rejectIfEditionOfNotificationPreferencesWhenNotAdminNorOwnPreferences,
  rejectIfEditionOfRolesWhenNotBackofficeAdminNorAgencyAdmin,
  rejectIfEditionOfValidatorsOfAgencyWithRefersTo,
  validateAgencyRights,
} from "../helpers/agencyRights.helper";

export class UpdateUserForAgency extends TransactionalUseCase<
  UserParamsForAgency,
  void,
  InclusionConnectedUser
> {
  protected inputSchema = userParamsForAgencySchema;

  readonly #createNewEvent: CreateNewEvent;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    createNewEvent: CreateNewEvent,
  ) {
    super(uowPerformer);

    this.#createNewEvent = createNewEvent;
  }

  protected async _execute(
    params: UserParamsForAgency,
    uow: UnitOfWork,
    currentUser: InclusionConnectedUser,
  ): Promise<void> {
    const { isBackOfficeOrAgencyAdmin } = throwIfUserHasNoRightOnAgency(
      currentUser,
      params,
    );

    const userToUpdate = await uow.userRepository.getById(
      params.userId,
      await makeProvider(uow),
    );
    if (!userToUpdate) throw errors.user.notFound({ userId: params.userId });

    const agency = await uow.agencyRepository.getById(params.agencyId);
    if (!agency) throw errors.agency.notFound({ agencyId: params.agencyId });

    const agencyRightToUpdate = agency.usersRights[userToUpdate.id];
    if (!agencyRightToUpdate)
      throw errors.user.noRightsOnAgency({
        agencyId: agency.id,
        userId: userToUpdate.id,
      });

    rejectIfEditionOfRolesWhenNotBackofficeAdminNorAgencyAdmin(
      agencyRightToUpdate.roles,
      params.roles,
      isBackOfficeOrAgencyAdmin,
    );
    rejectIfEditionOfNotificationPreferencesWhenNotAdminNorOwnPreferences(
      currentUser.id === userToUpdate.id,
      agencyRightToUpdate.isNotifiedByEmail !== params.isNotifiedByEmail,
      isBackOfficeOrAgencyAdmin,
    );
    rejectIfEditionOfValidatorsOfAgencyWithRefersTo(agency, params.roles);
    rejectEmailModificationIfInclusionConnectedUser(userToUpdate, params.email);
    await rejectIfEmailModificationToAnotherEmailAlreadyLinkedToAgency(
      agency,
      params,
      uow,
    );

    const updatedRights: AgencyUsersRights = {
      ...agency.usersRights,
      [userToUpdate.id]: {
        roles: isBackOfficeOrAgencyAdmin
          ? params.roles
          : agencyRightToUpdate.roles,
        isNotifiedByEmail: params.isNotifiedByEmail,
      },
    };

    validateAgencyRights(agency.id, updatedRights);

    await Promise.all([
      uow.agencyRepository.update({
        id: agency.id,
        usersRights: updatedRights,
      }),
      updateIfUserEmailChanged(userToUpdate, params.email, uow.userRepository),
      uow.outboxRepository.save(
        this.#createNewEvent({
          topic: "IcUserAgencyRightChanged",
          payload: {
            ...params,
            triggeredBy: {
              kind: "inclusion-connected",
              userId: currentUser.id,
            },
          },
        }),
      ),
    ]);
  }
}

const rejectEmailModificationIfInclusionConnectedUser = (
  user: UserOnRepository,
  newEmail: Email,
): void => {
  if (!newEmail || !user.externalId) return;
  if (user.email !== newEmail) {
    throw errors.user.forbiddenToChangeEmailForUIcUser();
  }
};

const updateIfUserEmailChanged = async (
  user: UserOnRepository,
  newEmail: Email,
  userRepository: UserRepository,
): Promise<void> => {
  if (user.email === newEmail || user.externalId) return;
  await userRepository.updateEmail(user.id, newEmail);
};

const throwIfUserHasNoRightOnAgency = (
  currentUser: InclusionConnectedUser,
  userParamsForAgency: UserParamsForAgency,
): { isBackOfficeOrAgencyAdmin: boolean } => {
  if (!currentUser) throw errors.user.unauthorized();
  if (currentUser.isBackofficeAdmin) return { isBackOfficeOrAgencyAdmin: true };

  const currentUserAgencyRight = currentUser.agencyRights.find(
    (agencyRight) => agencyRight.agency.id === userParamsForAgency.agencyId,
  );
  if (!currentUserAgencyRight)
    throw errors.user.forbidden({ userId: currentUser.id });

  const isAgencyAdmin = currentUserAgencyRight.roles.includes("agency-admin");

  return {
    isBackOfficeOrAgencyAdmin: currentUser.isBackofficeAdmin || isAgencyAdmin,
  };
};

const rejectIfEmailModificationToAnotherEmailAlreadyLinkedToAgency = async (
  agency: AgencyWithUsersRights,
  userToUpdate: UserParamsForAgency,
  uow: UnitOfWork,
) => {
  const provider = await makeProvider(uow);
  const user = await uow.userRepository.findByEmail(
    userToUpdate.email,
    provider,
  );

  if (user === undefined || (user && user.id === userToUpdate.userId)) return;

  if (keys(agency.usersRights).includes(user.id)) {
    throw errors.agency.userAlreadyExist();
  }
};
