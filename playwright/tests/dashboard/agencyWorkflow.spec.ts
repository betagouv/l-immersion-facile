import test, { expect } from "@playwright/test";
import { AgencyId, domElementIds } from "shared";
import { testConfig } from "../../custom.config";
import { goToAdminTab } from "../../utils/admin";
import { fillAndSubmitBasicAgencyForm } from "../../utils/agency";
import { loginWithInclusionConnect } from "../../utils/inclusionConnect";
import { fillAutocomplete } from "../../utils/utils";

test.describe.configure({ mode: "serial" });

test.describe("Agency dashboard workflow", () => {
  let agencyId: AgencyId | null = null;

  test("creates a new agency", async ({ page }) => {
    agencyId = await fillAndSubmitBasicAgencyForm(page, {
      siret: "34792240300030",
      customizedName: "Handicap emploi !",
      rawAddress: "1 avenue jean-marie verne 01000 Bourg-en-Bresse",
    });
    await expect(
      await page.locator(".fr-alert--success").first(),
    ).toBeVisible();
    await expect(agencyId).not.toBeNull();
  });

  test("activate agency in admin", async ({ page }) => {
    if (!agencyId) throw new Error("Agency ID is null");
    await goToAdminTab(page, "agencies");
    await page
      .locator(`#${domElementIds.admin.agencyTab.agencyToReviewInput}`)
      .fill(agencyId);
    await page
      .locator(`#${domElementIds.admin.agencyTab.agencyToReviewButton}`)
      .click();
    await page
      .locator(`#${domElementIds.admin.agencyTab.agencyToReviewActivateButton}`)
      .click();

    await expect(
      await page.locator(".fr-alert--success").first(),
    ).toBeVisible();
    await page.waitForTimeout(testConfig.timeForEventCrawler);
  });

  test(`an Ic user should be able to ask to be registered to an agency (${agencyId})`, async ({
    page,
  }) => {
    await loginWithInclusionConnect(page, "agencyDashboard");
    await expect(
      await page.locator(
        `#${domElementIds.agencyDashboard.registerAgencies.form}`,
      ),
    ).toBeVisible();
    await fillAutocomplete({
      page,
      locator: `#${domElementIds.agencyDashboard.registerAgencies.agencyAutocomplete}--0`,
      value: "Cap emploi",
    });
    await page
      .locator(
        `#${domElementIds.agencyDashboard.registerAgencies.submitButton}`,
      )
      .click();

    await expect(
      await page.locator(".fr-alert--success").first(),
    ).toBeVisible();
  });

  test("admin validates user registration to agency", async ({ page }) => {
    await goToAdminTab(page, "agencies");
    await page
      .locator(`#${domElementIds.admin.agencyTab.selectIcUserToReview}`)
      .selectOption({
        index: 1,
      });
    await page
      .locator(
        `[id^=${domElementIds.admin.agencyTab.registerIcUserToAgencyButton}]`,
      )
      .click();
    await page.waitForTimeout(testConfig.timeForEventCrawler);
  });

  test("IC user can access to the agency dashboard", async ({ page }) => {
    await loginWithInclusionConnect(page, "agencyDashboard");
    await expect(
      await page.locator(
        `#${domElementIds.agencyDashboard.dashboard.tabContainer}`,
      ),
    ).toBeVisible();
  });
});
