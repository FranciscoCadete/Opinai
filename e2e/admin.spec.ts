import { test, expect } from "@playwright/test";

const ADMIN = { email: "admin@mulenvos.ao", password: "demo1234" };

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill("#login-email", ADMIN.email);
  await page.fill("#login-password", ADMIN.password);
  await page.getByRole("button", { name: /Entrar no sistema/i }).click();
  await page.waitForURL("**/admin", { timeout: 6000 });
}

test.describe("Admin dashboard (demo mode)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("renders admin layout with sidebar", async ({ page }) => {
    await expect(page.locator("nav[aria-label='Navegação principal']")).toBeVisible();
    await expect(page.locator("main#main-content")).toBeVisible();
  });

  test("sidebar shows OP1NA1 logo", async ({ page }) => {
    await expect(page.locator("nav").getByText("OP1NA1")).toBeVisible();
  });

  test("sidebar nav links are present", async ({ page }) => {
    const nav = page.locator("nav[aria-label='Navegação principal']");
    await expect(nav.getByText("Dashboard")).toBeVisible();
    await expect(nav.getByText("Pedidos")).toBeVisible();
    await expect(nav.getByText("Utilizadores")).toBeVisible();
    await expect(nav.getByText("Auditoria")).toBeVisible();
    await expect(nav.getByText("Canais")).toBeVisible();
  });

  test("navigates to requests page", async ({ page }) => {
    await page.locator("nav").getByText("Pedidos").click();
    await page.waitForURL("**/admin/requests");
    await expect(page).toHaveURL(/admin\/requests/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("navigates to users page", async ({ page }) => {
    await page.locator("nav").getByText("Utilizadores").click();
    await page.waitForURL("**/admin/users");
    await expect(page).toHaveURL(/admin\/users/);
  });

  test("navigates to audit page", async ({ page }) => {
    await page.locator("nav").getByText("Auditoria").click();
    await page.waitForURL("**/admin/audit");
    await expect(page).toHaveURL(/admin\/audit/);
  });

  test("logout redirects to login", async ({ page }) => {
    await page.getByRole("button", { name: /Terminar sessão/i }).click();
    await page.waitForURL("**/login", { timeout: 5000 });
    await expect(page).toHaveURL(/login/);
  });

  test("current user name is shown in sidebar", async ({ page }) => {
    // Demo admin user name
    await expect(page.locator("nav").getByText("Administrador Demo")).toBeVisible();
  });
});

test.describe("Requests page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/requests");
  });

  test("has search input with aria-label", async ({ page }) => {
    const search = page.locator("input[type='search']");
    await expect(search).toBeVisible();
    await expect(search).toHaveAttribute("aria-label");
  });

  test("shows requests table or empty state", async ({ page }) => {
    // Either a table (demo data) or no-results message
    const table = page.locator("table");
    const empty = page.getByText(/Nenhum pedido encontrado/);
    await expect(table.or(empty)).toBeVisible({ timeout: 5000 });
  });

  test("search filters results", async ({ page }) => {
    const searchInput = page.locator("input[type='search']");
    await searchInput.fill("zzz_nomatch_zzz");
    // Should show empty or filtered results
    await expect(page.getByText(/Nenhum pedido/)).toBeVisible({ timeout: 3000 });
  });
});
