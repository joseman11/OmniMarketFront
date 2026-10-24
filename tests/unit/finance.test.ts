import { describe, expect, it } from "vitest";
import { averageTicket, grossMargin, marginRatio, orderTotal, percentChange } from "@/lib/finance";

describe("ticket promedio", () => {
  it("divide ingresos entre órdenes y redondea a centavos", () => {
    expect(averageTicket(1000, 3)).toBe(333.33);
  });

  it("devuelve 0 cuando no hay órdenes", () => {
    expect(averageTicket(5000, 0)).toBe(0);
  });
});

describe("margen bruto", () => {
  it("calcula margen absoluto evitando errores de coma flotante", () => {
    expect(grossMargin(100.3, 60.1)).toBe(40.2);
  });

  it("calcula margen % y protege la división entre cero", () => {
    expect(marginRatio(40, 160)).toBe(0.25);
    expect(marginRatio(10, 0)).toBe(0);
  });
});

describe("variación y totales", () => {
  it("calcula la variación relativa entre periodos", () => {
    expect(percentChange(110, 100)).toBeCloseTo(0.1);
    expect(percentChange(0, 0)).toBe(0);
  });

  it("suma el total de una orden a partir de sus ítems", () => {
    expect(orderTotal([{ quantity: 2, unitPrice: 459 }, { quantity: 1, unitPrice: 0.1 }])).toBe(918.1);
  });

  it("maneja ventas nuevas, pedidos vacíos y valores no finitos", () => {
    expect(percentChange(50, 0)).toBe(1);
    expect(averageTicket(Number.POSITIVE_INFINITY, 3)).toBe(0);
    expect(orderTotal([])).toBe(0);
  });
});
