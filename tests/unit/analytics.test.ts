import { describe, expect, it } from "vitest";
import { aggregateByCategory, computeKpis } from "@/lib/analytics";
import type { AnalyticsRow } from "@/lib/api/schemas";

const row = (day: string, cat: string, orders: number, revenue: number, margin: number): AnalyticsRow => ({
  day,
  categoryId: cat,
  categoryName: cat,
  ordersCount: orders,
  revenue,
  avgTicket: revenue / orders,
  grossMargin: margin,
});

describe("lógica de agregación (filtrado/KPIs)", () => {
  it("agrega por categoría y ordena por ingresos", () => {
    const res = aggregateByCategory([row("2026-10-01", "A", 2, 100, 40), row("2026-10-02", "A", 1, 50, 10), row("2026-10-01", "B", 5, 500, 100)]);
    expect(res.map((r) => r.categoryId)).toEqual(["B", "A"]);
    expect(res[1]).toMatchObject({ revenue: 150, orders: 3, marginPct: 50 / 150 });
  });

  it("compara el periodo actual contra el anterior", () => {
    const k = computeKpis([row("2026-10-01", "A", 10, 1000, 400), row("2026-10-02", "A", 10, 1200, 600)], 1);
    expect(k.revenue.value).toBe(1200);
    expect(k.revenue.delta).toBeCloseTo(0.2);
    expect(k.avgTicket.value).toBe(120);
    expect(k.marginPct.delta).toBeCloseTo(0.5 - 0.4);
  });
});
