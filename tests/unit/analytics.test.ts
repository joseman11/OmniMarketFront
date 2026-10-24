import { describe, expect, it } from "vitest";
import { aggregateByCategory, computeKpis, fillDays, isoDaysBefore, shiftIsoDay, todayIso } from "@/lib/analytics";
import { analyticsFiltersSchema } from "@/lib/api/schemas";
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

describe("fechas de negocio (zona horaria fija)", () => {
  it("todayIso usa la zona de negocio, no la del proceso", () => {
    // 03:00 UTC del 25/10 sigue siendo 24/10 en Ciudad de México (UTC−6).
    expect(todayIso(new Date("2026-10-25T03:00:00Z"))).toBe("2026-10-24");
    expect(todayIso(new Date("2026-10-25T07:00:00Z"))).toBe("2026-10-25");
  });

  it("shiftIsoDay cruza meses y años bisiestos", () => {
    expect(shiftIsoDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftIsoDay("2024-03-01", -1)).toBe("2024-02-29");
    expect(shiftIsoDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(isoDaysBefore("2026-10-24", 29)).toBe("2026-09-25");
  });
});

describe("KPI por ventanas de calendario", () => {
  it("con huecos: ventas el 1 y el 24 de octubre, referencia 24/10 → 200 actual y 100 previo", () => {
    const rows = [row("2026-10-01", "A", 1, 100, 40), row("2026-10-24", "A", 2, 200, 80)];
    const k = computeKpis(rows, 15, "2026-10-24");
    expect(k.revenue.value).toBe(200);
    expect(k.revenue.previous).toBe(100);
    expect(k.orders.value).toBe(2);
    expect(k.orders.previous).toBe(1);
  });

  it("los días vacíos cuentan como cero en la serie y no desplazan la ventana", () => {
    const k = computeKpis([row("2026-10-20", "A", 1, 50, 10)], 15, "2026-10-24");
    expect(k.revenue.series).toHaveLength(12);
    expect(k.revenue.series.slice(-5)).toEqual([50, 0, 0, 0, 0]);
    expect(k.revenue.previous).toBe(0);
  });

  it("ignora días posteriores a la referencia", () => {
    const k = computeKpis([row("2026-10-24", "A", 1, 10, 1), row("2026-10-25", "A", 1, 999, 1)], 1, "2026-10-24");
    expect(k.revenue.value).toBe(10);
  });

  it("fillDays completa el rango con ceros", () => {
    expect(fillDays([{ day: "2026-10-02", revenue: 5, orders: 1, margin: 1 }], "2026-10-01", "2026-10-03")).toEqual([
      { day: "2026-10-01", revenue: 0, orders: 0, margin: 0 },
      { day: "2026-10-02", revenue: 5, orders: 1, margin: 1 },
      { day: "2026-10-03", revenue: 0, orders: 0, margin: 0 },
    ]);
  });
});

describe("filtros de analítica: fechas imposibles", () => {
  it.each(["2026-02-31", "2026-13-01", "2026-00-10", "2025-02-29"])("rechaza %s", (day) => {
    expect(analyticsFiltersSchema.safeParse({ from: day }).success).toBe(false);
  });

  it("acepta fechas reales, incluido el 29/02 bisiesto", () => {
    expect(analyticsFiltersSchema.safeParse({ from: "2024-02-29", to: "2026-10-24" }).success).toBe(true);
  });
});
