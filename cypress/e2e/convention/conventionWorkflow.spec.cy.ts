import { faker } from "@faker-js/faker/locale/fr";
import {
  agencyRoutes,
  conventionMagicLinkRoutes,
  domElementIds,
  makeUrlWithParams,
  peParisAgencyId,
} from "shared";
import { disableUrlLogging } from "../../cypress/utils/log";
import { addBusinessDays, format } from "date-fns";

const { baseApiRoute, defaultFieldOptions, timeForEventCrawler } =
  Cypress.env("config");

describe("Convention full workflow", () => {
  const conventionData = {
    magicLinks: [],
  };
  beforeEach(() => {
    disableUrlLogging();
  });
  it("creates a new convention", () => {
    cy.submitBasicConventionForm();
    cy.wait(timeForEventCrawler);
  });

  it("get signatories magicLink urls from email", () => {
    const maxEmails = 2;
    cy.connectToAdmin();
    for (let index = 0; index < maxEmails; index++) {
      cy.openEmailInAdmin({
        emailType: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE",
        elementIndex: index,
      }).then(($emailWrapper) => {
        $emailWrapper
          .find("span:contains('conventionSignShortlink')")
          .each((index, $span) => {
            const magicLinkUrl = Cypress.$($span).next().find("a").attr("href");
            conventionData.magicLinks.push(magicLinkUrl);
          });
      });
    }
  });
  it("signs convention for first signatory and validator requires modification", () => {
    cy.intercept(
      "POST",
      `${baseApiRoute}${makeUrlWithParams(
        conventionMagicLinkRoutes.updateConventionStatus,
        {
          conventionId: "**",
        },
      )}`,
    ).as("updateConventionRequest");
    signatorySignConvention(conventionData.magicLinks[0]);
    cy.connectToAdmin();
    cy.openEmailInAdmin({
      emailType: "NEW_CONVENTION_AGENCY_NOTIFICATION",
      elementIndex: 0,
    })
      .last()
      .then(($emailWrapper) => {
        cy.getMagicLinkInEmailWrapper($emailWrapper).click();
        cy.get(
          `#${domElementIds.manageConvention.conventionValidationRequestEditButton}`,
        ).click();
        cy.fillSelect({
          element: `#${domElementIds.manageConvention.modifierRoleSelect}`,
        });
        cy.get(
          `#${domElementIds.manageConvention.draftModal} [name='statusJustification']`,
        ).type("Raison de la demande de modification");
        cy.get(
          `#${domElementIds.manageConvention.draftModal} #${domElementIds.manageConvention.justificationModalSubmitButton}`,
        ).click(defaultFieldOptions);
        cy.wait("@updateConventionRequest")
          .its("response.statusCode")
          .should("eq", 200);
        cy.get(".fr-alert--success").should("exist");
      });
    cy.wait(timeForEventCrawler);
  });
  it("signatory edit the convention and re-submit it", () => {
    cy.connectToAdmin();
    cy.openEmailInAdmin({
      emailType: "CONVENTION_MODIFICATION_REQUEST_NOTIFICATION",
      elementIndex: 0,
    }).then(($emailWrapper) => {
      cy.getMagicLinkInEmailWrapper($emailWrapper).then(($link) => {
        editConventionForm($link.attr("href"));
        conventionData.magicLinks = [];
      });
    });
  });
  it("signs convention for signatories", () => {
    cy.intercept(
      "POST",
      `${baseApiRoute}${makeUrlWithParams(
        conventionMagicLinkRoutes.signConvention,
        {
          conventionId: "**",
        },
      )}`,
    ).as("signConventionRequest");
    cy.connectToAdmin();
    cy.visit("/admin/conventions"); // ensure we're on backoffice
    cy.openEmailInAdmin({
      emailType: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE",
      elementIndex: 0,
    }).then(($emailWrapper) => {
      $emailWrapper
        .find("span:contains('conventionSignShortlink')")
        .each((_, $span) => {
          const magicLinkUrl = Cypress.$($span).next().find("a").attr("href");
          signatorySignConvention(magicLinkUrl);
        });
    });
    cy.visit("/admin/conventions"); // ensure we're on backoffice
    cy.openEmailInAdmin({
      emailType: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE",
      elementIndex: 1,
    }).then(($emailWrapper) => {
      $emailWrapper
        .find("span:contains('conventionSignShortlink')")
        .each((_, $span) => {
          const magicLinkUrl = Cypress.$($span).next().find("a").attr("href");
          signatorySignConvention(magicLinkUrl);
        });
    });
    cy.wait(timeForEventCrawler);
  });
  it("reviews and validate convention", () => {
    cy.intercept(
      "POST",
      `${baseApiRoute}${makeUrlWithParams(
        conventionMagicLinkRoutes.updateConventionStatus,
        {
          conventionId: "**",
        },
      )}`,
    ).as("reviewConventionRequest");
    cy.connectToAdmin();
    cy.openEmailInAdmin({
      emailType: "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
      elementIndex: 0,
    }).then(($emailWrapper) => {
      cy.getMagicLinkInEmailWrapper($emailWrapper).click();
      cy.get(
        `#${domElementIds.manageConvention.conventionValidationValidateButton}`,
      ).click();
      cy.wait(1000);
      cy.get(
        `#${domElementIds.manageConvention.validatorModalSubmitButton}`,
      ).click();
      cy.wait("@reviewConventionRequest")
        .its("response.statusCode")
        .should("eq", 200);
      cy.get(".fr-alert--success").should("exist");
    });
  });
});

