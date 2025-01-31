import { Page, expect } from "@playwright/test";
import {
  BusinessContactDto,
  DateTimeIsoString,
  FormEstablishmentAddress,
  FormEstablishmentDto,
  domElementIds,
} from "shared";
import { testConfig } from "../../custom.config";
import { goToAdminTab } from "../../utils/admin";
import {
  PlaywrightTestCallback,
  expectLocatorToBeReadOnly,
  expectLocatorToBeVisibleAndEnabled,
  fillAutocomplete,
} from "../../utils/utils";
import {
  TestEstablishments,
  closeModal,
  goToNextStep,
} from "./establishmentForm.utils";
import { goToManageEtablishmentBySiretInAdmin } from "./establishmentNavigation.utils";

export const updateEstablishmentThroughMagicLink =
  (
    updatedFormEstablishment: Partial<FormEstablishmentDto>,
    testEstablishments: TestEstablishments,
  ): PlaywrightTestCallback =>
  async ({ page }, { retry }) => {
    await getEditLinkThroughBackOfficeAdmin(page, retry, testEstablishments);

    await editEstablishmentWithStepForm(
      page,
      retry,
      updatedFormEstablishment,
      testEstablishments,
    );
  };

export const updateEstablishmentAvailabilityThroughBackOfficeAdmin =
  (testEstablishments: TestEstablishments): PlaywrightTestCallback =>
  async ({ page }, { retry }) => {
    await goToManageEtablishmentBySiretInAdmin(page, retry, testEstablishments);

    await page
      .locator(`#${domElementIds.establishment.admin.availabilityButton}`)
      .getByText("Oui")
      .click();
    await page.click(`#${domElementIds.establishment.admin.submitFormButton}`);
    await expect(page.locator(".fr-alert--success")).toBeVisible();
  };

const getEditLinkThroughBackOfficeAdmin = async (
  page: Page,
  retry: number,
  testEstablishments: TestEstablishments,
): Promise<void> => {
  await page.goto("/");
  await page.click(`#${domElementIds.home.heroHeader.establishment}`);
  await page.click(
    `#${domElementIds.homeEstablishments.heroHeader.addEstablishmentForm}`,
  );
  await page.fill(
    `#${domElementIds.homeEstablishments.siretModal.siretFetcherInput}`,
    testEstablishments[retry].siret,
  );

  await expectLocatorToBeVisibleAndEnabled(
    await page.locator(
      `#${domElementIds.homeEstablishments.siretModal.editEstablishmentButton}`,
    ),
  );

  await page.click(
    `#${domElementIds.homeEstablishments.siretModal.editEstablishmentButton}`,
  );
  await page.waitForTimeout(testConfig.timeForEventCrawler);
  await closeModal(page);
  // Go to admin page / go to notifications tab
  await goToAdminTab(page, "adminNotifications");
  const emailWrapper = page
    .locator(".fr-accordion:has-text('EDIT_FORM_ESTABLISHMENT_LINK')")
    .first();
  await emailWrapper.click();
  await emailWrapper.getByRole("link", { name: "Lien vers la page" }).click();

  await page.waitForTimeout(4000);
};

const editEstablishmentWithStepForm = async (
  page: Page,
  retry: number,
  updatedEstablishmentInfos: Partial<FormEstablishmentDto>,
  testEstablishments: TestEstablishments,
): Promise<void> => {
  const businessContact = updatedEstablishmentInfos.businessContact;
  if (!businessContact)
    throw new Error("Missing business contact for updatedEstablishmentInfos");
  const nextAvailabilityDate = updatedEstablishmentInfos.nextAvailabilityDate;
  if (!nextAvailabilityDate)
    throw new Error(
      "Missing next availability date for updatedEstablishmentInfos",
    );

  const updatedMaxContactsPerMonth =
    updatedEstablishmentInfos.maxContactsPerMonth;
  if (!updatedMaxContactsPerMonth)
    throw new Error(
      "Missing max contacts per month for updatedEstablishmentInfos",
    );

  const businessAddress = updatedEstablishmentInfos.businessAddresses
    ? updatedEstablishmentInfos.businessAddresses[0]
    : undefined;
  if (!businessAddress)
    throw new Error(
      "Missing first business address for updatedEstablishmentInfos",
    );

  const businessNameCustomized =
    updatedEstablishmentInfos.businessNameCustomized;
  if (!businessNameCustomized)
    throw new Error(
      "Missing business name customized for updatedEstablishmentInfos",
    );

  const additionalInformation = updatedEstablishmentInfos.additionalInformation;
  if (!additionalInformation)
    throw new Error(
      "Missing additional information for updatedEstablishmentInfos",
    );

  const website = updatedEstablishmentInfos.website;
  if (!website)
    throw new Error("Missing website for updatedEstablishmentInfos");

  await start(page);

  await step1Availability(
    page,
    nextAvailabilityDate,
    updatedMaxContactsPerMonth,
  );
  await step2SearchableBy(page);
  await step3BusinessContact(page, businessContact);
  await step4AImmersionOffer(
    page,
    testEstablishments,
    retry,
    businessNameCustomized,
    updatedEstablishmentInfos,
    additionalInformation,
    website,
    businessAddress,
  );
  await step4BConfirm(page);
};

