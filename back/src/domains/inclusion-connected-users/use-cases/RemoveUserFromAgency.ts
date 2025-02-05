import {
  InclusionConnectedUser,
  WithAgencyIdAndUserId,
  errors,
  withAgencyIdAndUserIdSchema,
} from "shared";
import { createTransactionalUseCase } from "../../core/UseCase";
import { makeProvider } from "../../core/authentication/inclusion-connect/port/OAuthGateway";
import { CreateNewEvent } from "../../core/events/ports/EventBus";
import {
  rejectIfEditionOfValidatorsOfAgencyWithRefersTo,
  validateAgencyRights,
} from "../helpers/agencyRights.helper";
import { throwIfNotAgencyAdminOrBackofficeAdmin } from "../helpers/authorization.helper";

export type RemoveUserFromAgency = ReturnType<typeof makeRemoveUserFromAgency>;

export const makeRemoveUserFromAgency = createTransactionalUseCase<
  WithAgencyIdAndUserId,
  void,
  InclusionConnectedUser,
  { createNewEvent: CreateNewEvent }
>(
  { name: "RemoveUserFromAgency", inputSchema: withAgencyIdAndUserIdSchema },
  async ({ currentUser, uow, inputParams: { agencyId, userId }, deps }) => {
    const isUserHimself = currentUser.id === userId;
    if (!isUserHimself)
      throwIfNotAgencyAdminOrBackofficeAdmin(agencyId, currentUser);

    const user = await uow.userRepository.getById(
      userId,
      await makeProvider(uow),
    );
    if (!user) throw errors.user.notFound({ userId });

    const agency = await uow.agencyRepository.getById(agencyId);
    if (!agency) throw errors.agency.notFound({ agencyId });

    const userRight = agency.usersRights[userId];
    if (!userRight)
      throw errors.user.expectedRightsOnAgency({
        agencyId,
        userId: user.id,
      });

    rejectIfEditionOfValidatorsOfAgencyWithRefersTo(agency, userRight.roles);

    const { [user.id]: _, ...usersRights } = agency.usersRights;

    validateAgencyRights(agency.id, usersRights);

    await uow.agencyRepository.update({
      id: agency.id,
      usersRights,
    });

    await uow.outboxRepository.save(
      deps.createNewEvent({
        topic: "IcUserAgencyRightChanged",
        payload: {
          userId,
          agencyId,
          triggeredBy: {
            kind: "inclusion-connected",
            userId: currentUser.id,
          },
        },
      }),
    );
  },
);
