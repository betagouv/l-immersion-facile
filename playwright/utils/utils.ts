import {
  Locator,
  Page,
  PlaywrightTestArgs,
  TestInfo,
  expect,
} from "@playwright/test";
import { testConfig } from "../custom.config";

export type PlaywrightTestCallback = (
  args: PlaywrightTestArgs,
  info: TestInfo,
) => Promise<void>;

export const phoneRegexp = new RegExp(/[0][1-9][0-9]{8}/);

export const expectElementToBeVisible = async (
  page: Page,
  selector: string,
) => {
  const confirmation = await page.locator(selector).first();
  await confirmation.waitFor();
  await expect(confirmation).toBeVisible();
};

export const fillAutocomplete = async ({
  page,
  locator,
  value,
  endpoint,
}: {
  page: Page;
  locator: string;
  value: string;
  endpoint?: string;
}) => {
  await page.locator(locator).fill(value);
  await page.waitForTimeout(testConfig.timeForDebounce);
  if (endpoint) {
    await page.waitForResponse(`**${endpoint}**`);
  }
  await page.waitForSelector(`${locator}[aria-controls]`);
  const listboxId = await page.locator(locator).getAttribute("aria-controls");
  const firstOption = page
    .locator(`#${listboxId} li, .im-select__menu-list li`)
    .nth(0); // TODO: clean when AdressAutocomplete use react-select
  await expect(firstOption).toBeVisible();
  await firstOption.click();
};

export const logHttpResponse = ({
  page,
  onlyErrors,
}: {
  page: Page;
  onlyErrors?: boolean;
}) => {
  page.on("response", async (response) => {
    if (
      onlyErrors &&
      response.status() >= 400 &&
      response.url().includes("/api/")
    ) {
      console.info(
        "<<",
        response.request().method(),
        response.status(),
        response.url(),
        (await response.body()).toString(),
      );
    } else if (response.url().includes("/api/")) {
      console.info(
        "<<",
        response.request().method(),
        response.status(),
        response.url(),
        await response.text(),
      );
    }
  });
};

export const expectLocatorToBeVisibleAndEnabled = async (
  locator: Locator,
): Promise<void> => {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
};

export const expectLocatorToBeReadOnly = async (
  locator: Locator,
): Promise<void> => {
  await expect(locator).toBeVisible();
  await expect(locator).not.toBeEditable();
};
