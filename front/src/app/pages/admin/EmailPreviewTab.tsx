import { fr } from "@codegouvfr/react-dsfr";
import { Select } from "@codegouvfr/react-dsfr/SelectNext";
import { configureGenerateHtmlFromTemplate } from "html-templates";
import {
  cciCustomHtmlFooter,
  cciCustomHtmlHeader,
} from "html-templates/src/components/email";
import { keys } from "ramda";
import React, { useState } from "react";
import { ImmersionTextField } from "react-design-system";
import {
  type EmailTemplatesByName,
  addressDtoToString,
  domElementIds,
  emailTemplatesByName,
  internshipKinds,
} from "shared";
import { useStyles } from "tss-react/dsfr";

const defaultEmailPreviewUrl =
  "https://upload.wikimedia.org/wikipedia/en/9/9a/Trollface_non-free.png";

type TemplateName = keyof EmailTemplatesByName;

export const EmailPreviewTab = () => {
  const { cx } = useStyles();

  const [currentTemplate, setCurrentTemplate] = useState<TemplateName>(
    "AGENCY_WAS_ACTIVATED",
  );

  const [emailVariables, setEmailVariables] = useState(
    defaultEmailValueByEmailKind[currentTemplate],
  );

  const fakeContent = configureGenerateHtmlFromTemplate(
    emailTemplatesByName,
    "internshipKind" in emailVariables &&
      emailVariables.internshipKind === "mini-stage-cci"
      ? {
          header: cciCustomHtmlHeader,
          footer: cciCustomHtmlFooter,
        }
      : { footer: undefined, header: undefined },
  )(currentTemplate, emailVariables, {
    skipHead: true,
  });

  const onTemplateChange = (templateName: TemplateName) => {
    setCurrentTemplate(templateName);
    setEmailVariables(defaultEmailValueByEmailKind[templateName]);
  };

  return (
    <div className={cx("admin-tab__email-preview")}>
      <h5 className={fr.cx("fr-h5", "fr-mb-2w")}>Aperçu de template email</h5>
      <div>
        <div className={fr.cx("fr-grid-row", "fr-grid-row--gutters")}>
          <aside className={fr.cx("fr-col-12", "fr-col-lg-4")}>
            <Select
              label="Liste de templates email :"
              placeholder="Veuillez sélectionner un template email"
              options={keys(emailTemplatesByName).map((templateName) => ({
                label: emailTemplatesByName[templateName].niceName,
                value: templateName,
              }))}
              nativeSelectProps={{
                id: domElementIds.admin.emailPreviewTab.emailTemplateNameSelect,
                name: "templateName",
                onChange: (event) =>
                  onTemplateChange(event.currentTarget.value),
              }}
            />

            <h6>Métadonnées</h6>
            <ul className={fr.cx("fr-badge-group")}>
              <li>
                <span className={fr.cx("fr-badge", "fr-badge--green-menthe")}>
                  Sujet
                </span>
              </li>
              <li>{fakeContent.subject}</li>
            </ul>
            {fakeContent.tags && fakeContent.tags.length > -1 && (
              <ul className={fr.cx("fr-badge-group", "fr-mt-2w")}>
                <li>
                  <span className={fr.cx("fr-badge", "fr-badge--blue-ecume")}>
                    Tags
                  </span>
                </li>
                <li>{fakeContent.tags.join(", ")}</li>
              </ul>
            )}

            <h6 className={fr.cx("fr-mt-4w")}>Données de prévisualisation</h6>
            <ul>
              {Object.keys(emailVariables)
                .sort()
                .map((variableName) => (
                  <li key={variableName}>
                    <EmailVariableField
                      variableName={variableName}
                      variableValue={
                        emailVariables[
                          variableName as keyof typeof emailVariables
                        ]
                      }
                      onChange={(value) =>
                        setEmailVariables({
                          ...emailVariables,
                          [variableName]: value,
                        })
                      }
                    />
                  </li>
                ))}
            </ul>
            <h6 className={fr.cx("fr-mt-4w")}>Pièces jointes</h6>
            {fakeContent.attachment ? (
              <ul>
                {fakeContent.attachment.map((att) => {
                  if ("url" in att) {
                    return (
                      <li key={att.url}>
                        <a target={"_blank"} href={att.url} rel="noreferrer">
                          {att.url}
                        </a>
                      </li>
                    );
                  }
                  return <li key={att.name}>{att.name}</li>;
                })}
              </ul>
            ) : (
              <p>Ce template de mail n'a pas de pièces jointes.</p>
            )}
          </aside>
          <section className={fr.cx("fr-col-12", "fr-col-lg-8")}>
            <div
              className={cx("admin-tab__email-preview-wrapper")}
              dangerouslySetInnerHTML={{ __html: fakeContent.htmlContent }}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

type EmailVariableFieldProps = {
  variableName: string;
  variableValue: any;
  onChange(value: any): void;
};
const EmailVariableField = ({
  variableName,
  variableValue,
  onChange,
}: EmailVariableFieldProps): JSX.Element => {
  if (variableName === "internshipKind")
    return (
      <Select
        label={variableName}
        options={internshipKinds.map((internshipKind) => ({
          label: internshipKind,
          value: internshipKind,
        }))}
        className={fr.cx("fr-mb-2w")}
        nativeSelectProps={{
          id: domElementIds.admin.emailPreviewTab.internshipKindSelect,
          name: variableName,
          onChange: (e) => onChange(e.target.value),
          value: variableValue,
        }}
      />
    );
  if (["string", "number", "undefined"].includes(typeof variableValue))
    return (
      <ImmersionTextField
        label={variableName}
        name={variableName}
        value={variableValue ?? ""}
        className={fr.cx("fr-mb-2w")}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  return (
    <div className={fr.cx("fr-input-group", "fr-mb-2w")}>
      <label className={fr.cx("fr-label")}>{variableName}</label>
      <pre className={fr.cx("fr-text--xs", "fr-m-auto")}>
        <code>{JSON.stringify(variableValue, null, 2)}</code>
      </pre>
    </div>
  );
};

export const defaultEmailValueByEmailKind: {
  [K in TemplateName]: Parameters<
    EmailTemplatesByName[K]["createEmailVariables"]
  >[0];
} = {
  TEST_EMAIL: {
    input1: "input1",
    input2: "input2",
    url: "https://immersion-facile.beta.gouv.fr",
  },
  AGENCY_WAS_REJECTED: {
    agencyName: "AGENCY_NAME",
    rejectionJustification: "REJECTION_JUSTIFICATION",
  },
  AGENCY_FIRST_REMINDER: {
    agencyMagicLinkUrl: "CONVENTION_VERIFICATION_LINK",
    agencyName: "AGENCY_NAME",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    dateStart: "DATE_START",
    dateEnd: "DATE_END",
  },
  AGENCY_LAST_REMINDER: {
    agencyMagicLinkUrl: "CONVENTION_VERIFICATION_LINK",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
  },
  AGENCY_WAS_ACTIVATED: {
    agencyName: "AGENCY_NAME",
    agencyLogoUrl: defaultEmailPreviewUrl,
    refersToOtherAgency: true,
    users: [
      {
        agencyName: "AGENCY_NAME",
        roles: ["counsellor"],
        isNotifiedByEmail: true,
        email: "USER_EMAIL",
        firstName: "USER_FIRST_NAME",
        lastName: "USER_LAST_NAME",
      },
      {
        agencyName: "AGENCY_NAME",
        roles: ["validator"],
        isNotifiedByEmail: true,
        email: "USER_EMAIL",
        firstName: "USER_FIRST_NAME",
        lastName: "USER_LAST_NAME",
      },
    ],
    agencyReferdToName: "AGENCY_REFERS_TO_NAME",
  },
  AGENCY_OF_TYPE_OTHER_ADDED: {
    agencyName: "AGENCY_NAME",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  AGENCY_WITH_REFERS_TO_ACTIVATED: {
    nameOfAgencyRefering: "ACCOMPANYING_AGENCY_NAME",
    refersToAgencyName: "REFERS_TO_AGENCY_NAME",
    agencyLogoUrl: defaultEmailPreviewUrl,
    validatorEmails: ["VALIDATOR_EMAIL1", "VALIDATOR_EMAIL2"],
  },
  AGENCY_DELEGATION_CONTACT_INFORMATION: {
    agencyName: "AGENCY_NAME",
    agencyProvince: "AGENCY_PROVINCE",
    delegationProviderMail: "DELEGATION_PROVIDER_EMAIL",
    firstName: "FIRST_NAME",
    lastName: "LAST_NAME",
  },
  ASSESSMENT_BENEFICIARY_NOTIFICATION: {
    conventionId: "CONVENTION_ID",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    internshipKind: "immersion",
  },
  ASSESSMENT_AGENCY_FIRST_REMINDER: {
    assessmentCreationLink: "ASSESSMENT_CREATION_LINK",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    establishmentContactEmail: "ESTABLISHMENT_CONTACT_EMAIL",
    internshipKind: "immersion",
  },
  ASSESSMENT_AGENCY_SECOND_REMINDER: {
    assessmentCreationLink: "ASSESSMENT_CREATION_LINK",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    establishmentContactEmail: "ESTABLISHMENT_CONTACT_EMAIL",
    internshipKind: "immersion",
  },
  ASSESSMENT_AGENCY_NOTIFICATION: {
    agencyLogoUrl: defaultEmailPreviewUrl,
    assessmentCreationLink: "ASSESSMENT_CREATION_LINK",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    internshipKind: "immersion",
  },
  ASSESSMENT_ESTABLISHMENT_NOTIFICATION: {
    agencyLogoUrl: defaultEmailPreviewUrl,
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    conventionId: "CONVENTION_ID",
    establishmentTutorName: "ESTABLISHMENT_TUTOR_NAME",
    assessmentCreationLink: "ASSESSMENT_CREATION_LINK",
    internshipKind: "immersion",
  },
  BENEFICIARY_OR_ESTABLISHMENT_REPRESENTATIVE_ALREADY_SIGNED_NOTIFICATION: {
    agencyLogoUrl: defaultEmailPreviewUrl,
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    establishmentRepresentativeName: "ESTABLISHMENT_REPRESENTATIVE_NAME",
    existingSignatureName: "EXISTING_SIGNATURE_NAME",
    immersionProfession: "IMMERSION_PROFESSION",
    internshipKind: "immersion",
    magicLink: "MAGIC_LINK",
  },
  CANCELLED_CONVENTION_NOTIFICATION: {
    agencyName: "AGENCY",
    agencyLogoUrl: defaultEmailPreviewUrl,
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    immersionProfession: "IMMERSION_PROFESSION",
    internshipKind: "immersion",
    signature: "SIGNATURE",
    dateStart: "DATE_START",
    dateEnd: "DATE_END",
    justification: "JUSTIFICATION",
  },
  CONTACT_BY_EMAIL_REQUEST_LEGACY: {
    replyToEmail: "REPLY_TO_EMAIL",
    appellationLabel: "APPELLATION_LABEL",
    businessName: "BUSINESS_NAME",
    contactFirstName: "CONTACT_FIRST_NAME",
    contactLastName: "CONTACT_LAST_NAME",
    immersionObjective: "Découvrir un métier ou un secteur d'activité",
    message: "MESSAGE",
    potentialBeneficiaryFirstName: "POTENTIAL_BENEFICIARY_FIRST_NAME",
    potentialBeneficiaryLastName: "POTENTIAL_BENEFICIARY_LAST_NAME",
    potentialBeneficiaryPhone: "POTENTIAL_BENEFICIARY_PHONE",
    potentialBeneficiaryResumeLink: "POTENTIAL_BENEFICIARY_CV_OR_LINKEDIN",
    businessAddress: "BUSINESS_ADDRESS",
  },
  CONTACT_BY_EMAIL_REQUEST: {
    replyToEmail: "REPLY_TO_EMAIL",
    appellationLabel: "APPELLATION_LABEL",
    businessName: "BUSINESS_NAME",
    contactFirstName: "CONTACT_FIRST_NAME",
    contactLastName: "CONTACT_LAST_NAME",
    immersionObjective: "Découvrir un métier ou un secteur d'activité",
    potentialBeneficiaryFirstName: "POTENTIAL_BENEFICIARY_FIRST_NAME",
    potentialBeneficiaryLastName: "POTENTIAL_BENEFICIARY_LAST_NAME",
    potentialBeneficiaryPhone: "POTENTIAL_BENEFICIARY_PHONE",
    potentialBeneficiaryResumeLink: "POTENTIAL_BENEFICIARY_CV_OR_LINKEDIN",
    businessAddress: "BUSINESS_ADDRESS",
    potentialBeneficiaryDatePreferences:
      "POTENTIAL_BENEFICIARY_DATE_PREFERENCES",
    potentialBeneficiaryExperienceAdditionalInformation:
      "POTENTIAL_BENEFICIARY_EXPERIENCE_ADDITIONAL_INFORMATION",
    potentialBeneficiaryHasWorkingExperience: true,
    domain: "immersion-facile.beta.gouv.fr",
    discussionId: "fake-discussion-id",
  },
  CONTACT_BY_PHONE_INSTRUCTIONS: {
    businessName: "BUSINESS_NAME",
    contactFirstName: "CONTACT_FIRST_NAME",
    contactLastName: "CONTACT_LAST_NAME",
    contactPhone: "CONTACT_PHONE",
    potentialBeneficiaryFirstName: "POTENTIAL_BENEFICIARY_FIRST_NAME",
    potentialBeneficiaryLastName: "POTENTIAL_BENEFICIARY_LAST_NAME",
  },
  CONTACT_IN_PERSON_INSTRUCTIONS: {
    businessName: "BUSINESS_NAME",
    contactFirstName: "CONTACT_FIRST_NAME",
    contactLastName: "CONTACT_LAST_NAME",
    businessAddress: "BUSINESS_ADDRESS",
    potentialBeneficiaryFirstName: "POTENTIAL_BENEFICIARY_FIRST_NAME",
    potentialBeneficiaryLastName: "POTENTIAL_BENEFICIARY_LAST_NAME",
  },
  CONVENTION_MODIFICATION_REQUEST_NOTIFICATION: {
    agencyLogoUrl: defaultEmailPreviewUrl,
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    conventionId: "CONVENTION_ID",
    justification: "REASON",
    internshipKind: "immersion",
    magicLink: "MAGIC_LINK",
    signature: "SIGNATURE",
    requesterName: "REQUESTER_FIRST_NAME REQUESTER_LAST_NAME",
  },
  DEPRECATED_CONVENTION_NOTIFICATION: {
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    dateStart: "DATE_START",
    dateEnd: "DATE_END",
    deprecationReason: "DEPRECATION_REASON",
    immersionProfession: "IMMERSION_PROFESSION",
    internshipKind: "immersion",
  },
  DISCUSSION_EXCHANGE: {
    subject: "SUBJECT",
    htmlContent:
      '<div dir="ltr"><br><br><div class="gmail_quote"><div dir="ltr" class="gmail_attr">Pour rappel, voici les informations liées à cette mise en relation :<br/><ul><li>Candidat : yolo lala</li><li>Métier : Boucher-charcutier / Bouchère-charcutière</li><li>Entreprise : France Merguez Distribution - 30 avenue des champs Elysées 75017 Paris</li></ul><br/> ---------- Forwarded message ---------<br>De : <b class="gmail_sendername" dir="auto">Enguerran Weiss</b> <span dir="auto">&lt;<a href="mailto:enguerranweiss@gmail.com">enguerranweiss@gmail.com</a>&gt;</span><br>Date: mer. 28 juin 2023 à 09:57<br>Subject: Fwd: Hey !<br>To: &lt;<a href="mailto:tristan@reply-dev.immersion-facile.beta.gouv.fr">tristan@reply-dev.immersion-facile.beta.gouv.fr</a>&gt;<br></div><br><br><div dir="ltr"><br><br><div class="gmail_quote"><div dir="ltr" class="gmail_attr">---------- Forwarded message ---------<br>De : <b class="gmail_sendername" dir="auto">Enguerran Weiss</b> <span dir="auto">&lt;<a href="mailto:enguerranweiss@gmail.com" target="_blank">enguerranweiss@gmail.com</a>&gt;</span><br>Date: mer. 28 juin 2023 à 09:55<br>Subject: Hey !<br>To: &lt;<a href="mailto:roger@reply-dev.immersion-facile.gouv.fr" target="_blank">roger@reply-dev.immersion-facile.gouv.fr</a>&gt;<br></div><br><br><div dir="ltr"><div><br clear="all"></div><div>Comment ça va ?</div><div><br></div><div><img src="cid:ii_ljff7lfo0" alt="IMG_20230617_151239.jpg" style="margin-right:0px" width="223" height="167"></div><div><br></div><div><br></div><div>A + !<br></div><div><br></div><div><span class="gmail_signature_prefix">-- </span><br><div dir="ltr" class="gmail_signature" data-smartmail="gmail_signature"><div dir="ltr"><div><div dir="ltr"><span style="color:rgb(0,0,0);font-family:Times;font-size:medium"><img src="http://goodies.enguerranweiss.fr/id/sign_html-v2-bl.png"></span><p style="font-family:Georgia,serif;font-style:italic;font-size:11px;color:rgb(102,102,102)"></p><p style="font-family:Georgia,serif;font-size:11px;color:rgb(102,102,102)">+33(0)6 10 13 76 84 <br><a href="mailto:hello@enguerranweiss.fr" target="_blank">hello@enguerranweiss.fr</a><br><a href="http://www.enguerranweiss.fr" target="_blank">http://www.enguerranweiss.fr</a></p></div></div></div></div></div></div>\r\n</div><br clear="all"><br><span class="gmail_signature_prefix">-- </span><br><div dir="ltr" class="gmail_signature" data-smartmail="gmail_signature"><div dir="ltr"><div><div dir="ltr"><span style="color:rgb(0,0,0);font-family:Times;font-size:medium"><img src="http://goodies.enguerranweiss.fr/id/sign_html-v2-bl.png"></span><p style="font-family:Georgia,serif;font-style:italic;font-size:11px;color:rgb(102,102,102)"></p><p style="font-family:Georgia,serif;font-size:11px;color:rgb(102,102,102)">+33(0)6 10 13 76 84 <br><a href="mailto:hello@enguerranweiss.fr" target="_blank">hello@enguerranweiss.fr</a><br><a href="http://www.enguerranweiss.fr" target="_blank">http://www.enguerranweiss.fr</a></p></div></div></div></div></div>\r\n</div><br clear="all"><br><span class="gmail_signature_prefix">-- </span><br><div dir="ltr" class="gmail_signature" data-smartmail="gmail_signature"><div dir="ltr"><div><div dir="ltr"><span style="color:rgb(0,0,0);font-family:Times;font-size:medium"><img src="http://goodies.enguerranweiss.fr/id/sign_html-v2-bl.png"></span><p style="font-family:Georgia,serif;font-style:italic;font-size:11px;color:rgb(102,102,102)"></p><p style="font-family:Georgia,serif;font-size:11px;color:rgb(102,102,102)">+33(0)6 10 13 76 84 <br><a href="mailto:hello@enguerranweiss.fr" target="_blank">hello@enguerranweiss.fr</a><br><a href="http://www.enguerranweiss.fr" target="_blank">http://www.enguerranweiss.fr</a></p></div></div></div></div></div>\r\n',
  },
  EDIT_FORM_ESTABLISHMENT_LINK: {
    editFrontUrl: "EDIT_FRONT_URL",
    businessAddresses: ["BUSINESS_ADDRESS_1"],
    businessName: "BUSINESS_NAME",
  },
  ESTABLISHMENT_CONTACT_REQUEST_REMINDER: {
    appellationLabel: "Conducteur Poids Lourd",
    beneficiaryFirstName: "Coco",
    beneficiaryLastName: "Channel",
    beneficiaryReplyToEmail: "coco.chanel@notExistEmail.com",
    domain: "immersion-facile.beta.gouv.fr",
    mode: "3days",
  },
  ESTABLISHMENT_DELETED: {
    businessAddresses: [
      addressDtoToString({
        city: "CHOUCHEN-VILLE",
        departmentCode: "666",
        postcode: "66600",
        streetNumberAndAddress: "666 boulevard des porcs",
      }),
    ],
    businessName: "Machin CORP",
    siret: "12345678901234",
  },
  ESTABLISHMENT_LEAD_REMINDER: {
    businessName: "BUSINESS_NAME",
    registerEstablishmentShortLink: "REGISTRATION_LINK",
    unsubscribeToEmailShortLink: "REJECT_REGISTRATION_LINK",
  },
  FULL_PREVIEW_EMAIL: {
    internshipKind: "immersion",
    beneficiaryName: "BENEFICIARY_NAME",
    conventionId: "CONVENTION_ID",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  IC_USER_REGISTRATION_TO_AGENCY_REJECTED: {
    agencyName: "AGENCY_NAME",
    justification: "REASON",
  },
  IC_USER_RIGHTS_HAS_CHANGED: {
    agencyName: "AGENCY_NAME",
    roles: ["validator"],
    isNotifiedByEmail: true,
    email: "USER_EMAIL",
    firstName: "USER_FIRST_NAME",
    lastName: "USER_LAST_NAME",
  },
  MAGIC_LINK_RENEWAL: {
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    conventionId: "CONVENTION_ID",
    internshipKind: "immersion",
    magicLink: "MAGIC_LINK",
  },
  ASSESSMENT_CREATED_WITH_STATUS_COMPLETED_AGENCY_NOTIFICATION: {
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    conventionDateEnd: new Date("2025-01-13").toISOString(),
    immersionAppellationLabel: "APPELLATION_LABEL",
    assessment: {
      conventionId: "conv-id",
      status: "PARTIALLY_COMPLETED",
      lastDayOfPresence: new Date("2025-01-11").toISOString(),
      numberOfMissedHours: 12,
      establishmentFeedback: "Super !",
      establishmentAdvices: "Forme toi",
      endedWithAJob: true,
      contractStartDate: new Date("2025-01-08").toISOString(),
      typeOfContract: "CDD < 6 mois",
    },
    numberOfHoursMade: "30h",
    immersionObjective: "Confirmer un projet professionnel",
    internshipKind: "immersion",
  },
  ASSESSMENT_CREATED_WITH_STATUS_DID_NOT_SHOW_AGENCY_NOTIFICATION: {
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    immersionObjective: "Confirmer un projet professionnel",
    internshipKind: "immersion",
    immersionAppellationLabel: "APPELLATION_LABEL",
  },
  ASSESSMENT_CREATED_BENEFICIARY_NOTIFICATION: {
    internshipKind: "immersion",
    conventionId: "CONVENTION_ID",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    magicLink: "http://MAGIC_LINK",
  },
  NEW_CONVENTION_AGENCY_NOTIFICATION: {
    internshipKind: "immersion",
    conventionId: "CONVENTION_ID",
    firstName: "FIRST_NAME",
    lastName: "LAST_NAME",
    dateStart: "DATE_START",
    dateEnd: "DATE_END",
    businessName: "BUSINESS_NAME",
    agencyName: "AGENCY_NAME",
    magicLink: "http://MAGIC_LINK",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    agencyLogoUrl: defaultEmailPreviewUrl,
    warning: "WARNING",
  },
  NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE: {
    agencyLogoUrl: defaultEmailPreviewUrl,
    beneficiaryName: "BENEFICIARY_NAME",
    beneficiaryRepresentativeName: undefined,
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    establishmentRepresentativeName: "ESTABLISHMENT_REPRESENTATIVE_NAME",
    establishmentTutorName: "ESTABLISHMENT_TUTOR_NAME",
    internshipKind: "immersion",
    conventionSignShortlink: "CONVENTION_SIGN_MAGIC_LINK",
    signatoryName: "SIGNATORY_NAME",
    beneficiaryCurrentEmployerName: "CURRENT_EMPLOYER_NAME",
    renewed: {
      from: "11111111-1111-4111-1111-111111111111",
      justification: "EXCELLENTE_RAISON_DE_RENOUVELLEMENT",
    },
  },
  NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE_AFTER_MODIFICATION: {
    agencyLogoUrl: defaultEmailPreviewUrl,
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    conventionSignShortlink: "http://www.google.fr",
    internshipKind: "immersion",
    justification: "REASON",
    signatoryFirstName: "SIGNATORY_FIRST_NAME",
    signatoryLastName: "SIGNATORY_LAST_NAME",
  },
  NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION: {
    agencyLogoUrl: defaultEmailPreviewUrl,
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    internshipKind: "immersion",
    magicLink: "MAGIC_LINK",
    possibleRoleAction: "POSSIBLE_ROLE_ACTION",
    validatorName: "VALIDATOR_NAME",
    peAdvisor: {
      email: "PE_ADVISOR_EMAIL",
      firstName: "PE_ADVISOR_FIRSTAME",
      lastName: "PE_ADVISOR_LASTNAME",
      recipientIsPeAdvisor: false,
    },
  },
  NEW_ESTABLISHMENT_CREATED_CONTACT_CONFIRMATION: {
    contactFirstName: "CONTACT_FIRST_NAME",
    contactLastName: "CONTACT_LAST_NAME",
    businessName: "BUSINESS_NAME",
    businessAddresses: ["BUSINESS_ADDRESS_1", "BUSINESS_ADDRESS_2"],
  },
  POLE_EMPLOI_ADVISOR_ON_CONVENTION_ASSOCIATION: {
    advisorFirstName: "ADVISOR_FIRST_NAME",
    advisorLastName: "ADVISOR_LAST_NAME",
    immersionAddress: "IMMERSION_ADDRESS",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    beneficiaryEmail: "BENEFICIARY_EMAIL",
    conventionId: "CONVENTION_ID",
    dateStart: "DATE_START",
    dateEnd: "DATE_END",
    businessName: "BUSINESS_NAME",
    magicLink: "MAGIC_LINK",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  POLE_EMPLOI_ADVISOR_ON_CONVENTION_FULLY_SIGNED: {
    advisorFirstName: "ADVISOR_FIRST_NAME",
    advisorLastName: "ADVISOR_LAST_NAME",
    immersionAddress: "IMMERSION_ADDRESS",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    beneficiaryEmail: "BENEFICIARY_EMAIL",
    conventionId: "CONVENTION_ID",
    dateStart: "DATE_START",
    dateEnd: "DATE_END",
    businessName: "BUSINESS_NAME",
    magicLink: "MAGIC_LINK",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  REJECTED_CONVENTION_NOTIFICATION: {
    agencyName: "AGENCY",
    agencyLogoUrl: defaultEmailPreviewUrl,
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    immersionProfession: "IMMERSION_PROFESSION",
    internshipKind: "immersion",
    rejectionReason: "REJECTION_REASON",
    signature: "SIGNATURE",
  },
  SHARE_DRAFT_CONVENTION_BY_LINK: {
    internshipKind: "immersion",
    additionalDetails: "ADDITIONAL_DETAILS",
    conventionFormUrl: "CONVENTION_FORM_URL",
  },
  SIGNATORY_FIRST_REMINDER: {
    actorFirstName: "ACTOR_FIRSTNAME",
    actorLastName: "ACTOR_LASTNAME",
    beneficiaryFirstName: "BENEFICIARY_FIRSTNAME",
    beneficiaryLastName: "BENEFICIARY_LASTNAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    signatoriesSummary: [
      "- √  - A signé le 19/03/2023 - BENEFICIARY_FIRSTNAME BENEFICIARY_LASTNAME, bénéficiaire",
      `- ❌ - N'a pas signé - BENEFICIARY_CURRENT_EMPLOYER_FIRSTNAME BENEFICIARY_CURRENT_EMPLOYER_FIRSTNAME, employeur actuel du bénéficiaire`,
      `- ❌ - N'a pas signé - ESTABLISHMENT_REPRESENTATIVE_FIRSTNAME ESTABLISHMENT_REPRESENTATIVE_FIRSTNAME, représentant l'entreprise BUSINESS_NAME`,
    ].join("\n"),
    magicLinkUrl: "http://----MAGICLINK----",
  },
  SIGNATORY_LAST_REMINDER: {
    actorFirstName: "ACTOR_FIRSTNAME",
    actorLastName: "ACTOR_LASTNAME",
    beneficiaryFirstName: "BENEFICIARY_FIRSTNAME",
    beneficiaryLastName: "BENEFICIARY_LASTNAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    signatoriesSummary: [
      "- √  - A signé le 19/03/2023 - BENEFICIARY_FIRSTNAME BENEFICIARY_LASTNAME, bénéficiaire",
      `- ❌ - N'a pas signé - BENEFICIARY_CURRENT_EMPLOYER_FIRSTNAME BENEFICIARY_CURRENT_EMPLOYER_FIRSTNAME, employeur actuel du bénéficiaire`,
      `- ❌ - N'a pas signé - ESTABLISHMENT_REPRESENTATIVE_FIRSTNAME ESTABLISHMENT_REPRESENTATIVE_FIRSTNAME, représentant l'entreprise BUSINESS_NAME`,
    ].join("\n"),
    magicLinkUrl: "http://----MAGICLINK----",
  },
  SIGNEE_HAS_SIGNED_CONVENTION: {
    agencyLogoUrl: defaultEmailPreviewUrl,
    conventionId: "CONVENTION_ID",
    conventionStatusLink: "http://CONVENTION_STATUS_LINK",
    internshipKind: "immersion",
    signedAt: new Date().toISOString(),
    agencyName: "AGENCY_NAME",
  },
  SUGGEST_EDIT_FORM_ESTABLISHMENT: {
    editFrontUrl: "EDIT_FRONT_URL",
    businessAddresses: ["BUSINESS_ADDRESS_1"],
    businessName: "BUSINESS_NAME",
  },
  VALIDATED_CONVENTION_FINAL_CONFIRMATION: {
    agencyAssessmentDocumentLink: "AGENCY_ASSESSMENT_DOCUMENT_LINK",
    agencyLogoUrl: defaultEmailPreviewUrl,
    beneficiaryBirthdate: "BENEFICIARY_BIRTHDATE",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    conventionId: "CONVENTION_ID",
    dateEnd: "DATE_END",
    dateStart: "DATE_START",
    emergencyContactInfos: "EMERGENCY_CONTACT_INFOS",
    establishmentTutorName: "ESTABLISHMENT_TUTOR_NAME",
    immersionAppellationLabel: "IMMERSION_APPELLATION_LABEL",
    internshipKind: "immersion",
    magicLink: "MAGIC_LINK",
    validatorName: "VALIDATOR_NAME",
  },
};
