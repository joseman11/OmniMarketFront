import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "./helpers";

test.use({ storageState: AUTH_STATE, timezoneId: "Pacific/Kiritimati" });

const businessToday = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

test.describe("Analítica · fecha de referencia", () => {
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
