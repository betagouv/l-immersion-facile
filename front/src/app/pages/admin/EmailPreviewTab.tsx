import React, { useEffect, useState } from "react";
import { fr } from "@codegouvfr/react-dsfr";
import { Select } from "@codegouvfr/react-dsfr/SelectNext";
import { keys } from "ramda";
import { useStyles } from "tss-react/dsfr";
import {
  domElementIds,
  immersionFacileContactEmail,
  internshipKinds,
  templatesByName,
} from "shared";
import { DsfrTitle, ImmersionTextField } from "react-design-system";
import { configureGenerateHtmlFromTemplate } from "html-templates";
import {
  cciCustomHtmlFooter,
  cciCustomHtmlHeader,
} from "html-templates/src/components/email";

const defaultEmailPreviewUrl =
  "https://upload.wikimedia.org/wikipedia/en/9/9a/Trollface_non-free.png";

type TemplateByName = typeof templatesByName;
type TemplateName = keyof TemplateByName;

export const EmailPreviewTab = () => {
  const { cx } = useStyles();

  const [currentTemplate, setCurrentTemplate] = useState<TemplateName>(
    "AGENCY_WAS_ACTIVATED",
  );

  const defaultEmailVariableForTemplate =
    defaultEmailValueByEmailKind[currentTemplate];
  const [emailVariables, setEmailVariables] = useState(
    defaultEmailVariableForTemplate,
  );

  useEffect(() => {
    setEmailVariables(defaultEmailVariableForTemplate);
  }, [currentTemplate]);

  const fakeContent = configureGenerateHtmlFromTemplate(
    templatesByName,
    { contactEmail: immersionFacileContactEmail },
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

  return (
    <div className={cx("admin-tab__email-preview")}>
      <DsfrTitle level={5} text="Aperçu de template email" />
      <div>
        <div className={fr.cx("fr-grid-row", "fr-grid-row--gutters")}>
          <aside className={fr.cx("fr-col-12", "fr-col-lg-4")}>
            <Select
              label="Liste de templates email :"
              placeholder="Veuillez sélectionner un template email"
              options={keys(templatesByName).map((templateName) => ({
                label: templatesByName[templateName].niceName,
                value: templateName,
              }))}
              nativeSelectProps={{
                id: domElementIds.admin.emailPreviewTab.emailTemplateNameSelect,
                name: "templateName",
                onChange: (event) =>
                  setCurrentTemplate(event.currentTarget.value),
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
                {fakeContent.attachment.map((att) => (
                  <li key={att.url}>
                    <a target={"_blank"} href={att.url} rel="noreferrer">
                      {att.url}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Ce template de mail n'a pas de pièces jointes.</p>
            )}
          </aside>
          <section className={fr.cx("fr-col-12", "fr-col-lg-8")}>
            <div
              className={cx("admin-tab__email-preview-wrapper")}
              dangerouslySetInnerHTML={{ __html: fakeContent.htmlContent }}
            ></div>
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
  [K in TemplateName]: Parameters<TemplateByName[K]["createEmailVariables"]>[0];
} = {
  SIGNATORY_FIRST_REMINDER: {
    actorFirstName: "ACTOR_FIRSTNAME",
    actorLastName: "ACTOR_LASTNAME",
    beneficiaryFirstName: "BENEFICIARY_FIRSTNAME",
    beneficiaryLastName: "BENEFICIARY_LASTNAME",
    businessName: "BUSINESS_NAME",
    signatoriesSummary: [
      `- ✔️  - A signé le 19/03/2023 - BENEFICIARY_FIRSTNAME BENEFICIARY_LASTNAME, bénéficiaire`,
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
    signatoriesSummary: [
      `- ✔️  - A signé le 19/03/2023 - BENEFICIARY_FIRSTNAME BENEFICIARY_LASTNAME, bénéficiaire`,
      `- ❌ - N'a pas signé - BENEFICIARY_CURRENT_EMPLOYER_FIRSTNAME BENEFICIARY_CURRENT_EMPLOYER_FIRSTNAME, employeur actuel du bénéficiaire`,
      `- ❌ - N'a pas signé - ESTABLISHMENT_REPRESENTATIVE_FIRSTNAME ESTABLISHMENT_REPRESENTATIVE_FIRSTNAME, représentant l'entreprise BUSINESS_NAME`,
    ].join("\n"),
    magicLinkUrl: "http://----MAGICLINK----",
  },
  AGENCY_FIRST_REMINDER: {
    agencyMagicLinkUrl: "CONVENTION_VERIFICATION_LINK",
    agencyName: "AGENCY_NAME",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    dateStart: "DATE_START",
    dateEnd: "DATE_END",
  },
  AGENCY_LAST_REMINDER: {
    agencyMagicLinkUrl: "CONVENTION_VERIFICATION_LINK",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
  },
  NEW_CONVENTION_BENEFICIARY_CONFIRMATION: {
    internshipKind: "immersion",
    conventionId: "CONVENTION_ID",
    firstName: "FIRST_NAME",
    lastName: "LAST_NAME",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  NEW_CONVENTION_ESTABLISHMENT_TUTOR_CONFIRMATION: {
    internshipKind: "immersion",
    conventionId: "CONVENTION_ID",
    establishmentTutorName: "ESTABLISHMENT_TUTOR_NAME",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    agencyLogoUrl: defaultEmailPreviewUrl,
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
    magicLink: "MAGIC_LINK",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    agencyLogoUrl: defaultEmailPreviewUrl,
    warning: "WARNING",
  },
  VALIDATED_CONVENTION_FINAL_CONFIRMATION: {
    internshipKind: "immersion",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    beneficiaryBirthdate: "BENEFICIARY_BIRTHDATE",
    emergencyContactInfos: "EMERGENCY_CONTACT_INFOS",
    dateStart: "DATE_START",
    dateEnd: "DATE_END",
    establishmentTutorName: "ESTABLISHMENT_TUTOR_NAME",
    businessName: "BUSINESS_NAME",
    immersionAppellationLabel: "IMMERSION_APPELLATION_LABEL",
    agencyLogoUrl: defaultEmailPreviewUrl,
    magicLink: "MAGIC_LINK",
  },
  POLE_EMPLOI_ADVISOR_ON_CONVENTION_FULLY_SIGNED: {
    advisorFirstName: "ADVISOR_FIRST_NAME",
    advisorLastName: "ADVISOR_LAST_NAME",
    immersionAddress: "IMMERSION_ADDRESS",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    beneficiaryEmail: "BENEFICIARY_EMAIL",
    dateStart: "DATE_START",
    dateEnd: "DATE_END",
    businessName: "BUSINESS_NAME",
    magicLink: "MAGIC_LINK",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  POLE_EMPLOI_ADVISOR_ON_CONVENTION_ASSOCIATION: {
    advisorFirstName: "ADVISOR_FIRST_NAME",
    advisorLastName: "ADVISOR_LAST_NAME",
    immersionAddress: "IMMERSION_ADDRESS",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    beneficiaryEmail: "BENEFICIARY_EMAIL",
    dateStart: "DATE_START",
    dateEnd: "DATE_END",
    businessName: "BUSINESS_NAME",
    magicLink: "MAGIC_LINK",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  REJECTED_CONVENTION_NOTIFICATION: {
    internshipKind: "immersion",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    rejectionReason: "REJECTION_REASON",
    businessName: "BUSINESS_NAME",
    signature: "SIGNATURE",
    immersionProfession: "IMMERSION_PROFESSION",
    agency: "AGENCY",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  CONVENTION_MODIFICATION_REQUEST_NOTIFICATION: {
    internshipKind: "immersion",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    justification: "REASON",
    businessName: "BUSINESS_NAME",
    signature: "SIGNATURE",
    immersionAppellation: {
      appellationCode: "A1111",
      appellationLabel: "MON LABEL APPELATION",
      romeCode: "R1111",
      romeLabel: "MON LABEL ROME",
    },
    agency: "AGENCY",
    magicLink: "MAGIC_LINK",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION: {
    internshipKind: "immersion",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    businessName: "BUSINESS_NAME",
    magicLink: "MAGIC_LINK",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    possibleRoleAction: "POSSIBLE_ROLE_ACTION",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  MAGIC_LINK_RENEWAL: {
    internshipKind: "immersion",
    magicLink: "MAGIC_LINK",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
  },
  BENEFICIARY_OR_ESTABLISHMENT_REPRESENTATIVE_ALREADY_SIGNED_NOTIFICATION: {
    internshipKind: "immersion",
    magicLink: "MAGIC_LINK",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    existingSignatureName: "EXISTING_SIGNATURE_NAME",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    immersionProfession: "IMMERSION_PROFESSION",
    businessName: "BUSINESS_NAME",
    establishmentRepresentativeName: "ESTABLISHMENT_REPRESENTATIVE_NAME",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE: {
    internshipKind: "immersion",
    beneficiaryName: "BENEFICIARY_NAME",
    establishmentRepresentativeName: "ESTABLISHMENT_REPRESENTATIVE_NAME",
    establishmentTutorName: "ESTABLISHMENT_TUTOR_NAME",
    beneficiaryRepresentativeName: undefined,
    signatoryName: "SIGNATORY_NAME",
    magicLink: "MAGIC_LINK",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    businessName: "BUSINESS_NAME",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  CONTACT_BY_EMAIL_REQUEST: {
    businessName: "BUSINESS_NAME",
    contactFirstName: "CONTACT_FIRST_NAME",
    contactLastName: "CONTACT_LAST_NAME",
    appellationLabel: "APPELLATION_LABEL",
    potentialBeneficiaryFirstName: "POTENTIAL_BENEFICIARY_FIRST_NAME",
    potentialBeneficiaryLastName: "POTENTIAL_BENEFICIARY_LAST_NAME",
    potentialBeneficiaryEmail: "POTENTIAL_BENEFICIARY_EMAIL",
    message: "MESSAGE",
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
  SHARE_DRAFT_CONVENTION_BY_LINK: {
    internshipKind: "immersion",
    additionalDetails: "ADDITIONAL_DETAILS",
    conventionFormUrl: "CONVENTION_FORM_URL",
  },
  AGENCY_WAS_ACTIVATED: {
    agencyName: "AGENCY_NAME",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  SUGGEST_EDIT_FORM_ESTABLISHMENT: {
    editFrontUrl: "EDIT_FRONT_URL",
  },
  EDIT_FORM_ESTABLISHMENT_LINK: {
    editFrontUrl: "EDIT_FRONT_URL",
  },
  NEW_ESTABLISHMENT_CREATED_CONTACT_CONFIRMATION: {
    contactFirstName: "CONTACT_FIRST_NAME",
    contactLastName: "CONTACT_LAST_NAME",
    businessName: "BUSINESS_NAME",
  },
  CREATE_IMMERSION_ASSESSMENT: {
    internshipKind: "immersion",
    beneficiaryFirstName: "BENEFICIARY_FIRST_NAME",
    beneficiaryLastName: "BENEFICIARY_LAST_NAME",
    establishmentTutorName: "ESTABLISHMENT_TUTOR_NAME",
    immersionAssessmentCreationLink: "IMMERSION_ASSESSMENT_CREATION_LINK",
    agencyLogoUrl: defaultEmailPreviewUrl,
    agencyValidatorEmail: "VALIDATOR_EMAIL",
  },
  FULL_PREVIEW_EMAIL: {
    internshipKind: "immersion",
    beneficiaryName: "BENEFICIARY_NAME",
    establishmentRepresentativeName: "ESTABLISHMENT_REPRESENTATIVE_NAME",
    beneficiaryRepresentativeName: undefined,
    signatoryName: "SIGNATORY_NAME",
    magicLink: "MAGIC_LINK",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    businessName: "BUSINESS_NAME",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  SIGNEE_HAS_SIGNED_CONVENTION: {
    internshipKind: "immersion",
    signedAt: new Date().toISOString(),
    conventionId: "CONVENTION_ID",
    conventionStatusLink: "CONVENTION_STATUS_LINK",
    agencyLogoUrl: defaultEmailPreviewUrl,
  },
  IC_USER_RIGHTS_HAS_CHANGED: {
    agencyName: "AGENCY_NAME",
  },
};
