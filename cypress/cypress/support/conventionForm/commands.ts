import { addBusinessDays, format } from "date-fns";
import {
  frontRoutes,
  agencyRoutes,
  technicalRoutes,
  appellationRoute,
  addressRoutes,
  domElementIds,
  unauthenticatedConventionRoutes,
  peParisAgencyId,
} from "shared";
import { faker } from "@faker-js/faker/locale/fr";

const conventionFormUrl = `${frontRoutes.conventionImmersionRoute}`;
const possibleJobs = [
  "Aide à domicile",
  "Aide-soignant",
  "Ambulancier",
  "Boulanger",
  "Boucher",
  "Jongleur",
  "Pompier",
  "Pâtissier",
  "Plombier",
  "Serrurier",
];
const possibleAddressQueries = [
  "1 rue de la paix",
  "rue des mimosas",
  "avenue des champs elysées",
  "rue de la république",
];
const { baseApiRoute, defaultFieldOptions } = Cypress.env("config");
let currentStep = 1;

Cypress.Commands.add("submitBasicConventionForm", () => {
  cy.intercept("GET", `${baseApiRoute}${technicalRoutes.featureFlags.url}`).as(
    "featureFlagsRequest",
  );
  cy.intercept(
    "GET",
    `${baseApiRoute}${agencyRoutes.getFilteredAgencies.url}?**`,
  ).as("agenciesRequest");
  cy.intercept(
    "GET",
    `${baseApiRoute}${addressRoutes.lookupStreetAddress.url}?**`,
  ).as("autocompleteAddressRequest");
  cy.intercept("GET", `${baseApiRoute}${appellationRoute}?**`).as(
    "autocompleteAppellationRequest",
  );
  cy.intercept(
    "POST",
    `${baseApiRoute}${unauthenticatedConventionRoutes.createConvention.url}`,
  ).as("conventionAddRequest");

  cy.visit(conventionFormUrl);
  cy.wait("@featureFlagsRequest");

  cy.get(`#${domElementIds.conventionImmersionRoute.showFormButton}`).click();
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.agencyDepartment}`,
  )
    .select("75", defaultFieldOptions)
    .should("have.value", "75");

  cy.wait("@agenciesRequest");

  cy.fillSelect({
    element: `#${domElementIds.conventionImmersionRoute.conventionSection.agencyId}`,
    predicateValue: peParisAgencyId,
  });

  openNextSection(); // Open Beneficiary section
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

  openNextSection(); // Open Establishment section
  cy.get(`#${domElementIds.conventionImmersionRoute.conventionSection.siret}`)
    .clear()
    .type(getRandomSiret());
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

  openNextSection(); // Open place / hour section
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.dateStart}`,
  )
    .clear()
    .type(getCurrentDate());
  cy.get(`#${domElementIds.conventionImmersionRoute.conventionSection.dateEnd}`)
    .clear()
    .type(getTomorrowDate());
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.addHoursButton}`,
  ).click();
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.immersionAddress}`,
  )
    .clear()
    .type(
      possibleAddressQueries[
        Math.floor(Math.random() * possibleAddressQueries.length)
      ],
    );
  cy.wait("@autocompleteAddressRequest");
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.immersionAddress}`,
  ).then(($element) => {
    const listboxId = $element.attr("aria-controls");
    cy.get(`#${listboxId} .MuiAutocomplete-option`).then((options) => {
      options.eq(0).trigger("click");
    });
  });

  openNextSection(); // Open immersion details section
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.individualProtection} input:first-of-type`,
  ).check(defaultFieldOptions);
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.sanitaryPrevention} input:first-of-type`,
  ).check(defaultFieldOptions);
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.immersionObjective} input:first-of-type`,
  ).check(defaultFieldOptions);
  cy.get(
    `#${domElementIds.conventionImmersionRoute.conventionSection.immersionAppellation}`,
  ).type(possibleJobs[Math.floor(Math.random() * possibleJobs.length)]);
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
    .type(faker.random.words(8));
  cy.get(`#${domElementIds.conventionImmersionRoute.submitFormButton}`)
    .click()
    .then(() => {
      cy.get(".im-convention-summary").should("exist");
      cy.get(
        `#${domElementIds.conventionImmersionRoute.confirmSubmitFormButton}`,
      ).click();
      cy.wait("@conventionAddRequest")
        .its("response.statusCode")
        .should("eq", 200);
    });
});

const getCurrentDate = () => format(new Date(), "yyyy-MM-dd");
const getTomorrowDate = () =>
  format(addBusinessDays(new Date(), 1), "yyyy-MM-dd");

const getRandomSiret = () =>
  ["722 003 936 02320", "44229377500031", "130 005 481 00010"][
    Math.floor(Math.random() * 3)
  ];

const openNextSection = () => {
  cy.get(`.fr-accordion`).eq(currentStep).find(".fr-accordion__btn").click();
  currentStep++;
};
