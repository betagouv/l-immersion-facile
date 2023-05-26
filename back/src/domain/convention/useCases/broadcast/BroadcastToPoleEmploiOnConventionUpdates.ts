import { z } from "zod";
import {
  calculateTotalImmersionHoursBetweenDate,
  ConventionDto,
  ImmersionObjective,
} from "shared";
import {
  UnitOfWork,
  UnitOfWorkPerformer,
} from "../../../core/ports/UnitOfWork";
import { TransactionalUseCase } from "../../../core/UseCase";
import {
  conventionStatusToPoleEmploiStatus,
  PoleEmploiConvention,
  PoleEmploiGateway,
} from "../../ports/PoleEmploiGateway";

const conventionObjectiveToObjectifDeImmersion: Record<
  ImmersionObjective,
  1 | 2 | 3
> = {
  "Découvrir un métier ou un secteur d'activité": 1,
  "Confirmer un projet professionnel": 2,
  "Initier une démarche de recrutement": 3,
};

export class BroadcastToPoleEmploiOnConventionUpdates extends TransactionalUseCase<
  ConventionDto,
  void
> {
  inputSchema: z.Schema<ConventionDto> = z.any(); // No need of a validation schema here since this use-case is only called from the our domain

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    private poleEmploiGateway: PoleEmploiGateway,
  ) {
    super(uowPerformer);
  }
  //
  public async _execute(
    convention: ConventionDto,
    uow: UnitOfWork,
  ): Promise<void> {
    const { enablePeConventionBroadcast } =
      await uow.featureFlagRepository.getAll();
    const { beneficiary, establishmentRepresentative } = convention.signatories;

    if (!enablePeConventionBroadcast) return;
    if (!beneficiary.federatedIdentity) return;

    const totalHours = calculateTotalImmersionHoursBetweenDate({
      schedule: convention.schedule,
      dateStart: convention.dateStart,
      dateEnd: convention.dateEnd,
    });

    const poleEmploiConvention: PoleEmploiConvention = {
      id: convention.externalId
        ? convention.externalId.padStart(11, "0")
        : "no-external-id",
      originalId: convention.id,
      peConnectId: beneficiary.federatedIdentity.token,
      statut: conventionStatusToPoleEmploiStatus[convention.status],
      email: beneficiary.email,
      telephone: beneficiary.phone,
      prenom: beneficiary.firstName,
      nom: beneficiary.lastName,
      dateNaissance: new Date(
        convention.signatories.beneficiary.birthdate,
      ).toISOString(),
      dateDemande: new Date(convention.dateSubmission).toISOString(),
      dateDebut: new Date(convention.dateStart).toISOString(),
      dateFin: new Date(convention.dateEnd).toISOString(),
      dureeImmersion: totalHours,
      raisonSociale: convention.businessName,
      siret: convention.siret,
      nomPrenomFonctionTuteur: `${convention.establishmentTutor.firstName} ${convention.establishmentTutor.lastName} ${convention.establishmentTutor.job}`,
      telephoneTuteur: convention.establishmentTutor.phone,
      emailTuteur: convention.establishmentTutor.email,
      adresseImmersion: convention.immersionAddress,
      protectionIndividuelle: convention.individualProtection,
      preventionSanitaire: convention.sanitaryPrevention,
      descriptionPreventionSanitaire: convention.sanitaryPreventionDescription,
      objectifDeImmersion:
        conventionObjectiveToObjectifDeImmersion[convention.immersionObjective],
      codeRome: convention.immersionAppellation.romeCode,
      codeAppellation: convention.immersionAppellation.appellationCode.padStart(
        6,
        "0",
      ),
      activitesObservees: convention.immersionActivities,
      competencesObservees: convention.immersionSkills,
      signatureBeneficiaire: !!beneficiary.signedAt,
      signatureEntreprise: !!establishmentRepresentative.signedAt,

      descriptionProtectionIndividuelle: "",
    };

    await this.poleEmploiGateway.notifyOnConventionUpdated(
      poleEmploiConvention,
    );
  }
}
