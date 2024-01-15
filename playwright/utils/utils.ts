import { expect, Page } from "@playwright/test";

export const expectElementToBeVisible = async (
  page: Page,
  selector: string,
) => {
  const confirmation = await page.locator(selector);
  await confirmation.waitFor();
  await expect(confirmation).toBeVisible();
};

export const fillAutocomplete = async (
  page: Page,
  locator: string,
  value: string,
) => {
  await page.locator(locator).fill(value);
  await page.waitForSelector(`${locator}[aria-controls]`);
  const listboxId = await page.locator(locator).getAttribute("aria-controls");
  await expect(
    page.locator(`#${listboxId} .MuiAutocomplete-option`).nth(0),
  ).toBeVisible();
  await page.locator(`#${listboxId} .MuiAutocomplete-option`).nth(0).click();
};
