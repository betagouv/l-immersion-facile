import { faker } from "@faker-js/faker";
import { expect } from "@playwright/test";
import { FormEstablishmentDto, domElementIds } from "shared";
import { testConfig } from "../../custom.config";
import {
  PlaywrightTestCallback,
  fillAutocomplete,
  phoneRegexp,
} from "../../utils/utils";
import {
  TestEstablishments,
  fillEstablishmentFormFirstStep,
  goToNextStep,
} from "./establishmentForm.utils";

export const createNewEstablishment =
  (
    establishment: Partial<FormEstablishmentDto>,
    establishments: TestEstablishments,
  ): PlaywrightTestCallback =>
  async ({ page }, { retry }) => {
    const businessContact = establishment.businessContact;
    if (!businessContact)
      throw new Error("Missing business contact for createNewEstablishment");

    await fillEstablishmentFormFirstStep(page, establishments[retry].siret);

    await page
      .locator(`#${domElementIds.establishment.create.availabilityButton}`)
      .getByText("Oui")
      .click();

    await goToNextStep(page, 1, "create");
    await page
      .locator(`[for="${domElementIds.establishment.create.searchableBy}-2"]`) // searchable by students
      .click();

    await goToNextStep(page, 2, "create");
    await page.fill(
      `#${domElementIds.establishment.create.businessContact.firstName}`,
      businessContact.firstName,
    );
    await page.fill(
      `#${domElementIds.establishment.create.businessContact.lastName}`,
      businessContact.lastName,
    );
    await page.fill(
      `#${domElementIds.establishment.create.businessContact.job}`,
      businessContact.job,
    );
    await page.fill(
      `#${domElementIds.establishment.create.businessContact.phone}`,
      faker.helpers.fromRegExp(phoneRegexp),
    );
    await page.fill(
      `#${domElementIds.establishment.create.businessContact.email}`,
      "recette+establishment@immersion-facile.beta.gouv.fr",
    );
    await page
      .locator(
        `[for='${domElementIds.establishment.create.businessContact.contactMethod}-0']`,
      )
      .click();

    await goToNextStep(page, 3, "create");

    await expect(
      page.locator(`#${domElementIds.establishment.create.siret}`),
    ).toHaveValue(establishments[retry].siret);

    await expect(
      page.locator(`#${domElementIds.establishment.create.businessName}`),
    ).not.toHaveValue("");
    await expect(
      page.locator(
        `#${domElementIds.establishment.create.addressAutocomplete}`,
      ),
    ).not.toHaveValue("");
    await expect(
      page.locator(
        `#${domElementIds.establishment.create.businessAddresses}-0`,
      ),
    ).toHaveValue(establishments[retry].expectedAddress);
    await page.click(
      `#${domElementIds.establishment.create.appellations}-add-option-button`,
    );
    await page.fill(
      `#${domElementIds.establishment.create.appellations} .im-select__input`,
      "boulang",
    );
    await page
      .locator(
        `#${domElementIds.establishment.create.appellations} .im-select__option`,
      )
      .first()
      .click();

    await page.click(
      `#${domElementIds.establishment.create.businessAddresses}-add-option-button`,
    );

    await fillAutocomplete({
      page,
      locator: `#${domElementIds.establishment.create.businessAddresses}-1`,
      value: "28 rue des mimosas",
    });

    await page.click(`#${domElementIds.establishment.create.submitFormButton}`);
    await expect(page.url()).toContain(`siret=${establishments[retry].siret}`);
    await expect(page.locator(".fr-alert--success")).toBeVisible();
    await page.waitForTimeout(testConfig.timeForEventCrawler);
  };
