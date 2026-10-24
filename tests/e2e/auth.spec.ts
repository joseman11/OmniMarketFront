import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "./helpers";

test.describe("Autenticación (OAuth exclusivo)", () => {
  test("las rutas protegidas redirigen a /login", async ({ page }) => {
    await page.goto("/dashboard/kanban");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard%2Fkanban/);
  });

  test("login sólo ofrece Google y GitHub, sin campos de contraseña", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-google")).toBeVisible();
    await expect(page.getByTestId("login-github")).toBeVisible();
    await expect(page.locator('input[type="password"], input[type="email"], input[type="text"]')).toHaveCount(0);
  });

  test("muestra un toast en español ante ?error=AccessDenied", async ({ page }) => {
    await page.goto("/login?error=AccessDenied");
    await expect(page.getByText("Acceso denegado")).toBeVisible();
  });
});

test.describe("Cierre de sesión", () => {
  test.use({ storageState: AUTH_STATE });

  test("cerrar sesión en una pestaña termina la sesión cliente en las demás", async ({ page, context }) => {
    await page.goto("/dashboard/kanban");
    await expect(page.getByTestId("kanban-column-PENDING")).toBeVisible();
    const other = await context.newPage();
    await other.goto("/dashboard");
    await expect(other.getByTestId("user-menu")).toBeVisible();

    await page.bringToFront();
    await page.getByTestId("user-menu").click();
    await page.getByTestId("sign-out").click();
    await expect(page).toHaveURL(/\/login/);
    await expect(other).toHaveURL(/\/login/);
  });
});
