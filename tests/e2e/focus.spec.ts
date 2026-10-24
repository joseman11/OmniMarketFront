import { expect, test } from "@playwright/test";
import { AUTH_STATE, resetData } from "./helpers";

test.use({ storageState: AUTH_STATE });

test.describe("Accesibilidad · retorno de foco", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
  });

  test("el diálogo de nueva orden devuelve el foco a su botón (clic y ?new=1)", async ({ page }) => {
    await page.goto("/dashboard/kanban");
    await page.getByTestId("order-create-open").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("order-create-open")).toBeFocused();

    await page.goto("/dashboard/kanban?new=1");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("order-create-open")).toBeFocused();
  });

  test("la paleta abierta con atajo devuelve el foco a su botón", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle"); // el atajo se registra al hidratar
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Abrir paleta de comandos" })).toBeFocused();
  });

  test("catálogo: el detalle vuelve a «Ver» y al eliminar una fila el foco va a la búsqueda", async ({ page }) => {
    await page.goto("/dashboard/catalog");
    const firstView = page.getByRole("button", { name: "Ver" }).first();
    await firstView.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(firstView).toBeFocused();

    await page.getByRole("tab", { name: /Categorías/ }).click();
    await page.getByRole("button", { name: "Nueva categoría" }).click();
    await page.getByRole("dialog").getByLabel("Nombre").fill("Foco E2E");
    await page.getByRole("dialog").getByRole("button", { name: "Guardar categoría" }).click();
    const row = page.getByRole("row", { name: /Foco E2E/ });
    await row.getByRole("button", { name: "Eliminar Foco E2E" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(row).toHaveCount(0);
    await expect(page.getByLabel("Buscar en el catálogo")).toBeFocused();
  });

  test("tras aplicar un bulk el foco va al tablero (la barra que lo abrió desaparece)", async ({ page }) => {
    await page.goto("/dashboard/kanban");
    await page.getByTestId("kanban-select-column-CANCELLED").click();
    await page.getByTestId("bulk-to-PENDING").click();
    await page.getByTestId("bulk-confirm").click();
    await expect(page.getByText("3 órdenes actualizadas")).toBeVisible();
    await expect(page.getByRole("region", { name: "Tablero Kanban" })).toBeFocused();
  });

  test("el drawer de navegación devuelve el foco a su botón", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Abrir navegación" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Abrir navegación" })).toBeFocused();
  });
});
