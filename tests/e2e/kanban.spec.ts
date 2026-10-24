import { expect, test } from "@playwright/test";
import { AUTH_STATE, dragTo, resetData, setMockFailure } from "./helpers";

test.use({ storageState: AUTH_STATE });

test.describe("Kanban", () => {
  test.beforeEach(async ({ page }) => {
    await resetData(page);
    await page.goto("/dashboard/kanban");
    await expect(page.getByTestId("kanban-column-PENDING")).toBeVisible();
  });

  test("Drag & Drop persiste tras recargar", async ({ page }) => {
    const card = page.getByTestId("kanban-card-OM-1041");
    await expect(card).toHaveAttribute("data-status", "PENDING");
    await dragTo(page, card, page.getByTestId("kanban-column-SHIPPED"));
    await expect(page.getByText(/OM-1041 → Enviado/)).toBeVisible();
    await expect(page.getByTestId("kanban-column-SHIPPED").getByTestId("kanban-card-OM-1041")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("kanban-column-SHIPPED").getByTestId("kanban-card-OM-1041")).toBeVisible();
    await expect(page.getByTestId("kanban-count-SHIPPED")).toHaveText("7");
  });

  test("se puede mover una orden sólo con el teclado (espacio + flechas)", async ({ page }) => {
    // El activador de teclado es el botón de agarre con nombre propio (la tarjeta es un contenedor).
    const grip = page.getByRole("button", { name: "Mover orden OM-1044" });
    await grip.focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(150);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(250);
    await page.keyboard.press("Space");
    await expect(page.getByText(/OM-1044 → Procesando/)).toBeVisible();
    await expect(page.getByTestId("kanban-column-PROCESSING").getByTestId("kanban-card-OM-1044")).toBeVisible();
    // El foco vuelve al agarre de la tarjeta movida.
    await expect(page.getByRole("button", { name: "Mover orden OM-1044" })).toBeFocused();
  });

  test("si el servidor falla, el movimiento se revierte", async ({ page }) => {
    await setMockFailure(page, true);
    const card = page.getByTestId("kanban-card-OM-1042");
    await dragTo(page, card, page.getByTestId("kanban-column-DELIVERED"));
    await expect(page.getByText(/No se pudo mover OM-1042/)).toBeVisible();
    await expect(page.getByTestId("kanban-column-PENDING").getByTestId("kanban-card-OM-1042")).toBeVisible();
    await setMockFailure(page, false);
  });

  test("crear una orden valida con Zod y la agrega al tablero", async ({ page }) => {
    await page.getByTestId("order-create-open").click();
    await page.getByTestId("order-form-submit").click();
    await expect(page.getByText("El nombre debe tener al menos 3 caracteres")).toBeVisible();
    await expect(page.getByText("Selecciona un producto")).toBeVisible();

    await page.getByLabel("Cliente").fill("Lucía Prueba E2E");
    await page.getByLabel("Correo").fill("lucia@example.test");
    await page.getByLabel("Producto 1", { exact: true }).click();
    await page.getByRole("option", { name: /Sérum vitamina C/ }).click();
    await page.getByLabel("Cantidad 1", { exact: true }).fill("2");
    await page.getByTestId("order-form-submit").click();

    await expect(page.getByText(/Orden OM-\d+ creada/)).toBeVisible();
    await expect(page.getByTestId("kanban-column-PENDING").getByText("Lucía Prueba E2E")).toBeVisible();
    await expect(page.getByTestId("kanban-count-PENDING")).toHaveText("10");
  });

  test("bulk update con confirmación mueve todas las seleccionadas", async ({ page }) => {
    await page.getByTestId("kanban-select-column-CANCELLED").click();
    await expect(page.getByTestId("bulk-bar")).toBeVisible();
    await page.getByTestId("bulk-to-PENDING").click();
    await expect(page.getByRole("dialog")).toContainText("3 órdenes");
    await page.getByTestId("bulk-confirm").click();
    await expect(page.getByText("3 órdenes actualizadas")).toBeVisible();
    await expect(page.getByTestId("kanban-count-CANCELLED")).toHaveText("0");
    await expect(page.getByTestId("kanban-count-PENDING")).toHaveText("12");
  });
});

test.describe("Kanban · concurrencia optimista", () => {
  test("una versión obsoleta recibe 409 y el tablero se recarga", async ({ page, context }) => {
    await resetData(page);
    await page.goto("/dashboard/kanban");
    const other = await context.newPage();
    await other.goto("/dashboard/kanban");
    await expect(other.getByTestId("kanban-card-OM-1043")).toBeVisible();

    // Otra sesión mueve la orden primero…
    await dragTo(other, other.getByTestId("kanban-card-OM-1043"), other.getByTestId("kanban-column-PROCESSING"));
    await expect(other.getByText(/OM-1043 → Procesando/)).toBeVisible();

    // …y esta pestaña, con la versión vieja, intenta moverla también.
    await expect(page.getByTestId("kanban-card-OM-1043")).toHaveAttribute("data-version", "1");
    await dragTo(page, page.getByTestId("kanban-card-OM-1043"), page.getByTestId("kanban-column-DELIVERED"));
    await expect(page.getByText("Conflicto de versión (409)")).toBeVisible();
    await expect(page.getByTestId("kanban-column-PROCESSING").getByTestId("kanban-card-OM-1043")).toBeVisible();
  });
});
