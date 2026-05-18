import { test, expect } from "@playwright/test";

test.describe("Portal do Cidadão", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/citizen-portal");
  });

  test("renders page with correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/Portal do Cidadão/);
  });

  test("has skip link targeting main content", async ({ page }) => {
    const skipLink = page.locator("a.skip-link, a[href='#main-content']").first();
    await expect(skipLink).toBeAttached();
  });

  test("main landmark exists", async ({ page }) => {
    await expect(page.locator("main#main-content")).toBeVisible();
  });

  test("shows citizen portal title", async ({ page }) => {
    await expect(page.getByText("Portal do Cidadão")).toBeVisible();
  });

  test("'Acesso Institucional' link navigates to login", async ({ page }) => {
    await page.getByRole("button", { name: /Acesso Institucional/i }).click();
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/login/);
  });

  test("page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", msg => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/citizen-portal");
    await page.waitForLoadState("networkidle");
    // Filter out known browser warnings (not our code)
    const appErrors = errors.filter(e => !e.includes("favicon") && !e.includes("chrome-extension"));
    expect(appErrors).toHaveLength(0);
  });
});
