import {
  AgencyDtoBuilder,
  ConventionDtoBuilder,
  ConventionId,
  expectObjectsToMatch,
  expectPromiseToFailWithError,
  expectToEqual,
  reasonableSchedule,
} from "shared";
import { toAgencyWithRights } from "../../../../utils/agency";
import { broadcastToPeServiceName } from "../../../core/saved-errors/ports/BroadcastFeedbacksRepository";
import { CustomTimeGateway } from "../../../core/time-gateway/adapters/CustomTimeGateway";
import { InMemoryUowPerformer } from "../../../core/unit-of-work/adapters/InMemoryUowPerformer";
import {
  InMemoryUnitOfWork,
  createInMemoryUow,
} from "../../../core/unit-of-work/adapters/createInMemoryUow";
import { InMemoryPoleEmploiGateway } from "../../adapters/pole-emploi-gateway/InMemoryPoleEmploiGateway";
import { BroadcastToFranceTravailOnConventionUpdates } from "./BroadcastToFranceTravailOnConventionUpdates";

describe("Broadcasts events to France Travail", () => {
  const peAgencyWithoutCounsellorsAndValidators = new AgencyDtoBuilder()
    .withId("some-pe-agency")
    .withKind("pole-emploi")
    .build();

  let poleEmploiGateWay: InMemoryPoleEmploiGateway;
  let uow: InMemoryUnitOfWork;
  let timeGateway: CustomTimeGateway;
  let broadcastToFranceTravailOnConventionUpdates: BroadcastToFranceTravailOnConventionUpdates;

  const agencySIAE = toAgencyWithRights(
    new AgencyDtoBuilder(peAgencyWithoutCounsellorsAndValidators)
      .withKind("structure-IAE")
      .build(),
  );

  const conventionLinkedToSIAE = new ConventionDtoBuilder()
    .withId("11110000-0000-4000-0000-000000000001")
    .withAgencyId(agencySIAE.id)
    .build();

  const conventionLinkedToFTWithoutFederatedIdentity =
    new ConventionDtoBuilder()
      .withId("00000000-0000-4000-0000-000000000000")
      .withAgencyId(peAgencyWithoutCounsellorsAndValidators.id)
      .withoutFederatedIdentity()
      .build();

  beforeEach(() => {
    uow = createInMemoryUow();
    poleEmploiGateWay = new InMemoryPoleEmploiGateway();
    timeGateway = new CustomTimeGateway();
    broadcastToFranceTravailOnConventionUpdates =
      new BroadcastToFranceTravailOnConventionUpdates(
        new InMemoryUowPerformer(uow),
        poleEmploiGateWay,
        timeGateway,
        { resyncMode: false },
      );
    uow.agencyRepository.agencies = [
      toAgencyWithRights(peAgencyWithoutCounsellorsAndValidators),
    ];
  });

  it("Skips convention if not linked to an agency of kind pole-emploi nor agencyRefersTo of kind pole-emploi", async () => {
    uow.agencyRepository.agencies = [agencySIAE];

    await broadcastToFranceTravailOnConventionUpdates.execute({
      convention: conventionLinkedToSIAE,
    });

    expect(poleEmploiGateWay.notifications).toHaveLength(0);
  });

  it("Conventions without federated id are still sent, with their externalId", async () => {
    const externalId = "00000000001";
    uow.conventionExternalIdRepository.externalIdsByConventionId = {
      [conventionLinkedToFTWithoutFederatedIdentity.id]: externalId,
    };

    await broadcastToFranceTravailOnConventionUpdates.execute({
      convention: conventionLinkedToFTWithoutFederatedIdentity,
    });

    // Assert
    expect(poleEmploiGateWay.notifications).toHaveLength(1);
    expectObjectsToMatch(poleEmploiGateWay.notifications[0], {
      originalId: conventionLinkedToFTWithoutFederatedIdentity.id,
      id: externalId,
    });
  });

  it("If Pe returns a 404 error, we store the error in a repo", async () => {
    poleEmploiGateWay.setNextResponse({
      status: 404,
      subscriberErrorFeedback: { message: "Ops, something is bad" },
      body: "not found",
    });
    const now = new Date();
    timeGateway.setNextDate(now);

    // Act
    await broadcastToFranceTravailOnConventionUpdates.execute({
      convention: conventionLinkedToFTWithoutFederatedIdentity,
    });

    // Assert
    expect(poleEmploiGateWay.notifications).toHaveLength(1);
    expectToEqual(uow.broadcastFeedbacksRepository.broadcastFeedbacks, [
      {
        consumerId: null,
        consumerName: "France Travail",
        serviceName: broadcastToPeServiceName,
        requestParams: {
          conventionId: conventionLinkedToFTWithoutFederatedIdentity.id,
          conventionStatus: conventionLinkedToFTWithoutFederatedIdentity.status,
        },
        response: { httpStatus: 404, body: "not found" },
        subscriberErrorFeedback: {
          message: "Ops, something is bad",
        },
        occurredAt: now,
        handledByAgency: false,
      },
    ]);
  });

  it("store the broadcast feetback success in a repo", async () => {
    poleEmploiGateWay.setNextResponse({
      status: 200,
      body: { success: true },
    });
    const now = new Date();
    timeGateway.setNextDate(now);

    // Act
    await broadcastToFranceTravailOnConventionUpdates.execute({
      convention: conventionLinkedToFTWithoutFederatedIdentity,
    });

    // Assert
    expectToEqual(uow.broadcastFeedbacksRepository.broadcastFeedbacks, [
      {
        consumerId: null,
        consumerName: "France Travail",
        serviceName: broadcastToPeServiceName,
        requestParams: {
          conventionId: conventionLinkedToFTWithoutFederatedIdentity.id,
          conventionStatus: conventionLinkedToFTWithoutFederatedIdentity.status,
        },
        response: {
          httpStatus: 200,
          body: {
            success: true,
          },
        },
        occurredAt: now,
        handledByAgency: false,
      },
    ]);
  });

  it("Converts and sends conventions, with externalId and federated id", async () => {
    // Prepare
    const immersionConventionId: ConventionId =
      "00000000-0000-0000-0000-000000000000";

    const externalId = "00000000001";
    uow.conventionExternalIdRepository.externalIdsByConventionId = {
      [immersionConventionId]: externalId,
    };

    const convention = new ConventionDtoBuilder()
      .withId(immersionConventionId)
      .withAgencyId(peAgencyWithoutCounsellorsAndValidators.id)
      .withImmersionAppellation({
        appellationCode: "11111",
        appellationLabel: "some Appellation",
        romeCode: "A1111",
        romeLabel: "some Rome",
      })
      .withBeneficiaryBirthdate("2000-10-05")
      .withStatus("ACCEPTED_BY_VALIDATOR")
      .withFederatedIdentity({ provider: "peConnect", token: "some-id" })
      .withDateStart("2021-05-12")
      .withDateEnd("2021-05-14T00:30:00.000Z") //
      .withSchedule(reasonableSchedule)
      .withImmersionObjective("Initier une démarche de recrutement")
      .build();

    // Act
    await broadcastToFranceTravailOnConventionUpdates.execute({ convention });

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
      dateNaissance: "2000-10-05T00:00:00.000Z",
      statut: "DEMANDE_VALIDÉE",
      codeAppellation: "011111",
    });
  });

  it("if an axios error happens", async () => {
    const convention = new ConventionDtoBuilder()
      .withStatus("DEPRECATED")
      .withAgencyId(peAgencyWithoutCounsellorsAndValidators.id)
      .withoutFederatedIdentity()
      .build();

    await expectPromiseToFailWithError(
      broadcastToFranceTravailOnConventionUpdates.execute({ convention }),
      new Error("fake axios error"),
    );
  });

  it("broadcast to pole-emploi when convention is from an agency RefersTo", async () => {
    // Prepare

    const agencyWithRefersTo = toAgencyWithRights(
      new AgencyDtoBuilder(peAgencyWithoutCounsellorsAndValidators)
        .withId("635354435345435")
        .withKind("autre")
        .withRefersToAgencyInfo({
          refersToAgencyId: peAgencyWithoutCounsellorsAndValidators.id,
          refersToAgencyName: peAgencyWithoutCounsellorsAndValidators.name,
        })
        .build(),
    );

    const conventionLinkedToAgencyReferingToOther = new ConventionDtoBuilder()
      .withId("22222222-2222-4000-2222-222222222222")
      .withAgencyId(agencyWithRefersTo.id)
      .withImmersionAppellation({
        appellationCode: "11111",
        appellationLabel: "some Appellation",
        romeCode: "A1111",
        romeLabel: "some Rome",
      })
      .withBeneficiaryBirthdate("2000-10-05")
      .withStatus("ACCEPTED_BY_VALIDATOR")
      .withDateStart("2021-05-12")
      .withDateEnd("2021-05-14T00:30:00.000Z") //
      .withSchedule(reasonableSchedule)
      .withImmersionObjective("Initier une démarche de recrutement")
      .build();

    uow.agencyRepository.agencies = [
      toAgencyWithRights(peAgencyWithoutCounsellorsAndValidators),
      agencyWithRefersTo,
    ];

    const externalId = "00000000001";
    uow.conventionExternalIdRepository.externalIdsByConventionId = {
      [conventionLinkedToAgencyReferingToOther.id]: externalId,
    };

    await broadcastToFranceTravailOnConventionUpdates.execute({
      convention: conventionLinkedToAgencyReferingToOther,
    });

    // Assert
    expect(poleEmploiGateWay.notifications).toHaveLength(1);
    expectObjectsToMatch(poleEmploiGateWay.notifications[0], {
      id: externalId,
      originalId: conventionLinkedToAgencyReferingToOther.id,
      objectifDeImmersion: 3,
      dureeImmersion: 21,
      dateDebut: "2021-05-12T00:00:00.000Z",
      dateFin: "2021-05-14T00:30:00.000Z",
      dateNaissance: "2000-10-05T00:00:00.000Z",
      statut: "DEMANDE_VALIDÉE",
      codeAppellation: "011111",
    });
  });
});
