import type { Locator, Page } from "@playwright/test";

export const AUTH_STATE = "tests/e2e/.auth/user.json";

/** Restablece el set de datos conocido del adaptador mock (se re-siembra al cargar). */
export async function resetData(page: Page) {
  await page.goto("/dashboard/kanban");
  await page.evaluate(() => {
    window.localStorage.removeItem("omnimarket.mock.db.v1");
    window.localStorage.removeItem("omnimarket.mock.controls.v1");
  });
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

/** Fuerza HTTP 500 en las mutaciones del adaptador mock (para probar el rollback). */
export async function setMockFailure(page: Page, on: boolean) {
  await page.evaluate((fail) => {
    window.localStorage.setItem("omnimarket.mock.controls.v1", JSON.stringify({ failMutations: fail }));
  }, on);
}
