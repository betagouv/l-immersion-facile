import { parseISO } from "date-fns";
import {
  AgencyDto,
  ConventionDto,
  conventionSchema,
  displayEmergencyContactInfos,
  frontRoutes,
} from "shared";
import { AppConfig } from "../../../../adapters/primary/config/appConfig";
import { GenerateConventionMagicLinkUrl } from "../../../../adapters/primary/config/magicLinkUrl";
import { NotFoundError } from "../../../../adapters/primary/helpers/httpErrors";
import { ShortLinkIdGeneratorGateway } from "../../../core/ports/ShortLinkIdGeneratorGateway";
import { TimeGateway } from "../../../core/ports/TimeGateway";
import {
  UnitOfWork,
  UnitOfWorkPerformer,
} from "../../../core/ports/UnitOfWork";
import { prepareMagicShortLinkMaker } from "../../../core/ShortLink";
import { TransactionalUseCase } from "../../../core/UseCase";
import { ConventionPoleEmploiUserAdvisorEntity } from "../../../peConnect/dto/PeConnect.dto";
import { EmailGateway } from "../../ports/EmailGateway";

export class NotifyAllActorsOfFinalConventionValidation extends TransactionalUseCase<ConventionDto> {
  constructor(
    uowPerformer: UnitOfWorkPerformer,
    private readonly emailGateway: EmailGateway,
    private readonly generateConventionMagicLinkUrl: GenerateConventionMagicLinkUrl,
    private readonly timeGateway: TimeGateway,
    private readonly shortLinkIdGeneratorGateway: ShortLinkIdGeneratorGateway,
    private readonly config: AppConfig,
  ) {
    super(uowPerformer);
  }

  inputSchema = conventionSchema;

  public async _execute(
    convention: ConventionDto,
    uow: UnitOfWork,
  ): Promise<void> {
    const [agency] = await uow.agencyRepository.getByIds([convention.agencyId]);

    if (!agency)
      throw new NotFoundError(
        `Unable to send mail. No agency config found for ${convention.agencyId}`,
      );
    await this.emailGateway.sendEmail({
      type: "VALIDATED_CONVENTION_FINAL_CONFIRMATION",
      recipients: [
        ...Object.values(convention.signatories).map(
          (signatory) => signatory.email,
        ),
        ...agency.counsellorEmails,
        ...agency.validatorEmails,
        ...getPeAdvisorEmailIfExist(
          await uow.conventionPoleEmploiAdvisorRepository.getByConventionId(
            convention.id,
          ),
        ),
        ...(convention.signatories.establishmentRepresentative.email !==
        convention.establishmentTutor.email
          ? [convention.establishmentTutor.email]
          : []),
      ],
      params: await this.getValidatedConventionFinalConfirmationParams(
        agency,
        convention,
        uow,
      ),
    });
  }
  private async getValidatedConventionFinalConfirmationParams(
    agency: AgencyDto,
    convention: ConventionDto,
    uow: UnitOfWork,
  ) {
    const { beneficiary, beneficiaryRepresentative } = convention.signatories;

    const makeMagicShortLink = prepareMagicShortLinkMaker({
      conventionMagicLinkPayload: {
        id: convention.id,
        // role and email should not be valid
        role: beneficiary.role,
        email: beneficiary.email,
        now: this.timeGateway.now(),
        exp: this.timeGateway.now().getTime() + 1000 * 60 * 60 * 24 * 365, // 1 year
      },
      uow,
      config: this.config,
      generateConventionMagicLinkUrl: this.generateConventionMagicLinkUrl,
      shortLinkIdGeneratorGateway: this.shortLinkIdGeneratorGateway,
    });

    return {
      internshipKind: convention.internshipKind,

      beneficiaryFirstName: beneficiary.firstName,
      beneficiaryLastName: beneficiary.lastName,
      beneficiaryBirthdate: beneficiary.birthdate,

      dateStart: parseISO(convention.dateStart).toLocaleDateString("fr"),
      dateEnd: parseISO(convention.dateEnd).toLocaleDateString("fr"),
      establishmentTutorName: `${convention.establishmentTutor.firstName} ${convention.establishmentTutor.lastName}`,
      businessName: convention.businessName,
      immersionAppellationLabel:
        convention.immersionAppellation.appellationLabel,

      emergencyContactInfos: displayEmergencyContactInfos({
        beneficiaryRepresentative,
        beneficiary,
      }),
      agencyLogoUrl: agency.logoUrl,
      magicLink: await makeMagicShortLink(frontRoutes.conventionDocument),
    };
  }
}

const getPeAdvisorEmailIfExist = (
  conventionPeUserAdvisor: ConventionPoleEmploiUserAdvisorEntity | undefined,
): [string] | [] =>
  conventionPeUserAdvisor?.advisor?.email
    ? [conventionPeUserAdvisor.advisor.email]
    : [];
