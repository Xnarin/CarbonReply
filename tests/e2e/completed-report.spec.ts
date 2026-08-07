import { expect, test } from "@playwright/test";

const companyName = process.env.E2E_COMPANY_NAME;
const password = process.env.E2E_PASSWORD;
const projectId = process.env.E2E_PROJECT_ID;

test.describe("completed Scope 2 report", () => {
  test.skip(!companyName || !password || !projectId, "Set E2E_COMPANY_NAME, E2E_PASSWORD, and E2E_PROJECT_ID to run against a dedicated test account.");

  test("keeps a finalized report visible, downloadable, and locked", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="companyName"]').fill(companyName!);
    await page.locator('input[name="password"]').fill(password!);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });

    await page.goto(`/projects/${projectId}/report`);
    await expect(page.locator(".report-lock-banner")).toBeVisible();
    await expect(page.locator(".report-month-grid > div")).toHaveCount(12);

    const pdfResponse = await page.request.get(`/api/projects/${projectId}/report-pdf`);
    expect(pdfResponse.ok()).toBe(true);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");

    await page.goto(`/projects/${projectId}/review`);
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/report`), { timeout: 20_000 });
  });
});
