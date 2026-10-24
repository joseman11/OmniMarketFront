import { describe, expect, it } from "vitest";
import { summarizeMarginByCategory, summarizeRevenueByDay } from "@/lib/chart-summary";

describe("resúmenes textuales de gráficas", () => {
  it("describe total, extremos y tendencia de la serie diaria", () => {
    const text = summarizeRevenueByDay([
      { day: "2026-10-01", revenue: 100, orders: 1, margin: 10 },
      { day: "2026-10-02", revenue: 0, orders: 0, margin: 0 },
      { day: "2026-10-03", revenue: 300, orders: 3, margin: 30 },
      { day: "2026-10-04", revenue: 200, orders: 2, margin: 20 },
    ]);
    expect(text).toContain("6 órdenes");
    expect(text).toMatch(/Día más alto: 03.oct/);
    expect(text).toMatch(/Día más bajo: 02.oct/);
    expect(text).toMatch(/sube/);
  });

  it("ordena las categorías por margen", () => {
    const text = summarizeMarginByCategory([
      { categoryId: "a", categoryName: "Hogar", revenue: 100, orders: 1, margin: 20, marginPct: 0.2 },
      { categoryId: "b", categoryName: "Belleza", revenue: 100, orders: 1, margin: 50, marginPct: 0.5 },
    ]);
    expect(text.indexOf("Belleza")).toBeLessThan(text.indexOf("Hogar"));
  });

  it("sin datos lo indica", () => {
    expect(summarizeRevenueByDay([])).toBe("Sin datos para el periodo.");
    expect(summarizeMarginByCategory([])).toBe("Sin datos para el periodo.");
  });
});
