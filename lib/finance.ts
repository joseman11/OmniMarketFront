import { roundTo } from "./decimal";

/** Ticket promedio = ingresos / órdenes. 0 si no hay órdenes. */
export function averageTicket(revenue: number, orders: number): number {
  if (!Number.isFinite(revenue) || !Number.isFinite(orders) || orders <= 0) return 0;
  return roundTo(revenue / orders, 2);
}

/** Margen bruto absoluto = ingresos − costo. */
export function grossMargin(revenue: number, cost: number): number {
  return roundTo(revenue - cost, 2);
}

/** Margen bruto como razón (0–1) = margen / ingresos. 0 si no hay ingresos. */
export function marginRatio(margin: number, revenue: number): number {
  if (!Number.isFinite(margin) || !Number.isFinite(revenue) || revenue === 0) return 0;
  return margin / revenue;
}

/** Variación relativa entre dos periodos: (actual − anterior) / anterior. */
export function percentChange(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) return current === 0 ? 0 : 1;
  return (current - previous) / Math.abs(previous);
}

export function sum(values: number[]): number {
  return roundTo(
    values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0),
    2,
  );
}

/** Total de una orden a partir de sus ítems. */
export function orderTotal(items: { quantity: number; unitPrice: number }[]): number {
  return sum(items.map((i) => i.quantity * i.unitPrice));
}
