import { frontRoutes } from "./routes/routes";

type FrontRoutesKeys = keyof typeof frontRoutes | "home" | "header" | "footer";
type FrontRouteValue = string | Record<string, string | Record<string, string>>;
type FrontRoutesValues = Record<string, FrontRouteValue>;

type DomElementIds = Record<FrontRoutesKeys, FrontRoutesValues>;

const buildHeaderNavLinkId = (chunk: string) => `im-header-nav__${chunk}`;
const buildHeroHeaderId = (chunk: string) => `im-hero-header__${chunk}`;
const buildSitemapNavLinkId = (chunk: string) => `im-sitemap-nav__${chunk}`;
const buildFooterNavLinkId = (chunk: string) => `im-footer-nav__${chunk}`;

export const domElementIds = {
  header: {
    navLinks: {
      home: buildHeaderNavLinkId("home"),
      candidate: {
        home: buildHeaderNavLinkId("candidate-home"),
        search: buildHeaderNavLinkId("candidate-search"),
        formConvention: buildHeaderNavLinkId("candidate-form-convention"),
      },
      establishment: {
        home: buildHeaderNavLinkId("establishment-home"),
        addEstablishmentForm: buildHeaderNavLinkId("establishment-form"),
        formConvention: buildHeaderNavLinkId("establishment-form-convention"),
        establishmentDashboard: buildHeaderNavLinkId("establishment-dashboard"),
      },
      agency: {
        home: buildHeaderNavLinkId("agency-home"),
        addAgencyForm: buildHeaderNavLinkId("agency-form"),
        formConvention: buildHeaderNavLinkId("agency-form-convention"),
      },
      admin: {
        backOffice: buildHeaderNavLinkId("admin-home"),
        emails: buildHeaderNavLinkId("admin-emails"),
        dashboard: buildHeaderNavLinkId("agency-my-dashboard"),
      },
    },
  },

  footer: {
    overFooterCols: {
      faq: buildFooterNavLinkId("over-faq"),
      linkedin: buildFooterNavLinkId("over-linkedin"),
      contact: buildFooterNavLinkId("over-contact"),
    },
    navTopGroupLinks: {
      search: buildFooterNavLinkId("footer-nav-top-candidate-search"),
      formConvention: buildFooterNavLinkId("footer-nav-top-form-convention"),
      addEstablishmentForm: buildFooterNavLinkId(
        "footer-nav-top-establishement-form-convention",
      ),
      establishementformConvention: buildFooterNavLinkId(
        "footer-nav-top-establishement-form-convention",
      ),
      addAgencyForm: buildFooterNavLinkId("footer-nav-top-agency-form"),
      agencyformConvention: buildFooterNavLinkId(
        "footer-nav-top-agency-form-convention",
      ),
    },
    links: {
      gouv: buildFooterNavLinkId("gouv"),
      civilService: buildFooterNavLinkId("service-public"),
      inclusion: buildFooterNavLinkId("plateforme-inclusion"),
    },
    bottomLinks: {
      accessibility: buildFooterNavLinkId("accessibility"),
      legals: buildFooterNavLinkId("legals"),
      privacy: buildFooterNavLinkId("privacy"),
      cgu: buildFooterNavLinkId("cgu"),
      contact: buildFooterNavLinkId("contact"),
      stats: buildFooterNavLinkId("stats"),
      sitemap: buildFooterNavLinkId("sitemap"),
      budget: buildFooterNavLinkId("budget"),
      apiDocumentation: buildFooterNavLinkId("api-documentation"),
    },
  },

  home: {
    heroHeader: {
      candidate: buildHeroHeaderId("home-candidate"),
      establishment: buildHeroHeaderId("home-establishment"),
      agency: buildHeroHeaderId("home-agency"),
    },
  },

  homeEstablishments: {
    siretModal: {
      siretFetcherInput: "siret-fetcher-input",
      editEstablishmentButton: "edit-establishment-button",
    },
    heroHeader: {
      addEstablishmentForm: buildHeroHeaderId("establishment-form-register"),
      editEstablishmentForm: buildHeroHeaderId("establishment-form-edit"),
      formConvention: buildHeroHeaderId("establishment-form-convention"),
    },
  },
  homeAgencies: {
    heroHeader: {
      addAgencyForm: buildHeroHeaderId("agency-form-register"),
      formConvention: buildHeroHeaderId("agency-form-convention"),
    },
  },
  homeCandidates: {
    heroHeader: {
      search: buildHeroHeaderId("candidate-search"),
      formConvention: buildHeroHeaderId("candidate-form-convention"),
    },
  },

  search: {
    placeAutocompleteInput: "im-search-page__address-autocomplete",
    resultPerPageDropdown: "im-search-page__results-per-page-dropdown",
    appellationAutocomplete: "im-search-page__appellation-autocomplete",
    distanceSelect: "im-search-page__distance-dropdown",
    sortFilter: "radio-inline-legend",
    searchSubmitButton: "im-search__submit-search",
    searchSortOptionBase: "search-sort-option-",
    contactByMailButton: "im-contact-establishment__contact-email-button",
    contactByMailCancelButton:
      "im-contact-establishment__contact-email-cancel-button",
    contactByPhoneButton: "im-contact-establishment__contact-phone-button",
    contactInPersonButton: "im-contact-establishment__contact-in-person-button",
  },

  addAgency: {
    uploadLogoInput: "file-upload-logo",
    id: "agency-id",
    nameInput: "agency-name",
    addressInput: {
      address: "agency-address",
      city: "agency-address-city",
      departmentCode: "agency-address-departementCode",
      postcode: "agency-address-postCode",
      streetNumberAndAddress: "agency-address-streetNumberAndAddress",
    },
    positionInput: "agency-position",
    logoUrlInput: "agency-logo-url",
    validatorEmailsInput: "agency-validator-emails",
    adminEmailsInput: "agency-adminEmails",
    signatureInput: "agency-signature",
    statusInput: "agency-status",
    kindSelect: "agency-kind",
    counsellorEmailsInput: "agency-counsellor-emails",
    codeSafirInput: "agency-codeSafir",
    questionnaireUrlInput: "agency-questionnaireUrl",
    agencySiretInput: "agency-agencySiret",
    agencyRefersToInput: "im-form-add-agency__refers-to-agency-input",
    stepsForValidationInput: "steps-for-validation",
    submitButton: "im-form-add-agency__submit-button",
    refersToAgencyId: "im-form-add-agency__refers-to-agency-id",
  },

  conventionImmersionRoute: {
    showFormButton: "im-convention-immersion__show-form-button",
    submitFormButton: "im-convention-immersion__submit-form-button",
    confirmSubmitFormButton:
      "im-convention-immersion__confirm-submit-form-button",
    conventionSection: {
      agencyDepartment: "im-convention-form__agencyDepartement",
      agencyId: "im-convention-form__agencyId",
      agencyKind: "im-convention-form__agencyKind",
      dateStart: "im-convention-form__dateStart",
      dateEnd: "im-convention-form__dateEnd",
      addHoursButton: "im-convention-form__add-hours-button",
      siret: "im-convention-form__siret",
      businessName: "im-convention-form__businessName",
      workConditions: "im-convention-form__workConditions",
      individualProtection: "im-convention-form__individualProtection",
      sanitaryPrevention: "im-convention-form__sanitaryPrevention",
      sanitaryPreventionDescription:
        "im-convention-form__sanitaryPreventionDescription",
      immersionAddress: "im-convention-form__immersionAddress",
      immersionObjective: "im-convention-form__immersionObjective",
      immersionAppellation: "im-convention-form__immersionAppellation",
      immersionActivities: "im-convention-form__immersionActivities",
      immersionSkills: "im-convention-form__immersionSkills",
      isCurrentEmployer: "im-convention-form__isCurrentEmployer",
      isEstablishmentTutorIsEstablishmentRepresentative:
        "im-convention-form__isEstablishmentTutorIsEstablishmentRepresentative",
      businessAdvantages: "im-convention-form__businessAdvantages",
      isMinor: "im-convention-form__isMinor",
    },
    beneficiarySection: {
      firstName: "im-convention-form__signatories-beneficiary-firstName",
      lastName: "im-convention-form__signatories-beneficiary-lastName",
      birthdate: "im-convention-form__signatories-beneficiary-birthdate",
      email: "im-convention-form__signatories-beneficiary-email",
      phone: "im-convention-form__signatories-beneficiary-phone",
      levelOfEducation:
        "im-convention-form__signatories-beneficiary-level-of-education",
      schoolName: "im-convention-form__signatories-beneficiary-school-name",
      schoolPostcode:
        "im-convention-form__signatories-beneficiary-school-postcode",
      financiaryHelp:
        "im-convention-form__signatories-beneficiary-financiary-help",
      federatedIdentity:
        "im-convention-form__signatories-beneficiary-federatedIdentity",
      emergencyContact:
        "im-convention-form__signatories-beneficiary-emergencyContact",
      emergencyContactPhone:
        "im-convention-form__signatories-beneficiary-emergencyContactPhone",
      emergencyContactEmail:
        "im-convention-form__signatories-beneficiary-emergencyContactEmail",
      isRqth: "im-convention-form__signatories-beneficiary-isRqth",
    },
    establishmentTutorSection: {
      firstName: "im-convention-form__establishmentTutor-firstName",
      lastName: "im-convention-form__establishmentTutor-lastName",
      email: "im-convention-form__establishmentTutor-email",
      phone: "im-convention-form__establishmentTutor-phone",
      job: "im-convention-form__establishmentTutor-job",
    },
    beneficiaryRepresentativeSection: {
      firstName:
        "im-convention-form__signatories-beneficiaryRepresentative-firstName",
      lastName:
        "im-convention-form__signatories-beneficiaryRepresentative-lastName",
      email: "im-convention-form__signatories-beneficiaryRepresentative-email",
      phone: "im-convention-form__signatories-beneficiaryRepresentative-phone",
    },
    beneficiaryCurrentEmployerSection: {
      businessName:
        "im-convention-form__signatories-beneficiaryCurrentEmployer-businessName",
      job: "im-convention-form__signatories-beneficiaryCurrentEmployer-job",
      email: "im-convention-form__signatories-beneficiaryCurrentEmployer-email",
      phone: "im-convention-form__signatories-beneficiaryCurrentEmployer-phone",
      firstName:
        "im-convention-form__signatories-beneficiaryCurrentEmployer-firstName",
      lastName:
        "im-convention-form__signatories-beneficiaryCurrentEmployer-lastName",
      businessSiret:
        "im-convention-form__signatories-beneficiaryCurrentEmployer-businessSiret",
      businessAddress:
        "im-convention-form__signatories-beneficiaryCurrentEmployer-businessAddress",
    },
    establishmentRepresentativeSection: {
      firstName:
        "im-convention-form__signatories-establishmentRepresentative-firstName",
      lastName:
        "im-convention-form__signatories-establishmentRepresentative-lastName",
      email:
        "im-convention-form__signatories-establishmentRepresentative-email",
      phone:
        "im-convention-form__signatories-establishmentRepresentative-phone",
    },
  },

  manageConvention: {
    conventionValidationRejectButton: "im-convention-validation__reject-button",
    conventionValidationValidateButton:
      "im-convention-validation__validate-button",
    conventionValidationRequestEditButton:
      "im-convention-validation__request-edit-button",
    conventionValidationCancelButton: "im-convention-validation__cancel-button",
    conventionValidationDeprecateButton:
      "im-convention-validation__deprecate-button",
    justificationModalCancelButton: "im-justification-modal__cancel-button",
    justificationModalSubmitButton: "im-justification-modal__submit-button",
    validatorModalCancelButton: "im-validator-modal__cancel-button",
    validatorModalSubmitButton: "im-validator-modal__submit-button",
    modifierRoleSelect: "im-validator-modal__modifier-role-select",
    draftModal: "im-justification-modal",
    rejectedModal: "im-rejected-modal",
    deprecatedModal: "im-deprecate-modal",
    validatorModal: "im-validator-modal",
    cancelModal: "im-cancel-modal",
    renewModal: "im-renew-modal",
    openSignModalButton: "im-convention-validation__open-sign-modal-button",
    submitSignModalButton: "im-convention-validation__submit-sign-modal-button",
  },

  establishment: {
    establishmentFormAddressAutocomplete:
      "autocomplete-address-creation-establishment-form",
    siret: "establishment-siret",
    businessName: "establishment-businessName",
    businessNameCustomized: "establishment-businessNameCustomized",
    businessAddress: "establishment-businessAddress",
    businessContact: {
      lastName: "establishment-businessContact-lastName",
      firstName: "establishment-businessContact-firstName",
      job: "establishment-businessContact-job",
      phone: "establishment-businessContact-phone",
      email: "establishment-businessContact-email",
      copyEmails: "establishment-businessContact-copyEmails",
      contactMethod: "establishment-businessContact-contactMethod",
    },
    isEngagedEnterprise: "establishment-isEngagedEnterprise",
    fitForDisabledWorkers: "establishment-fitForDisabledWorkers",
    appellations: "establishment-appellations",
    website: "establishment-website",
    additionalInformation: "establishment-additionalInformation",
    maxContactsPerWeek: "establishment-maxContactPerWeek",
    addAppellationButton: "im-form-add-establishment__add-appellation-button",
    errorSiretAlreadyExistButton:
      "im-form-add-establishment__edit-establishment-button",
    submitButton: "im-form-add-establishment__submit-button",
    manageButton: "im-form-manage-establishment__manage-button",
  },

  assessment: {
    assessmentFormSubmitButton: "im-assessment-form__submit-button",
    assessmentFormDownloadButton: "im-assessment-form__download-button",
  },

  magicLinkRenewal: {
    magicLinkRenewalButton: "im-renew-page__renew-link-button",
  },

  standard: {
    siteMap: {
      home: buildSitemapNavLinkId("home"),
      candidateHome: buildSitemapNavLinkId("candidate-home"),
      establishmentHome: buildSitemapNavLinkId("establishment-home"),
      agencyHome: buildSitemapNavLinkId("agency-home"),
      search: buildSitemapNavLinkId("search"),
      coventionForm: buildSitemapNavLinkId("covention-form"),
      establishmentForm: buildSitemapNavLinkId("establishment-form"),
      agencyForm: buildSitemapNavLinkId("agency-form"),
      accessibility: buildSitemapNavLinkId("accessibility"),
      legals: buildSitemapNavLinkId("legals"),
      privacy: buildSitemapNavLinkId("privacy"),
      cgu: buildSitemapNavLinkId("cgu"),
      stats: buildSitemapNavLinkId("stats"),
    },
  },

  admin: {
    agencyTab: {
      activateAgencySelector: "agency-selector",
      editAgencyFormStatusSelector: "im-form-edit-agency__status-select",
      editAgencyFormSafirCodeInput: "im-form-edit-agency__safir-code-input",
      editAgencyFormEditSubmitButton: "im-form-edit-agency__submit-button",
      rejectAgencyModal: "im-reject-agency-modal",
    },
    emailPreviewTab: {
      emailTemplateNameSelect: "selectTemplateName",
      internshipKindSelect: "email-preview-internshipKind-select",
    },
    manageEstablishment: {
      siretInput: "im-manage-establishment__siret-input",
      searchButton: "im-manage-establishment__search-button",
      titleInput: "im-form-add-by-batch__title-input",
      descriptionInput: "im-form-add-by-batch__description-input",
      groupNameInput: "im-form-add-by-batch__group-name-input",
      inputFileInput: "im-form-add-by-batch__input-file-input",
      submitEditButton:
        "im-form-manage-establishment-admin__submit-edit-button",
      submitDeleteButton:
        "im-form-manage-establishment-admin__submit-delete-button",
    },
    adminPrivateRoute: {
      formLoginUserInput: "im-login__user-input",
      formLoginPasswordInput: "im-login__password-input",
      formLoginSubmitButton: "im-login__submit-button",
    },
  },

  conventionStatusDashboard: {},
  group: {},
  conventionDocument: {
    downloadPdfButton: "im-convention-document__download-pdf-button",
  },
  landingEstablishment: {},
  conventionToSign: {
    submitButton: "im-convention-to-sign__submit-button",
    openSignModalButton: "im-convention-to-sign__open-sign-modal-button",
    openRequestModificationModalButton:
      "im-convention-to-sign__open-modification-modal-button",
    submitModificationrequestButton:
      "im-convention-to-sign__submit-modification-request-button",
  },
  editFormEstablishmentRoute: {},
  error: {},
  conventionMiniStageRoute: {},
  agencyDashboard: {},
  manageConventionAdmin: {},
  manageConventionInclusionConnected: {},
  offer: {},
  offerExternal: {},
  manageEstablishmentAdmin: {},
  establishmentDashboard: {},
} satisfies DomElementIds;
