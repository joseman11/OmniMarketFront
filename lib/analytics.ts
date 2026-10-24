import type { AnalyticsRow } from "@/lib/api/schemas";
import { averageTicket, marginRatio, percentChange, sum } from "@/lib/finance";

export type DayPoint = { day: string; revenue: number; orders: number; margin: number };
export type CategoryPoint = {
  categoryId: string;
  categoryName: string;
  revenue: number;
  orders: number;
  margin: number;
  marginPct: number;
};

export function aggregateByDay(rows: AnalyticsRow[]): DayPoint[] {
  const map = new Map<string, DayPoint>();
  for (const r of rows) {
    const p = map.get(r.day) ?? { day: r.day, revenue: 0, orders: 0, margin: 0 };
    p.revenue += r.revenue;
    p.orders += r.ordersCount;
    p.margin += r.grossMargin;
    map.set(r.day, p);
  }
  return [...map.values()]
    .map((p) => ({ ...p, revenue: sum([p.revenue]), margin: sum([p.margin]) }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export function aggregateByCategory(rows: AnalyticsRow[]): CategoryPoint[] {
  const map = new Map<string, CategoryPoint>();
  for (const r of rows) {
    const p =
      map.get(r.categoryId) ??
      { categoryId: r.categoryId, categoryName: r.categoryName, revenue: 0, orders: 0, margin: 0, marginPct: 0 };
    p.revenue += r.revenue;
    p.orders += r.ordersCount;
    p.margin += r.grossMargin;
    map.set(r.categoryId, p);
  }
  return [...map.values()]
    .map((p) => ({ ...p, marginPct: marginRatio(p.margin, p.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
}

export type Kpi = { value: number; previous: number; delta: number; series: number[] };
export type KpiSet = { revenue: Kpi; orders: Kpi; avgTicket: Kpi; marginPct: Kpi };

/**
 * KPIs del periodo actual (últimos `windowDays` días) vs. el periodo anterior
 * de la misma longitud. `series` alimenta las mini barras (últimos 12 días).
 */
export function computeKpis(rows: AnalyticsRow[], windowDays = 15): KpiSet {
  const days = aggregateByDay(rows);
  const current = days.slice(-windowDays);
  const previous = days.slice(-windowDays * 2, -windowDays);

  const totals = (ds: DayPoint[]) => {
    const revenue = sum(ds.map((d) => d.revenue));
    const orders = ds.reduce((a, d) => a + d.orders, 0);
    const margin = sum(ds.map((d) => d.margin));
    return { revenue, orders, ticket: averageTicket(revenue, orders), marginPct: marginRatio(margin, revenue) };
  };
  const c = totals(current);
  const p = totals(previous);
  const tail = days.slice(-12);

  return {
    revenue: { value: c.revenue, previous: p.revenue, delta: percentChange(c.revenue, p.revenue), series: tail.map((d) => d.revenue) },
    orders: { value: c.orders, previous: p.orders, delta: percentChange(c.orders, p.orders), series: tail.map((d) => d.orders) },
    avgTicket: {
      value: c.ticket,
      previous: p.ticket,
      delta: percentChange(c.ticket, p.ticket),
      series: tail.map((d) => averageTicket(d.revenue, d.orders)),
    },
    marginPct: {
      value: c.marginPct,
      previous: p.marginPct,
      // Para márgenes se reporta la diferencia en puntos porcentuales.
      delta: c.marginPct - p.marginPct,
      series: tail.map((d) => marginRatio(d.margin, d.revenue)),
    },
  };
}

/** "YYYY-MM-DD" local para hoy − n días. */
export function isoDaysAgo(n: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
