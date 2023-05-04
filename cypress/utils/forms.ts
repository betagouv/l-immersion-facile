import { addBusinessDays, format } from "date-fns";
import {
  frontRoutes,
  agenciesRoute,
  conventionsRoute,
  featureFlagsRoute,
  appellationRoute,
  addressTargets,
  domElementIds,
} from "shared";
import { fillSelectRandomly } from "./input";
import { faker } from "@faker-js/faker/locale/fr";

const conventionFormUrl = `${frontRoutes.conventionImmersionRoute}`;
const baseApiRoute = "/api/";

export function basicFormConvention() {
  cy.intercept("GET", `${baseApiRoute}${featureFlagsRoute}`).as(
    "featureFlagsRequest",
  );
  cy.intercept("GET", `${baseApiRoute}${agenciesRoute}?**`).as(
    "agenciesRequest",
  );
  cy.intercept(
    "GET",
    `${baseApiRoute}${addressTargets.lookupStreetAddress.url}?**`,
  ).as("autocompleteAddressRequest");
  cy.intercept("GET", `${baseApiRoute}${appellationRoute}?**`).as(
    "autocompleteAppellationRequest",
  );
  cy.intercept("POST", `${baseApiRoute}${conventionsRoute}`).as(
    "conventionAddRequest",
  );

  cy.visit(conventionFormUrl);
  cy.wait("@featureFlagsRequest");

  cy.get(`#${domElementIds.conventionImmersionRoute.showFormButton}`).click();
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.agencyDepartment}`,
  )
    .select("86")
    .should("have.value", "86");

  cy.wait("@agenciesRequest");

  fillSelectRandomly({
    element: `#${domElementIds.conventionImmersionRoute.conventionSection.agencyId}`,
  });
  cy.get(
    `#${domElementIds.conventionImmersionRoute.beneficiarySection.firstName}`,
  )
    .clear()
    .type(faker.name.firstName());
  cy.get(
    `#${domElementIds.conventionImmersionRoute.beneficiarySection.lastName}`,
  )
    .clear()
    .type(faker.name.lastName());
  cy.get(`#${domElementIds.conventionImmersionRoute.beneficiarySection.email}`)
    .clear()
    .type(faker.internet.email());
  cy.get(`#${domElementIds.conventionImmersionRoute.beneficiarySection.phone}`)
    .clear()
    .type(faker.phone.number("06########"));
  cy.get(
    `#${domElementIds.conventionImmersionRoute.beneficiarySection.birthdate}`,
  )
    .clear()
    .type(faker.date.past(20, "2000-01-01").toISOString().split("T")[0]);
  cy.get(`#${domElementIds.conventionImmersionRoute.conventionSection.siret}`)
    .clear()
    .type(faker.datatype.number(14).toString());
  cy.get(
    `#${domElementIds.conventionImmersionRoute.establishmentTutorSection.firstName}`,
  )
    .clear()
    .type(faker.name.firstName());
  cy.get(
    `#${domElementIds.conventionImmersionRoute.establishmentTutorSection.lastName}`,
  )
    .clear()
    .type(faker.name.lastName());
  cy.get(
    `#${domElementIds.conventionImmersionRoute.establishmentTutorSection.job}`,
  )
    .clear()
    .type(faker.name.jobTitle());
  cy.get(
    `#${domElementIds.conventionImmersionRoute.establishmentTutorSection.phone}`,
  )
    .clear()
    .type(faker.phone.number("05########"));
  cy.get(
    `#${domElementIds.conventionImmersionRoute.establishmentTutorSection.email}`,
  )
    .clear()
    .type(faker.internet.email());
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.dateStart}`,
  )
    .clear()
    .type(getCurrentDate());
  cy.get(`#${domElementIds.conventionImmersionRoute.conventionSection.dateEnd}`)
    .clear()
    .type(getTomorrowDate());
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.immersionAddress}`,
  )
    .clear()
    .type(faker.address.streetAddress(true));
  cy.wait("@autocompleteAddressRequest");
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.immersionAddress}`,
  ).then(($element) => {
    const listboxId = $element.attr("aria-controls");
    cy.get(`#${listboxId} .MuiAutocomplete-option`).then((options) => {
      options.eq(0).trigger("click");
    });
  });
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.individualProtection} input:first-of-type`,
  ).check({
    force: true,
  });
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.sanitaryPrevention} input:first-of-type`,
  ).check({
    force: true,
  });
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.immersionObjective} input:first-of-type`,
  ).check({
    force: true, // DSFR, label:before is covering the input
  });
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.immersionAppellation}`,
  ).type(faker.name.jobType());
  cy.wait("@autocompleteAppellationRequest");
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.immersionAppellation}`,
  ).then(($element) => {
    const listboxId = $element.attr("aria-controls");
    cy.get(`#${listboxId} .MuiAutocomplete-option`).then((options) => {
      options.eq(0).trigger("click");
    });
  });
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.immersionActivities}`,
  )
    .clear()
    .type(faker.random.words(12));
  cy.get(`#${domElementIds.conventionImmersionRoute.submitFormButton}`)
    .click()
    .then(() => {
      cy.get(".fr-alert--error").should("not.exist");
      cy.wait("@conventionAddRequest")
        .its("response.statusCode")
        .should("eq", 200);
    });
}

const getCurrentDate = () => format(new Date(), "yyyy-MM-dd");
const getTomorrowDate = () =>
  format(addBusinessDays(new Date(), 1), "yyyy-MM-dd");
