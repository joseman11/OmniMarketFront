import { expect, test } from "@playwright/test";
import { AUTH_STATE, resetData } from "./helpers";

test.use({ storageState: AUTH_STATE });

test.describe("Catálogo y detalle de órdenes", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
  });

  test("administra categorías y productos desde el catálogo", async ({ page }) => {
    await page.goto("/dashboard/catalog");
    await expect(page.getByRole("heading", { name: "Catálogo", exact: true })).toBeVisible();

    await page.getByRole("tab", { name: /Categorías/ }).click();
    await page.getByRole("button", { name: "Nueva categoría" }).click();
    const categoryDialog = page.getByRole("dialog");
    await categoryDialog.getByLabel("Nombre").fill("Accesorios E2E");
    await expect(categoryDialog.getByLabel("Slug")).toHaveValue("accesorios-e2e");
    await categoryDialog.getByRole("button", { name: "Guardar categoría" }).click();
    const categoryRow = page.getByRole("row", { name: /Accesorios E2E/ });
    await expect(categoryRow).toBeVisible();

    await categoryRow.getByRole("button", { name: "Editar Accesorios E2E" }).click();
    const editCategoryDialog = page.getByRole("dialog");
    await editCategoryDialog.getByLabel("Nombre").fill("Accesorios premium E2E");
    await editCategoryDialog.getByRole("button", { name: "Guardar categoría" }).click();
    await expect(page.getByRole("row", { name: /Accesorios premium E2E/ })).toBeVisible();

    await page.getByRole("tab", { name: /Productos/ }).click();
    await page.getByRole("button", { name: "Nuevo producto" }).click();
    const productDialog = page.getByRole("dialog");
    await productDialog.getByLabel("Categoría").selectOption({ label: "Accesorios premium E2E" });
    await productDialog.getByLabel("Nombre").fill("Funda E2E");
    await productDialog.getByLabel("SKU").fill("FUNDA-E2E");
    await productDialog.getByLabel("Precio").fill("499.00");
    await productDialog.getByLabel("Costo").fill("200.00");
    await productDialog.getByLabel("Existencia").fill("8");
    await productDialog.getByRole("button", { name: "Guardar producto" }).click();
    const productRow = page.getByRole("row", { name: /Funda E2E/ });
    await expect(productRow).toBeVisible();

    await productRow.getByRole("button", { name: "Editar Funda E2E" }).click();
    const editProductDialog = page.getByRole("dialog");
    await editProductDialog.getByLabel("Existencia").fill("12");
    await editProductDialog.getByRole("button", { name: "Guardar producto" }).click();
    await expect(productRow).toContainText("12");

    await productRow.getByRole("button", { name: "Eliminar Funda E2E" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(page.getByRole("row", { name: /Funda E2E/ })).toHaveCount(0);

    await page.getByRole("tab", { name: /Categorías/ }).click();
    const updatedCategoryRow = page.getByRole("row", { name: /Accesorios premium E2E/ });
    await updatedCategoryRow.getByRole("button", { name: "Eliminar Accesorios premium E2E" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(page.getByRole("row", { name: /Accesorios premium E2E/ })).toHaveCount(0);
  });

  test("el detalle de producto muestra sólo el producto seleccionado", async ({ page }) => {
    await page.goto("/dashboard/catalog");
    const rows = page.getByRole("row").filter({ has: page.getByRole("button", { name: "Ver" }) });
    await expect(rows.nth(1)).toBeVisible();
    const nameOf = async (index: number) => (await rows.nth(index).locator("td").first().locator("div").first().innerText()).trim();
    const first = await nameOf(0);
    const second = await nameOf(1);

    await rows.nth(0).getByRole("button", { name: "Ver" }).click();
    await expect(page.getByRole("dialog")).toContainText(first);
    await page.getByRole("dialog").getByRole("button", { name: "Cerrar", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await rows.nth(1).getByRole("button", { name: "Ver" }).click();
    await expect(page.getByRole("dialog")).toContainText(second);
    await expect(page.getByRole("dialog")).not.toContainText(first);
  });

  test("consulta, actualiza artículos y elimina desde el detalle de una orden", async ({ page }) => {
    await page.goto("/dashboard/kanban");
    await page.getByRole("link", { name: "Ver detalle de OM-1041" }).click();
    await expect(page).toHaveURL(/\/dashboard\/orders\//);
    await expect(page.getByText("Artículos", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Editar artículos" }).click();
    await page.getByRole("button", { name: "Guardar artículos" }).click();
    await expect(page.getByText("Artículos de la orden actualizados")).toBeVisible();

    await page.getByRole("button", { name: "Eliminar", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar orden" }).click();
    await expect(page).toHaveURL(/\/dashboard\/kanban$/);
    await expect(page.getByTestId("kanban-card-OM-1041")).toHaveCount(0);
  });

  test("un 409 en el editor de artículos bloquea el reintento hasta recargar", async ({ page, context }) => {
    await page.goto("/dashboard/kanban");
    await page.getByRole("link", { name: "Ver detalle de OM-1041" }).click();
    await expect(page).toHaveURL(/\/dashboard\/orders\//);
    await page.getByRole("button", { name: "Editar artículos" }).click();

    // Otra sesión guarda primero (v1 → v2).
    const other = await context.newPage();
    await other.goto(page.url());
    await other.getByRole("button", { name: "Editar artículos" }).click();
    await other.getByRole("button", { name: "Guardar artículos" }).click();
    await expect(other.getByText("Artículos de la orden actualizados")).toBeVisible();
    await other.close();

    // Aunque la caché se revalide a v2, el borrador conserva su versión base (v1).
    await page.bringToFront();
    await page.getByRole("button", { name: "Guardar artículos" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "cambió en otra sesión" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar artículos" })).toBeDisabled();

    await page.getByRole("button", { name: "Recargar orden" }).click();
    await expect(page.getByRole("button", { name: "Guardar artículos" })).toBeEnabled();
    await page.getByRole("button", { name: "Guardar artículos" }).click();
    await expect(page.getByText("Artículos de la orden actualizados")).toBeVisible();
  });
});
