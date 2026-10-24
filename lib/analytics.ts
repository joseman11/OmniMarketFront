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

/** Rango máximo que se rellena día a día (evita generar miles de puntos con rangos absurdos). */
const MAX_FILLED_DAYS = 1100;

/** Días de calendario [from, to] en orden, con ceros donde no hay registros. */
export function fillDays(points: DayPoint[], from: string, to: string): DayPoint[] {
  if (from > to) return [];
  const byDay = new Map(points.map((p) => [p.day, p]));
  const filled: DayPoint[] = [];
  for (let day = from; day <= to && filled.length < MAX_FILLED_DAYS; day = shiftIsoDay(day, 1)) {
    filled.push(byDay.get(day) ?? { day, revenue: 0, orders: 0, margin: 0 });
  }
  return filled;
}

export type Kpi = { value: number; previous: number; delta: number; series: number[] };
export type KpiSet = { revenue: Kpi; orders: Kpi; avgTicket: Kpi; marginPct: Kpi };

/**
 * KPIs del periodo actual (los `windowDays` días de calendario que terminan en `reference`)
 * vs. el periodo anterior de la misma longitud. Los días sin registros cuentan como cero.
 * `series` alimenta las mini barras (últimos 12 días de calendario).
 * Sin `reference` se usa el último día presente en los datos.
 */
export function computeKpis(rows: AnalyticsRow[], windowDays = 15, reference?: string): KpiSet {
  const days = aggregateByDay(rows);
  const ref = reference ?? days.at(-1)?.day;
  const window = (fromOffset: number, toOffset: number) =>
    ref ? fillDays(days, isoDaysBefore(ref, fromOffset), isoDaysBefore(ref, toOffset)) : [];
  const current = window(windowDays - 1, 0);
  const previous = window(windowDays * 2 - 1, windowDays);

  const totals = (ds: DayPoint[]) => {
    const revenue = sum(ds.map((d) => d.revenue));
    const orders = ds.reduce((a, d) => a + d.orders, 0);
    const margin = sum(ds.map((d) => d.margin));
    return { revenue, orders, ticket: averageTicket(revenue, orders), marginPct: marginRatio(margin, revenue) };
  };
  const c = totals(current);
  const p = totals(previous);
  const tail = window(11, 0);

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

/**
 * Zona horaria de negocio: los días de las métricas se cuentan en hora de México, igual en
 * el servidor (SSR) y en el navegador, para que ambos calculen la misma fecha.
 */
export const BUSINESS_TIME_ZONE = "America/Mexico_City";

const businessDayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toIsoDay(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" de hoy en la zona de negocio. */
export function todayIso(now = new Date()): string {
  const parts = Object.fromEntries(businessDayFmt.formatToParts(now).map((p) => [p.type, p.value]));
  return toIsoDay(Number(parts.year), Number(parts.month), Number(parts.day));
}

/** Suma `delta` días de calendario a un "YYYY-MM-DD" (aritmética UTC, sin efectos de horario de verano). */
export function shiftIsoDay(isoDay: string, delta: number): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + delta));
  return toIsoDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** "YYYY-MM-DD" para `reference` − n días. */
export function isoDaysBefore(reference: string, n: number): string {
  return shiftIsoDay(reference, -n);
}

/** "YYYY-MM-DD" en la zona de negocio para hoy − n días. */
export function isoDaysAgo(n: number, now = new Date()): string {
  return isoDaysBefore(todayIso(now), n);
}
