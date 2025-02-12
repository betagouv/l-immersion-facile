import { AbsoluteUrl } from "../AbsoluteUrl";
import {
  AssessmentDtoCompleted,
  AssessmentDtoPartiallyCompleted,
} from "../assessment/assessment.dto";
import {
  ConventionId,
  ImmersionObjective,
  InternshipKind,
  Renewed,
} from "../convention/convention.dto";
import { AgencyRole } from "../inclusionConnectedAllowed/inclusionConnectedAllowed.dto";
import { AppellationLabel } from "../romeAndAppellationDtos/romeAndAppellation.dto";
import { SiretDto } from "../siret/siret";
import { DateString } from "../utils/date";
import { Email } from "./email.dto";

export type UserParamsForMail = {
  agencyName: string;
  isNotifiedByEmail: boolean;
  roles: AgencyRole[];
  firstName: string;
  lastName: string;
  email: Email;
};

export type EmailParamsByEmailType = {
  AGENCY_FIRST_REMINDER: {
    agencyMagicLinkUrl: string;
    agencyName: string;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    conventionId: ConventionId;
    businessName: string;
    dateStart: string;
    dateEnd: string;
  };
  AGENCY_LAST_REMINDER: {
    agencyMagicLinkUrl: string;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionId: ConventionId;
  };
  AGENCY_OF_TYPE_OTHER_ADDED: {
    agencyName: string;
    agencyLogoUrl: AbsoluteUrl | undefined;
  };
  AGENCY_WAS_ACTIVATED: {
    agencyName: string;
    agencyLogoUrl: AbsoluteUrl | undefined;
    users: UserParamsForMail[];
    agencyReferdToName: string | undefined;
    refersToOtherAgency: boolean;
  };
  AGENCY_DELEGATION_CONTACT_INFORMATION: {
    firstName: string;
    lastName: string;
    agencyName: string;
    agencyProvince: string;
    delegationProviderMail: string;
  };
  AGENCY_WITH_REFERS_TO_ACTIVATED: {
    nameOfAgencyRefering: string;
    refersToAgencyName: string;
    agencyLogoUrl: AbsoluteUrl | undefined;
    validatorEmails: string[];
  };
  AGENCY_WAS_REJECTED: {
    agencyName: string;
    rejectionJustification: string;
  };
  ASSESSMENT_AGENCY_NOTIFICATION: {
    agencyLogoUrl: AbsoluteUrl | undefined;
    assessmentCreationLink: string;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionId: ConventionId;
    internshipKind: InternshipKind;
  };
  ASSESSMENT_AGENCY_FIRST_REMINDER: {
    assessmentCreationLink: string;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionId: ConventionId;
    establishmentContactEmail: Email;
    internshipKind: InternshipKind;
  };
  ASSESSMENT_AGENCY_SECOND_REMINDER: {
    assessmentCreationLink: string;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionId: ConventionId;
    establishmentContactEmail: Email;
    internshipKind: InternshipKind;
  };
  ASSESSMENT_BENEFICIARY_NOTIFICATION: {
    conventionId: ConventionId;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    internshipKind: InternshipKind;
  };
  ASSESSMENT_ESTABLISHMENT_NOTIFICATION: {
    agencyLogoUrl: AbsoluteUrl | undefined;
    assessmentCreationLink: string;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    conventionId: ConventionId;
    establishmentTutorName: string;
    internshipKind: InternshipKind;
  };
  ASSESSMENT_CREATED_WITH_STATUS_COMPLETED_AGENCY_NOTIFICATION: {
    immersionObjective: ImmersionObjective | undefined;
    conventionId: ConventionId;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionDateEnd: DateString;
    internshipKind: InternshipKind;
    assessment: AssessmentDtoCompleted | AssessmentDtoPartiallyCompleted;
    immersionAppellationLabel: string;
    numberOfHoursMade: string;
  };
  ASSESSMENT_CREATED_WITH_STATUS_DID_NOT_SHOW_AGENCY_NOTIFICATION: {
    immersionObjective: ImmersionObjective | undefined;
    conventionId: ConventionId;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    internshipKind: InternshipKind;
    immersionAppellationLabel: string;
  };
  ASSESSMENT_CREATED_BENEFICIARY_NOTIFICATION: {
    internshipKind: InternshipKind;
    conventionId: ConventionId;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    magicLink: string;
  };
  BENEFICIARY_OR_ESTABLISHMENT_REPRESENTATIVE_ALREADY_SIGNED_NOTIFICATION: {
    agencyLogoUrl: AbsoluteUrl | undefined;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionId: ConventionId;
    conventionStatusLink: string;
    establishmentRepresentativeName: string;
    existingSignatureName: string;
    immersionProfession: string;
    internshipKind: InternshipKind;
    magicLink: string;
  };
  CANCELLED_CONVENTION_NOTIFICATION: {
    agencyName: string;
    agencyLogoUrl: AbsoluteUrl | undefined;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionId: ConventionId;
    immersionProfession: string;
    internshipKind: InternshipKind;
    signature: string;
    dateEnd: string;
    dateStart: string;
    justification: string;
  };
  CONTACT_BY_EMAIL_REQUEST: {
    businessName: string;
    businessAddress: string;
    contactFirstName: string;
    contactLastName: string;
    appellationLabel: string;
    immersionObjective: ImmersionObjective | undefined;
    replyToEmail: Email;
    potentialBeneficiaryResumeLink?: string;
    potentialBeneficiaryFirstName: string;
    potentialBeneficiaryLastName: string;
    potentialBeneficiaryPhone: string;
    potentialBeneficiaryDatePreferences?: string;
    potentialBeneficiaryHasWorkingExperience?: boolean;
    potentialBeneficiaryExperienceAdditionalInformation?: string;
    domain: string;
    discussionId: string;
  };
  CONTACT_BY_EMAIL_REQUEST_LEGACY: {
    businessName: string;
    businessAddress: string;
    contactFirstName: string;
    contactLastName: string;
    appellationLabel: string;
    potentialBeneficiaryFirstName: string;
    potentialBeneficiaryLastName: string;
    potentialBeneficiaryPhone: string;
    immersionObjective: ImmersionObjective | undefined;
    potentialBeneficiaryResumeLink?: string;
    message: string;
    replyToEmail: Email;
  };
  CONTACT_BY_PHONE_INSTRUCTIONS: {
    businessName: string;
    contactFirstName: string;
    contactLastName: string;
    contactPhone: string;
    potentialBeneficiaryFirstName: string;
    potentialBeneficiaryLastName: string;
  };
  CONTACT_IN_PERSON_INSTRUCTIONS: {
    businessName: string;
    contactFirstName: string;
    contactLastName: string;
    businessAddress: string;
    potentialBeneficiaryFirstName: string;
    potentialBeneficiaryLastName: string;
  };
  CONVENTION_MODIFICATION_REQUEST_NOTIFICATION: {
    agencyLogoUrl: AbsoluteUrl | undefined;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionId: ConventionId;
    conventionStatusLink: string;
    internshipKind: InternshipKind;
    justification: string;
    magicLink: string;
    signature: string;
    requesterName: string;
  };

  ESTABLISHMENT_CONTACT_REQUEST_REMINDER: {
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    beneficiaryReplyToEmail: string;
    appellationLabel: AppellationLabel;
    domain: string;
    mode: "3days" | "7days";
  };
  DEPRECATED_CONVENTION_NOTIFICATION: {
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionId: ConventionId;
    deprecationReason: string;
    dateEnd: string;
    dateStart: string;
    immersionProfession: string;
    internshipKind: InternshipKind;
  };
  DISCUSSION_EXCHANGE: {
    subject: string;
    htmlContent: string;
  };
  EDIT_FORM_ESTABLISHMENT_LINK: {
    editFrontUrl: string;
    businessName: string;
    businessAddresses: string[];
  };
  ESTABLISHMENT_DELETED: {
    businessName: string;
    siret: SiretDto;
    businessAddresses: string[];
  };
  ESTABLISHMENT_LEAD_REMINDER: {
    businessName: string;
    registerEstablishmentShortLink: string;
    unsubscribeToEmailShortLink: string;
  };
  FULL_PREVIEW_EMAIL: {
    agencyLogoUrl: AbsoluteUrl | undefined;
    beneficiaryName: string;
    conventionId: ConventionId;
    conventionStatusLink: string;
    internshipKind: InternshipKind;
  };
  IC_USER_RIGHTS_HAS_CHANGED: UserParamsForMail;
  IC_USER_REGISTRATION_TO_AGENCY_REJECTED: {
    agencyName: string;
    justification: string;
  };
  MAGIC_LINK_RENEWAL: {
    conventionId: ConventionId | undefined;
    conventionStatusLink: string;
    internshipKind: InternshipKind;
    magicLink: string;
  };
  NEW_CONVENTION_AGENCY_NOTIFICATION: {
    agencyLogoUrl: AbsoluteUrl | undefined;
    agencyName: string;
    businessName: string;
    conventionId: ConventionId;
    conventionStatusLink: string;
    dateEnd: string;
    dateStart: string;
    internshipKind: InternshipKind;
    firstName: string;
    lastName: string;
    magicLink: AbsoluteUrl;
    warning?: string;
  };
  NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE: {
    agencyLogoUrl: AbsoluteUrl | undefined;
    beneficiaryName: string;
    beneficiaryRepresentativeName?: string;
    beneficiaryCurrentEmployerName?: string;
    businessName: string;
    conventionId: ConventionId;
    conventionStatusLink: string;
    establishmentRepresentativeName: string;
    establishmentTutorName: string;
    internshipKind: InternshipKind;
    conventionSignShortlink: string;
    signatoryName: string;
    renewed?: Renewed;
  };
  NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE_AFTER_MODIFICATION: {
    agencyLogoUrl: AbsoluteUrl | undefined;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionId: ConventionId;
    conventionSignShortlink: AbsoluteUrl;
    internshipKind: InternshipKind;
    justification: string;
    signatoryFirstName: string;
    signatoryLastName: string;
  };
  NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION: {
    agencyLogoUrl: AbsoluteUrl | undefined;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionId: ConventionId;
    conventionStatusLink: string;
    internshipKind: InternshipKind;
    magicLink: string;
    possibleRoleAction: string;
    validatorName: string;
    peAdvisor:
      | {
          recipientIsPeAdvisor: boolean;
          firstName: string;
          lastName: string;
          email: string;
        }
      | undefined;
  };
  NEW_ESTABLISHMENT_CREATED_CONTACT_CONFIRMATION: {
    contactFirstName: string;
    contactLastName: string;
    businessName: string;
    businessAddresses: string[];
  };
  POLE_EMPLOI_ADVISOR_ON_CONVENTION_ASSOCIATION: {
    advisorFirstName: string;
    advisorLastName: string;
    agencyLogoUrl: AbsoluteUrl | undefined;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    beneficiaryEmail: string;
    businessName: string;
    conventionId: ConventionId;
    dateEnd: string;
    dateStart: string;
    immersionAddress: string;
    magicLink: string;
  };
  POLE_EMPLOI_ADVISOR_ON_CONVENTION_FULLY_SIGNED: {
    advisorFirstName: string;
    advisorLastName: string;
    agencyLogoUrl: AbsoluteUrl | undefined;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    beneficiaryEmail: string;
    businessName: string;
    conventionId: ConventionId;
    dateEnd: string;
    dateStart: string;
    immersionAddress: string;
    magicLink: string;
  };
  REJECTED_CONVENTION_NOTIFICATION: {
    agencyName: string;
    agencyLogoUrl: AbsoluteUrl | undefined;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionId: ConventionId;
    immersionProfession: string;
    internshipKind: InternshipKind;
    rejectionReason: string;
    signature: string;
  };
  SHARE_DRAFT_CONVENTION_BY_LINK: {
    internshipKind: InternshipKind;
    additionalDetails: string;
    conventionFormUrl: string;
  };
  SIGNATORY_FIRST_REMINDER: {
    actorFirstName: string;
    actorLastName: string;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionId: ConventionId;
    magicLinkUrl: AbsoluteUrl | undefined;
    signatoriesSummary: string;
  };
  SIGNATORY_LAST_REMINDER: {
    actorFirstName: string;
    actorLastName: string;
    businessName: string;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    conventionId: ConventionId;
    magicLinkUrl: AbsoluteUrl | undefined;
    signatoriesSummary: string;
  };
  SIGNEE_HAS_SIGNED_CONVENTION: {
    agencyLogoUrl: AbsoluteUrl | undefined;
    conventionId: ConventionId;
    conventionStatusLink: AbsoluteUrl;
    internshipKind: InternshipKind;
    signedAt: string;
    agencyName: string;
  };
  SUGGEST_EDIT_FORM_ESTABLISHMENT: {
    editFrontUrl: string;
    businessName: string;
    businessAddresses: string[];
  };
  VALIDATED_CONVENTION_FINAL_CONFIRMATION: {
    agencyAssessmentDocumentLink: string | undefined;
    agencyLogoUrl: AbsoluteUrl | undefined;
    beneficiaryBirthdate: string;
    beneficiaryFirstName: string;
    beneficiaryLastName: string;
    businessName: string;
    conventionId: ConventionId;
    dateStart: string;
    dateEnd: string;
    emergencyContactInfos: string;
    establishmentTutorName: string;
    immersionAppellationLabel: string;
    internshipKind: InternshipKind;
    magicLink: string;
    validatorName: string;
  };
  TEST_EMAIL: {
    input1: string;
    input2: string;
    url: AbsoluteUrl;
  };
};