const signatorySignConvention = (magicLink) => {
  cy.intercept(
    "POST",
    `${baseApiRoute}${makeUrlWithParams(
      conventionMagicLinkRoutes.signConvention,
      {
        conventionId: "**",
      },
    )}`,
  ).as("signConventionRequest");
  cy.intercept(
    "GET",
    `${baseApiRoute}${makeUrlWithParams(
      conventionMagicLinkRoutes.getConvention,
      {
        conventionId: "**",
      },
    )}`,
  ).as("getConventionByIdRequest");
  cy.intercept(
    "GET",
    `${baseApiRoute}${agencyRoutes.getAgencyPublicInfoById.url}?agencyId=${peParisAgencyId}`,
  ).as("getAgencyPublicInfoByIdRequest");
  cy.visit(magicLink);
  cy.wait("@getConventionByIdRequest");
  cy.wait("@getAgencyPublicInfoByIdRequest");

  cy.get(`#${domElementIds.conventionToSign.submitButton}`).should(
    "not.be.disabled",
  );
  cy.get(`#${domElementIds.conventionToSign.openSignModalButton}`).click();
  cy.wait(1000);
  cy.get(`#${domElementIds.conventionToSign.submitButton}`).click();
  cy.wait("@signConventionRequest")
    .its("response.statusCode")
    .should("eq", 200);
};

const editConventionForm = (magicLinkUrl) => {
  cy.intercept(
    "POST",
    `${baseApiRoute}${makeUrlWithParams(
      conventionMagicLinkRoutes.updateConvention,
      {
        conventionId: "**",
      },
    )}`,
  ).as("conventionEditRequest");
  cy.visit(magicLinkUrl);
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.agencyId}`,
  ).should("have.value", peParisAgencyId);
  cy.get(`.fr-accordion`).eq(2).find(".fr-accordion__btn").click();
  cy.get(
    `#${domElementIds.conventionImmersionRoute.establishmentTutorSection.job}`,
  )
    .clear()
    .type(faker.name.jobTitle());
  cy.get(`.fr-accordion`).eq(3).find(".fr-accordion__btn").click();
  cy.get(`#${domElementIds.conventionImmersionRoute.conventionSection.dateEnd}`)
    .clear()
    .type(format(addBusinessDays(new Date(), 5), "yyyy-MM-dd"));
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.addHoursButton}`,
  ).click();
  cy.get(`#${domElementIds.conventionImmersionRoute.submitFormButton}`)
    .click()
    .then(() => {
      cy.get(".im-convention-summary").should("exist");
      cy.get(
        `#${domElementIds.conventionImmersionRoute.confirmSubmitFormButton}`,
      ).click();
      cy.wait("@conventionEditRequest")
        .its("response.statusCode")
        .should("eq", 200);
    });
  cy.wait(timeForEventCrawler);
};