const step4BConfirm = async (page: Page) => {
  await page.click(`#${domElementIds.establishment.edit.submitFormButton}`);
  await expect(page.locator(".fr-alert--success")).toBeVisible();
  await page.waitForTimeout(testConfig.timeForEventCrawler);
};

const step4AImmersionOffer = async (
  page: Page,
  testEstablishments: TestEstablishments,
  retry: number,
  businessNameCustomized: string,
  updatedEstablishmentInfos: Partial<FormEstablishmentDto>,
  additionalInformation: string,
  website: string,
  businessAddress: FormEstablishmentAddress,
) => {
  await expect(
    page.locator(`#${domElementIds.establishment.edit.siret} input`),
  ).toBeDisabled();
  await expect(
    page.locator(`#${domElementIds.establishment.edit.siret} input`),
  ).toHaveValue(testEstablishments[retry].siret);

  await page.fill(
    `#${domElementIds.establishment.edit.businessNameCustomized}`,
    businessNameCustomized,
  );

  await page.click(
    `[for=${domElementIds.establishment.edit.isEngagedEnterprise}-${
      updatedEstablishmentInfos.isEngagedEnterprise ? "1" : "0"
    }]`,
  );

  await page.click(
    `[for=${domElementIds.establishment.edit.fitForDisabledWorkers}-${
      updatedEstablishmentInfos.fitForDisabledWorkers ? "1" : "0"
    }]`,
  );

  await page.fill(
    `#${domElementIds.establishment.edit.additionalInformation}`,
    additionalInformation,
  );

  await page.fill(`#${domElementIds.establishment.edit.website}`, website);

  await page.click(
    `#${domElementIds.establishment.edit.businessAddresses}-delete-option-button-0`,
  );
  await page.click(
    `#${domElementIds.establishment.edit.businessAddresses}-delete-option-button-0`,
  ); // twice, to remove the second address

  await page.fill(
    `#${domElementIds.establishment.edit.appellations} .im-select__input`,
    "buchero",
  );
  await page
    .locator(
      `#${domElementIds.establishment.edit.appellations} .im-select__option`,
    )
    .first()
    .click();

  await fillAutocomplete({
    page,
    locator: `#${domElementIds.establishment.edit.businessAddresses}-0`,
    value: businessAddress.rawAddress,
  });
};

const step3BusinessContact = async (
  page: Page,
  businessContact: BusinessContactDto,
): Promise<void> => {
  const firstNameLocator = page.locator(
    `#${domElementIds.establishment.edit.businessContact.firstName}`,
  );
  await expectLocatorToBeReadOnly(firstNameLocator);
  const lastNameLocator = page.locator(
    `#${domElementIds.establishment.edit.businessContact.lastName}`,
  );
  await expectLocatorToBeReadOnly(lastNameLocator);

  // Update email first in order to unlock firstname & lastname fields
  await page.fill(
    `#${domElementIds.establishment.edit.businessContact.email}`,
    businessContact.email,
  );

  await page.fill(
    `#${domElementIds.establishment.edit.businessContact.firstName}`,
    businessContact.firstName,
  );

  await page.fill(
    `#${domElementIds.establishment.edit.businessContact.lastName}`,
    businessContact.lastName,
  );

  await page.fill(
    `#${domElementIds.establishment.edit.businessContact.job}`,
    businessContact.job,
  );

  await page.fill(
    `#${domElementIds.establishment.edit.businessContact.phone}`,
    businessContact.phone,
  );

  await page
    .locator(
      `[for='${domElementIds.establishment.edit.businessContact.contactMethod}-1']`,
    )
    .click();

  await goToNextStep(page, 3, "edit");
};

const step2SearchableBy = async (page: Page) => {
  await page
    .locator(`[for="${domElementIds.establishment.edit.searchableBy}-1"]`)
    .click();
  await goToNextStep(page, 2, "edit");
};

const step1Availability = async (
  page: Page,
  nextAvailabilityDate: DateTimeIsoString,
  updatedMaxContactsPerMonth: number,
) => {
  await page
    .locator(`#${domElementIds.establishment.edit.availabilityButton}`)
    .getByText("Non")
    .click();

  await page
    .locator(`#${domElementIds.establishment.edit.nextAvailabilityDateInput}`)
    .fill(nextAvailabilityDate.split("T")[0]);

  const maxContactPerMonthLocator = await page.locator(
    `#${domElementIds.establishment.edit.maxContactsPerMonth}`,
  );

  const maxContactPerMonthLocatorCurrentValue =
    await maxContactPerMonthLocator.inputValue();
  await expect(maxContactPerMonthLocatorCurrentValue).not.toBe("");
  await expect(maxContactPerMonthLocatorCurrentValue).not.toBe(
    updatedMaxContactsPerMonth.toString(),
  );
  await maxContactPerMonthLocator.fill(updatedMaxContactsPerMonth.toString());

  await goToNextStep(page, 1, "edit");
};

const start = async (page: Page) => {
  const startFormButtonLocator = await page.locator(
    `#${domElementIds.establishment.edit.startFormButton}`,
  );
  await expectLocatorToBeVisibleAndEnabled(startFormButtonLocator);

  await startFormButtonLocator.click();
};
