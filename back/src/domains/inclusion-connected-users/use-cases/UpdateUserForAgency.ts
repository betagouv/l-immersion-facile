import {
  AgencyDto,
  AgencyRight,
  Email,
  InclusionConnectedUser,
  UserParamsForAgency,
  OAuthProvider,
  errors,
  replaceElementWhere,
  userParamsForAgencySchema,
} from "shared";
import { TransactionalUseCase } from "../../core/UseCase";
import { oAuthModeByFeatureFlags } from "../../core/authentication/inclusion-connect/port/OAuthGateway";
import { UserRepository } from "../../core/authentication/inclusion-connect/port/UserRepository";
import { DomainEvent } from "../../core/events/events";
import { CreateNewEvent } from "../../core/events/ports/EventBus";
import { UnitOfWork } from "../../core/unit-of-work/ports/UnitOfWork";
import { UnitOfWorkPerformer } from "../../core/unit-of-work/ports/UnitOfWorkPerformer";
import {
  throwIfAgencyDontHaveOtherCounsellorsReceivingNotifications,
  throwIfAgencyDontHaveOtherValidatorsReceivingNotifications,
} from "../helpers/throwIfAgencyWontHaveEnoughCounsellorsOrValidators";
import { throwIfNotAdmin } from "../helpers/throwIfIcUserNotBackofficeAdmin";

const rejectIfAgencyWontHaveValidatorsReceivingNotifications = async (
  uow: UnitOfWork,
  params: UserParamsForAgency,
  agency: AgencyDto,
  provider: OAuthGatewayProvider,
) => {
  if (!params.roles.includes("validator") || !params.isNotifiedByEmail) {
    await throwIfAgencyDontHaveOtherValidatorsReceivingNotifications(
      uow,
      agency,
      params.userId,
      provider,
    );
  }
};

const rejectIfOneStepValidationAgencyWontHaveValidatorsReceivingEmails = async (
  params: UserParamsForAgency,
  agency: AgencyDto,
) => {
  if (
    agency.counsellorEmails.length === 0 &&
    params.roles.includes("counsellor")
  ) {
    throw errors.agency.invalidRoleUpdateForOneStepValidationAgency({
      agencyId: params.agencyId,
      role: "counsellor",
    });
  }
};

const rejectIfAgencyWithRefersToWontHaveCounsellors = async (
  uow: UnitOfWork,
  params: UserParamsForAgency,
  agency: AgencyDto,
  provider: OAuthGatewayProvider,
) => {
  if (!params.roles.includes("counsellor") || !params.isNotifiedByEmail) {
    await throwIfAgencyDontHaveOtherCounsellorsReceivingNotifications(
      uow,
      agency,
      params.userId,
      provider,
    );
  }
};

const makeAgencyRights = async (
  uow: UnitOfWork,
  params: UserParamsForAgency,
  userToUpdate: InclusionConnectedUser,
  provider: OAuthGatewayProvider,
) => {
  const agency = await uow.agencyRepository.getById(params.agencyId);

  if (!agency) throw errors.agency.notFound({ agencyId: params.agencyId });

  const agencyRightToUpdate = userToUpdate.agencyRights.find(
    ({ agency }) => agency.id === params.agencyId,
  );

  if (!agencyRightToUpdate)
    throw errors.user.noRightsOnAgency({
      agencyId: params.agencyId,
      userId: params.userId,
    });

  await rejectIfOneStepValidationAgencyWontHaveValidatorsReceivingEmails(
    params,
    agency,
  );
  await rejectIfAgencyWontHaveValidators(uow, params, agency, provider);
  await rejectIfAgencyWithRefersToWontHaveCounsellors(
    uow,
    params,
    agency,
    provider,
  );
  await rejectIfAgencyWithRefersToWontHaveCounsellors(uow, params, agency, provider);

  const updatedAgencyRight: AgencyRight = {
    ...agencyRightToUpdate,
    roles: params.roles,
    isNotifiedByEmail: params.isNotifiedByEmail,
  };

  const newAgencyRights = replaceElementWhere(
    userToUpdate.agencyRights,
    updatedAgencyRight,
    ({ agency }) => agency.id === params.agencyId,
  );

  return newAgencyRights;
};

const rejectEmailModificationIfInclusionConnectedUser = (
  user: InclusionConnectedUser,
  newEmail: Email,
) => {
  if (!newEmail || !user.externalId) return;
  if (user.email !== newEmail) {
    throw errors.user.forbiddenToChangeEmailForUIcUser();
  }
};

const updateIfUserEmailChanged = async (
  user: InclusionConnectedUser,
  newEmail: Email,
  userRepository: UserRepository,
) => {
  if (user.email === newEmail || user.externalId) return;
  await userRepository.updateEmail(user.id, newEmail);
};

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
    throwIfNotAdmin(currentUser);
    const mode = oAuthModeByFeatureFlags(
      await uow.featureFlagRepository.getAll(),
    );
    const userToUpdate = await uow.userRepository.getById(params.userId, mode);
    if (!userToUpdate) throw errors.user.notFound({ userId: params.userId });

    const newAgencyRights = await makeAgencyRights(
      uow,
      params,
      userToUpdate,
      mode,
    );
    rejectEmailModificationIfInclusionConnectedUser(userToUpdate, params.email);

    const event: DomainEvent = this.#createNewEvent({
      topic: "IcUserAgencyRightChanged",
      payload: {
        ...params,
        triggeredBy: {
          kind: "inclusion-connected",
          userId: currentUser.id,
        },
      },
    });

    await Promise.all([
      uow.userRepository.updateAgencyRights({
        userId: params.userId,
        agencyRights: newAgencyRights,
      }),
      updateIfUserEmailChanged(userToUpdate, params.email, uow.userRepository),
      uow.outboxRepository.save(event),
    ]);
  }
}
