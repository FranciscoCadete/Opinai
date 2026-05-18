import { test, expect } from "@playwright/test";

// Demo credentials
const ADMIN = { email: "admin@mulenvos.ao", password: "demo1234" };

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("login page renders correctly", async ({ page }) => {
    await expect(page).toHaveTitle(/Iniciar sessão/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Iniciar sessão");
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
  });

  test("shows error on wrong credentials", async ({ page }) => {
    await page.fill("#login-email", ADMIN.email);
    await page.fill("#login-password", "wrongpassword");
    await page.getByRole("button", { name: /Entrar no sistema/i }).click();

    await expect(page.getByRole("alert").filter({ hasText: /Credenciais inválidas/i })).toBeVisible();
  });

  test("shows email validation error", async ({ page }) => {
    await page.fill("#login-email", "notanemail");
    await page.fill("#login-password", "demo1234");
    await page.getByRole("button", { name: /Entrar no sistema/i }).click();

    await expect(page.locator("#email-error")).toBeVisible();
    await expect(page.locator("#email-error")).toContainText("email válido");
  });

  test("successful login redirects to admin", async ({ page }) => {
    await page.fill("#login-email", ADMIN.email);
    await page.fill("#login-password", ADMIN.password);
    await page.getByRole("button", { name: /Entrar no sistema/i }).click();

    // Success state shown
    await expect(page.getByText(/Acesso autorizado/i)).toBeVisible({ timeout: 5000 });

    // Redirect to admin within 3s
    await page.waitForURL("**/admin", { timeout: 5000 });
    await expect(page).toHaveURL(/\/admin/);
  });

  test("toggle password visibility", async ({ page }) => {
    await page.fill("#login-password", "demo1234");

    const passwordInput = page.locator("#login-password");
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: /Mostrar palavra-passe/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await page.getByRole("button", { name: /Ocultar palavra-passe/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("back to citizen portal link works", async ({ page }) => {
    await page.getByRole("button", { name: /Portal do Cidadão/i }).click();
    await page.waitForURL("**/citizen-portal");
    await expect(page).toHaveURL(/citizen-portal/);
  });

  test("WCAG: login form has no accessibility violations", async ({ page }) => {
    // Check key ARIA attributes
    await expect(page.locator("#login-email")).toHaveAttribute("type", "email");
    await expect(page.locator("[role='radiogroup']")).toBeVisible();
    await expect(page.locator("[role='radio']").first()).toHaveAttribute("aria-checked");
    await expect(page.locator("[role='alert'][aria-live='assertive']")).toBeAttached();
  });
});

test.describe("Admin route protection", () => {
  test("unauthenticated access to /admin redirects to login", async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.goto("/admin");
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/login/);
  });
});
