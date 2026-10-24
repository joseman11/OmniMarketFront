import { describe, expect, it } from "vitest";
import {
  analyticsResponseSchema,
  analyticsFiltersSchema,
  bulkUpdateInputSchema,
  categoryInputSchema,
  createOrderInputSchema,
  decimalSchema,
  kanbanStatusResponseSchema,
  paginationSchema,
} from "@/lib/api/schemas";

const validOrder = {
  customerName: "Valeria Hernández",
  customerEmail: "valeria@example.mx",
  items: [{ productId: "p-aud-01", quantity: 2 }],
};

describe("schema de orden", () => {
  it("acepta una orden válida", () => {
    expect(createOrderInputSchema.safeParse(validOrder).success).toBe(true);
  });

  it("rechaza una orden sin ítems, con nombre corto y cantidad fuera de rango", () => {
    const res = createOrderInputSchema.safeParse({
      ...validOrder,
      customerName: "Al",
      items: [{ productId: "p-aud-01", quantity: 0 }],
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const paths = res.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("customerName");
      expect(paths).toContain("items.0.quantity");
    }
    expect(createOrderInputSchema.safeParse({ ...validOrder, items: [] }).success).toBe(false);
  });

  it("rechaza un correo que no cumple el contrato requerido del backend", () => {
    expect(createOrderInputSchema.safeParse({ ...validOrder, customerEmail: "invalido" }).success).toBe(false);
  });
});

describe("schema de paginación", () => {
  it("acepta y coerciona parámetros de query válidos", () => {
    expect(paginationSchema.parse({ page: "2", limit: "50" })).toEqual({ page: 2, limit: 50 });
  });

  it("rechaza página 0, límites negativos, decimales o excesivos", () => {
    expect(paginationSchema.safeParse({ page: 0, limit: 50 }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: 1, limit: -5 }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: 1.5, limit: 50 }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: 1, limit: 10_000 }).success).toBe(false);
  });
});

describe("parseo de respuestas en la frontera", () => {
  it("convierte Decimals string a number en analítica", () => {
    const parsed = analyticsResponseSchema.parse({
      summary: { ordersCount: 12, revenue: "15400.50", avgTicket: "1283.37", grossMargin: "8100.00" },
      items: [
        {
          day: "2026-10-01T00:00:00.000Z",
          category: { id: "3", name: "Moda", slug: "moda" },
          ordersCount: 12,
          revenue: "15400.50",
          avgTicket: "1283.37",
          grossMargin: "8100.00",
        },
      ],
      pagination: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    expect(parsed.data[0]).toMatchObject({ day: "2026-10-01", categoryId: "3", revenue: 15400.5 });
  });

  it("rechaza una tarjeta de Kanban con Decimal inválido", () => {
    const res = kanbanStatusResponseSchema.safeParse({
      columns: [
        {
          status: "PENDING",
          count: 1,
          cards: [
            { id: "1", orderNumber: "OM-1", customerName: "X", total: "n/a", margin: "1", position: 0, version: 1, status: "PENDING" },
          ],
        },
      ],
    });
    expect(res.success).toBe(false);
  });

  it("bulk update exige al menos un id", () => {
    expect(bulkUpdateInputSchema.safeParse({ ids: [], patch: { status: "SHIPPED" } }).success).toBe(false);
    expect(bulkUpdateInputSchema.safeParse({ ids: ["a"], patch: { status: "SHIPPED" } }).success).toBe(true);
  });

  it("valida filtros de analítica con fechas ordenadas y formato ISO", () => {
    expect(analyticsFiltersSchema.safeParse({ from: "2026-10-01", to: "2026-10-31" }).success).toBe(true);
    expect(analyticsFiltersSchema.safeParse({ from: "2026-10-31", to: "2026-10-01" }).success).toBe(false);
    expect(analyticsFiltersSchema.safeParse({ from: "2026/02/30" }).success).toBe(false);
  });

  it("normaliza nombres de categoría y rechaza slugs que no son URL-safe", () => {
    expect(categoryInputSchema.parse({ name: " Hogar ", slug: "hogar-y-cocina" })).toEqual({ name: "Hogar", slug: "hogar-y-cocina" });
    expect(categoryInputSchema.safeParse({ name: "Hogar", slug: "Hogar y Cocina" }).success).toBe(false);
  });

  it("acepta decimales finitos y rechaza texto que no representa un importe", () => {
    expect(decimalSchema.parse("125.50")).toBe(125.5);
    expect(decimalSchema.safeParse("12abc").success).toBe(false);
  });
});
