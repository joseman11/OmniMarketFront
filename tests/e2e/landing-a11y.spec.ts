import { expect, test } from "@playwright/test";

test.describe("Landing · movimiento y tooltips accesibles", () => {
  test("el marquee de beneficios se pausa con un botón y la pausa persiste", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByTestId("marquee-toggle");
    await toggle.scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    const scroller = page.getByRole("region", { name: "Beneficios" }).locator("ul");
    await expect(scroller).toHaveCSS("animation-play-state", "paused");

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("marquee-toggle")).toHaveAttribute("aria-pressed", "true");
    await expect(scroller).toHaveCSS("animation-play-state", "paused");
  });

  test("el tooltip del equipo se abre con el foco y se cierra con Escape", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const avatar = page.getByRole("button", { name: "Dirección" });
    await avatar.focus();
    const tooltip = page.getByRole("tooltip").filter({ hasText: "Ventas y ganancias del día" });
    await expect(tooltip).toBeVisible();
    await expect(avatar).toHaveAttribute("aria-describedby", /.+/);
    await page.keyboard.press("Escape");
    await expect(tooltip).toHaveCount(0);
  });

  test("el marquee tiene exactamente una copia decorativa (idempotente en StrictMode)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const items = page.getByRole("region", { name: "Beneficios" }).locator("ul > li");
    await expect(items).toHaveCount(16);
    await expect(page.getByRole("region", { name: "Beneficios" }).locator('ul > li[aria-hidden="true"][inert]')).toHaveCount(8);
  });
});
