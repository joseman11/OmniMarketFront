import type { CategoryPoint, DayPoint } from "@/lib/analytics";
import { formatCurrency, formatDay, formatNumber, formatPercent } from "@/lib/format";

/** Resumen textual de la serie diaria de ingresos (alternativa a la gráfica, WCAG 1.1.1). */
export function summarizeRevenueByDay(points: DayPoint[]): string {
  if (points.length === 0) return "Sin datos para el periodo.";
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const revenue = points.reduce((total, p) => total + p.revenue, 0);
  const orders = points.reduce((total, p) => total + p.orders, 0);
  const peak = points.reduce((best, p) => (p.revenue > best.revenue ? p : best), first);
  const low = points.reduce((worst, p) => (p.revenue < worst.revenue ? p : worst), first);
  const parts = [
    `Del ${formatDay(first.day, { year: true })} al ${formatDay(last.day, { year: true })}: ingresos de ${formatCurrency(revenue)} en ${formatNumber(orders)} órdenes.`,
    `Día más alto: ${formatDay(peak.day)} (${formatCurrency(peak.revenue)}).`,
    `Día más bajo: ${formatDay(low.day)} (${formatCurrency(low.revenue)}).`,
  ];
  if (points.length >= 4) {
    const half = Math.floor(points.length / 2);
    const before = points.slice(0, half).reduce((total, p) => total + p.revenue, 0);
    const after = points.slice(points.length - half).reduce((total, p) => total + p.revenue, 0);
    if (before > 0) {
      const change = (after - before) / before;
      parts.push(
        Math.abs(change) < 0.005
          ? "Tendencia estable entre la primera y la segunda mitad del periodo."
          : `La segunda mitad del periodo ${change > 0 ? "sube" : "baja"} ${formatPercent(Math.abs(change))} respecto a la primera.`,
      );
    }
  }
  return parts.join(" ");
}

/** Resumen textual del margen bruto por categoría. */
export function summarizeMarginByCategory(points: CategoryPoint[]): string {
  if (points.length === 0) return "Sin datos para el periodo.";
  const sorted = [...points].sort((a, b) => b.marginPct - a.marginPct);
  const list = sorted.map((p) => `${p.categoryName} ${formatPercent(p.marginPct)}`).join(", ");
  return `Margen bruto por categoría, de mayor a menor: ${list}.`;
}
