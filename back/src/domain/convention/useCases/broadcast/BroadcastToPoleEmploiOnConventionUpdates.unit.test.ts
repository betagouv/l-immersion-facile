import {
  AgencyDtoBuilder,
  ConventionDtoBuilder,
  ConventionId,
  expectObjectsToMatch,
  expectToEqual,
  reasonableSchedule,
} from "shared";
import { createInMemoryUow } from "../../../../adapters/primary/config/uowConfig";
import { InMemoryUowPerformer } from "../../../../adapters/secondary/InMemoryUowPerformer";
import { CustomTimeGateway } from "../../../../adapters/secondary/core/TimeGateway/CustomTimeGateway";
import { InMemoryPoleEmploiGateway } from "../../../../adapters/secondary/poleEmploi/InMemoryPoleEmploiGateway";
import { broadcastToPeServiceName } from "../../../core/ports/ErrorRepository";
import { BroadcastToPoleEmploiOnConventionUpdates } from "./BroadcastToPoleEmploiOnConventionUpdates";

const prepareUseCase = async () => {
  const poleEmploiGateWay = new InMemoryPoleEmploiGateway();
  const uow = createInMemoryUow();
  const timeGateway = new CustomTimeGateway();
  const broadcastToPe = new BroadcastToPoleEmploiOnConventionUpdates(
    new InMemoryUowPerformer(uow),
    poleEmploiGateWay,
    timeGateway,
    { resyncMode: false },
  );

  const agencyRepository = uow.agencyRepository;
  const peAgency = new AgencyDtoBuilder()
    .withId("some-pe-agency")
    .withKind("pole-emploi")
    .build();
  await agencyRepository.setAgencies([peAgency]);

  return {
    broadcastToPe,
    poleEmploiGateWay,
    peAgency,
    timeGateway,
    uow,
  };
};

describe("Broadcasts events to pole-emploi", () => {
  it("Skips convention if not linked to an agency of kind pole-emploi", async () => {
    // Prepare
    const { broadcastToPe, poleEmploiGateWay, uow } = await prepareUseCase();

    const agency = new AgencyDtoBuilder().withKind("mission-locale").build();
    await uow.agencyRepository.setAgencies([agency]);

    // Act
    const convention = new ConventionDtoBuilder()
      .withAgencyId(agency.id)
      .withFederatedIdentity({ provider: "peConnect", token: "some-id" })
      .build();

    await broadcastToPe.execute({ convention });

    // Assert
    expect(poleEmploiGateWay.notifications).toHaveLength(0);
  });

  it("Conventions without federated id are still sent, with their externalId", async () => {
    // Prepare
    const { broadcastToPe, poleEmploiGateWay, peAgency, uow } =
      await prepareUseCase();

    const immersionConventionId: ConventionId =
      "00000000-0000-4000-0000-000000000000";
    const externalId = "00000000001";

    uow.conventionExternalIdRepository.externalIdsByConventionId = {
      [immersionConventionId]: externalId,
    };

    // Act
    const convention = new ConventionDtoBuilder()
      .withId(immersionConventionId)
      .withAgencyId(peAgency.id)
      .withoutFederatedIdentity()
      .build();

    await broadcastToPe.execute({ convention });

    // Assert
    expect(poleEmploiGateWay.notifications).toHaveLength(1);
    expectObjectsToMatch(poleEmploiGateWay.notifications[0], {
      originalId: immersionConventionId,
      id: externalId,
    });
  });

  it("If Pe returns a 404 error, we store the error in a repo", async () => {
    // Prepare
    const { broadcastToPe, poleEmploiGateWay, peAgency, uow, timeGateway } =
      await prepareUseCase();

    // Act
    const convention = new ConventionDtoBuilder()
      .withAgencyId(peAgency.id)
      .withoutFederatedIdentity()
      .build();

    poleEmploiGateWay.setNextResponse({
      status: 404,
      message: "Ops, something is bad",
    });
    const now = new Date();
    timeGateway.setNextDate(now);

    await broadcastToPe.execute({ convention });

    // Assert
    expect(poleEmploiGateWay.notifications).toHaveLength(1);
    expectToEqual(uow.errorRepository.savedErrors, [
      {
        serviceName: broadcastToPeServiceName,
        params: {
          conventionId: convention.id,
          httpStatus: 404,
        },
        message: "Ops, something is bad",
        occurredAt: now,
        handledByAgency: false,
      },
    ]);
  });

  it("Converts and sends conventions, with externalId and federated id", async () => {
    // Prepare
    const { broadcastToPe, poleEmploiGateWay, peAgency, uow } =
      await prepareUseCase();

    const immersionConventionId: ConventionId =
      "00000000-0000-0000-0000-000000000000";

    const externalId = "00000000001";
    uow.conventionExternalIdRepository.externalIdsByConventionId = {
      [immersionConventionId]: externalId,
    };

    // Act
    const convention = new ConventionDtoBuilder()
      .withId(immersionConventionId)
      .withAgencyId(peAgency.id)
      .withImmersionAppelation({
        appellationCode: "11111",
        appellationLabel: "some Appellation",
        romeCode: "A1111",
        romeLabel: "some Rome",
      })
      .withStatus("ACCEPTED_BY_VALIDATOR")
      .withFederatedIdentity({ provider: "peConnect", token: "some-id" })
      .withDateStart("2021-05-12")
      .withDateEnd("2021-05-14T00:30:00.000Z") //
      .withSchedule(reasonableSchedule)
      .withImmersionObjective("Initier une démarche de recrutement")
      .build();

    await broadcastToPe.execute({ convention });

    // Assert
    expect(poleEmploiGateWay.notifications).toHaveLength(1);
    expectObjectsToMatch(poleEmploiGateWay.notifications[0], {
      id: externalId,
      peConnectId: "some-id",
      originalId: immersionConventionId,
      objectifDeImmersion: 3,
      dureeImmersion: 21,
      dateDebut: "2021-05-12T00:00:00.000Z",
      dateFin: "2021-05-14T00:30:00.000Z",
      statut: "DEMANDE_VALIDÉE",
      codeAppellation: "011111",
    });
  });
});
