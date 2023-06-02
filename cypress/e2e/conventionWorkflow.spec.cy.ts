import {
  domElementIds,
  signConventionRoute,
  updateConventionStatusRoute,
} from "../../shared/src";
import { disableNewUrlLog } from "../utils";
import { connectToAdmin } from "../utils/admin";
import { basicFormConvention } from "../utils/forms";

const baseApiRoute = "/api/";

describe("Convention full workflow", () => {
  const conventionData = {
    conventionId: null,
    magicLinks: [],
  };
  beforeEach(() => {
    disableNewUrlLog();
  });
  it("creates a new convention", () => {
    basicFormConvention();
    cy.wait(20000);
  });

  it("get signatories magicLink urls from email", () => {
    connectToAdmin();
    const maxEmails = 2;
    cy.get(".fr-tabs__tab").contains("Emails").click();
    cy.get(
      `.fr-accordion__btn:contains("NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE")`,
    )
      .should("exist")
      .each(($el, index) => {
        if (index < maxEmails) {
          cy.wrap($el)
            .click()
            .then(() => {
              $el
                .parents(".fr-accordion")
                .find("span:contains('magicLink')")
                .each((_index, $span) => {
                  const magicLinkUrl = Cypress.$($span)
                    .next()
                    .find("a")
                    .attr("href");
                  conventionData.magicLinks.push(magicLinkUrl);
                });
            });
        }
      });
  });
  it("signs convention for signatories", () => {
    cy.intercept("POST", `${baseApiRoute}auth/${signConventionRoute}/**`).as(
      "signConventionRequest",
    );
    conventionData.magicLinks.forEach((magicLink) => {
      cy.visit(magicLink);
      cy.get(".im-signature-actions__checkbox input").not(":checked").check();
      cy.get(`#${domElementIds.conventionToSign.submitButton}`).should(
        "not.be.disabled",
      );
      cy.get(`#${domElementIds.conventionToSign.submitButton}`).click();
      cy.wait("@signConventionRequest")
        .its("response.statusCode")
        .should("eq", 200);
    });
  });
  it("reviews and validate convention", () => {
    cy.wait(10000);
    cy.intercept(
      "POST",
      `${baseApiRoute}auth/${updateConventionStatusRoute}/**`,
    ).as("reviewConventionRequest");
    connectToAdmin();
    cy.get(".fr-tabs__tab").contains("Emails").click();
    cy.get(
      `.fr-accordion__btn:contains("NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION")`,
    )
      .should("exist")
      .each(($el, index) => {
        if (index > 0) return; // ¯\_(ツ)_/¯
        cy.wrap($el).click();
        const magicLinkUrl = $el
          .parents(".fr-accordion")
          .find("span:contains('magicLink')")
          .next()
          .find("a")
          .attr("href");
        cy.visit(magicLinkUrl);
        cy.get(
          `#${domElementIds.manageConvention.conventionValidationValidateButton}`,
        ).click();
        cy.wait("@reviewConventionRequest")
          .its("response.statusCode")
          .should("eq", 200);
        cy.get(".fr-alert--success").should("exist");
      });
  });
});
