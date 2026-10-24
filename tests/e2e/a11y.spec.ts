import { expect, test } from "@playwright/test";
import { AUTH_STATE, resetData } from "./helpers";

test.use({ storageState: AUTH_STATE });

test.describe("Accesibilidad · semántica de controles", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
  });

  test("tabs del catálogo: flechas verticales, tabpanel asociado y sin labels anidados", async ({ page }) => {
    await page.goto("/dashboard/catalog");
    const products = page.getByRole("tab", { name: /Productos/ });
    await expect(products).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toBeVisible();
    await products.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("tab", { name: /Categorías/ })).toBeFocused();
    await expect(page.getByRole("tab", { name: /Categorías/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toContainText("Slug");

    await page.getByRole("button", { name: "Nueva categoría" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator("label label")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Guardar categoría" }).click();
    const name = dialog.getByLabel("Nombre");
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveAttribute("aria-describedby", "category-form-error");
  });

  test("crear orden: el select de producto recibe el foco del error y se describe", async ({ page }) => {
    await page.goto("/dashboard/kanban");
    await page.getByTestId("order-create-open").click();
    await page.getByLabel("Cliente").fill("Ana Accesible");
    await page.getByLabel("Correo").fill("ana@example.test");
    await page.getByTestId("order-form-submit").click();
    const select = page.getByLabel("Producto 1", { exact: true });
    await expect(select).toBeFocused();
    await expect(select).toHaveAttribute("aria-describedby", "items-0-product-error");
  });

  test("la barra lateral colapsada conserva el nombre de cada enlace", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Colapsar barra lateral" }).click();
    const nav = page.getByRole("navigation", { name: "Secciones del dashboard" });
    await expect(nav.getByRole("link", { name: "Kanban" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Catálogo" })).toBeVisible();
  });
});
