import { expect, test } from "@playwright/test";
import { AUTH_STATE, resetData } from "./helpers";

test.use({ storageState: AUTH_STATE });

test.describe("Analítica", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await page.goto("/dashboard/analytics");
  });

  test("muestra los filtros y permite avanzar la tabla paginada", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Analítica" })).toBeVisible();
    await expect(page.getByRole("form", { name: "Filtros de analítica" })).toBeVisible();
    await expect(page.getByTestId("analytics-table")).toBeVisible();
    await expect(page.getByRole("button", { name: "Página siguiente" })).toBeEnabled();

    await page.getByRole("button", { name: "Página siguiente" }).click();
    await expect(page).toHaveURL(/(?:\?|&)page=2(?:&|$)/);
    await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
  });

  test("detecta un rango de fechas invertido y ofrece el error de validación", async ({ page }) => {
    await page.goto("/dashboard/analytics?from=2026-10-20&to=2026-10-01");
    await expect(page.getByRole("alert")).toContainText("La fecha inicial debe ser anterior a la final");
  });
});
