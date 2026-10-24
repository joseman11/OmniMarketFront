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
    // Next monta su propio anunciador de rutas con role="alert": se filtra por el mensaje.
    await expect(page.getByRole("alert").filter({ hasText: "La fecha inicial debe ser anterior a la final" })).toBeVisible();
  });
});

const businessToday = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

test.describe("Analítica · fecha de referencia", () => {
  test.use({ timezoneId: "Pacific/Kiritimati" });

  test("SSR e hidratación usan el mismo día aunque el navegador esté en otra zona horaria", async ({ page }) => {
    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (/hydrat|did not match|server rendered/i.test(message.text())) hydrationErrors.push(message.text());
    });
    const ssr = await (await page.request.get("/dashboard/analytics")).text();
    expect(ssr).toContain(`value="${businessToday()}"`);

    await page.goto("/dashboard/analytics");
    // Tras hidratar y cargar datos, el cliente debe seguir en el mismo día que el SSR.
    await expect(page.getByTestId("analytics-table").locator("tbody tr").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await page.locator("#f-to").inputValue()).toBe(businessToday());
    expect(hydrationErrors).toEqual([]);
  });
});
