import test, { expect } from "@playwright/test";
import { AgencyId, domElementIds } from "shared";
import { testConfig } from "../../custom.config";
import { goToAdminTab } from "../../utils/admin";
import { fillAndSubmitBasicAgencyForm } from "../../utils/agency";
import { goToDashboard } from "../../utils/dashboard";

test.describe.configure({ mode: "serial" });

test.describe("Agency dashboard workflow", () => {
  let agencyId: AgencyId | null = null;

  test.describe("Agency creation", () => {
    test("creates a new agency", async ({ page }) => {
      agencyId = await fillAndSubmitBasicAgencyForm(page, {
        siret: "34792240300030",
        customizedName: "Handicap emploi !",
        rawAddress: "1 Avenue Jean-Marie Verne 01000 Bourg-en-Bresse",
      });
      await expect(
        await page.locator(".fr-alert--success").first(),
      ).toBeVisible();
      await expect(agencyId).not.toBeNull();
    });
  });
  test.describe("Agency activation by admin", () => {
    test.use({ storageState: testConfig.adminAuthFile });
    test("activate agency in admin", async ({ page }) => {
      if (!agencyId) throw new Error("Agency ID is null");
      await page.goto("/");
      await goToAdminTab(page, "adminAgencies");
      await page
        .locator(`#${domElementIds.admin.agencyTab.agencyToReviewInput}`)
        .fill(agencyId);
      await page
        .locator(`#${domElementIds.admin.agencyTab.agencyToReviewButton}`)
        .click();
      await page
        .locator(
          `#${domElementIds.admin.agencyTab.agencyToReviewActivateButton}`,
        )
        .click();

      await expect(
        await page.locator(".fr-alert--success").first(),
      ).toBeVisible();
      await page.waitForTimeout(testConfig.timeForEventCrawler);
    });
  });
  test.describe("Agency registration by Ic user", () => {
    test.use({ storageState: testConfig.agencyAuthFile });
    test("an Ic user should be able to ask to be registered to an agency", async ({
      page,
    }) => {
      await page.goto("/");
      await goToDashboard(page, "agency");
      await expect(
        page.locator(
          `#${domElementIds.agencyDashboard.registerAgencies.search}`,
        ),
      ).toBeVisible();
      await page
        .locator(`#${domElementIds.agencyDashboard.registerAgencies.search}`)
        .fill("conseil-departemental");

      await page
        .locator(
          `#${domElementIds.agencyDashboard.registerAgencies.table} table tbody tr .fr-checkbox-group`,
        )
        .first()
        .click();

      await page
        .locator(
          `#${domElementIds.agencyDashboard.registerAgencies.table} table tbody tr .fr-checkbox-group`,
        )
        .nth(1)
        .click();

      await page
        .locator(
          `#${domElementIds.agencyDashboard.registerAgencies.submitButton}`,
        )
        .click();

      await expect(
        await page.locator(".fr-alert--success").first(),
      ).toBeVisible();
    });

    test("an Ic user should be able to ask to cancel a registration request to an agency", async ({
      page,
    }) => {
      await page.goto("/");
      await goToDashboard(page, "agency");

      expect(
        await page
          .locator(`[id^="${domElementIds.profile.cancelRegistrationButton}"]`)
          .count(),
      ).toBe(2);

      await page
        .locator(`[id^="${domElementIds.profile.cancelRegistrationButton}"]`)
        .first()
        .click();

      await expect(
        await page.locator(".fr-alert--success").first(),
      ).toBeVisible();

      expect(
        await page
          .locator(`[id^="${domElementIds.profile.cancelRegistrationButton}"]`)
          .count(),
      ).toBe(1);
    });
  });

  test.describe("Agency admin registration", () => {
    test.use({ storageState: testConfig.adminAuthFile });
    test("admin validates user registration to agency", async ({ page }) => {
      await page.goto("/");
      await goToAdminTab(page, "adminAgencies");
      await page
        .locator(
          `#${domElementIds.admin.agencyTab.selectIcUserToReview} option:nth-child(2)`,
        )
        .waitFor({ state: "attached" });

      await page
        .locator(`#${domElementIds.admin.agencyTab.selectIcUserToReview}`)
        .selectOption({
          index: 1,
        });
      const registerButton = await page
        .locator(
          `[id^=${domElementIds.admin.agencyTab.registerIcUserToAgencyButton}]`,
        )
        .first();
      await expect(registerButton).toBeVisible();
      await registerButton.click();
      await expect(
        page.locator(
          `#${domElementIds.admin.agencyTab.userRegistrationToAgencyModal}`,
        ),
      ).toBeVisible();
      await page
        .locator(
          `[for="${domElementIds.admin.agencyTab.editAgencyManageUserCheckbox}-2"]`,
        )
        .click();
      await page
        .locator(
          `#${domElementIds.admin.agencyTab.editAgencyUserRoleSubmitButton}`,
        )
        .click();
      await expect(page.locator(".fr-alert--success").first()).toBeVisible();
      await page.waitForTimeout(testConfig.timeForEventCrawler);
    });
  });

  test.describe("Agency user dashboard access", () => {
    test.use({ storageState: testConfig.agencyAuthFile });
    test("IC user can access to the agency dashboard", async ({ page }) => {
      await page.goto("/");
      await goToDashboard(page, "agency");
      await expect(
        await page.locator(
          `#${domElementIds.agencyDashboard.dashboard.tabContainer}`,
        ),
      ).toBeVisible();
    });
  });
});
