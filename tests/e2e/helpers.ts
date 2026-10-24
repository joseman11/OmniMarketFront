import { expect, type Locator, type Page } from "@playwright/test";

export const AUTH_STATE = "tests/e2e/.auth/user.json";

/** Restablece el set de datos conocido usando el endpoint de auditoría (vía UI). */
export async function resetData(page: Page) {
  await page.goto("/dashboard/audit");
  await page.getByTestId("audit-run-reset-data").click();
  await page.getByTestId("reset-confirm-input").fill("RESET");
  await page.getByTestId("reset-confirm").click();
  await expect(page.getByTestId("audit-status-reset-data")).toHaveText(/200/);
}

/** Arrastre con puntero real (dnd-kit necesita movimientos intermedios). */
export async function dragTo(page: Page, source: Locator, target: Locator) {
  const s = await source.boundingBox();
  const t = await target.boundingBox();
  if (!s || !t) throw new Error("Elemento sin caja para arrastrar");
  await page.mouse.move(s.x + s.width / 2, s.y + 20);
  await page.mouse.down();
  await page.mouse.move(s.x + s.width / 2 + 10, s.y + 30, { steps: 4 });
  await page.mouse.move(t.x + t.width / 2, t.y + 60, { steps: 18 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}
