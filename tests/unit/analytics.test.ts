import { describe, expect, it } from "vitest";
import { aggregateByCategory, aggregateByDay, computeKpis, isoDaysAgo } from "@/lib/analytics";
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

  it("agrupa el mismo día, redondea importes y ordena cronológicamente", () => {
    const result = aggregateByDay([
      row("2026-10-02", "A", 1, 10.1, 2.03),
      row("2026-10-01", "B", 2, 20.2, 4.04),
      row("2026-10-02", "B", 2, 5.2, 1.02),
    ]);

    expect(result).toEqual([
      { day: "2026-10-01", revenue: 20.2, orders: 2, margin: 4.04 },
      { day: "2026-10-02", revenue: 15.3, orders: 3, margin: 3.05 },
    ]);
  });

  it("devuelve KPIs en cero para periodos vacíos y sin división entre cero", () => {
    const kpis = computeKpis([], 7);
    expect(kpis.revenue).toEqual({ value: 0, previous: 0, delta: 0, series: [] });
    expect(kpis.avgTicket.value).toBe(0);
    expect(kpis.marginPct.value).toBe(0);
  });

  it("calcula fechas anteriores a través de cambios de mes y año", () => {
    expect(isoDaysAgo(1, new Date(2025, 0, 1, 12))).toBe("2024-12-31");
    expect(isoDaysAgo(1, new Date(2026, 2, 1, 12))).toBe("2026-02-28");
  });
});
