import { beforeEach, describe, expect, it } from "vitest";
import { __resetMockDb, mockTransport } from "@/lib/api/mock/server";
import type { TransportRequest } from "@/lib/api/transport";

async function call(request: TransportRequest) {
  return mockTransport(request);
}

describe("contratos mock de las pantallas nuevas", () => {
  beforeEach(() => __resetMockDb());

  it("permite crear, consultar, editar y eliminar categoría y producto", async () => {
    const categories = await call({ method: "GET", path: "/api/categories" });
    const firstCategory = (categories.body as { items: Array<{ id: string }> }).items[0]!;

    const category = await call({
      method: "POST",
      path: "/api/categories",
      body: { name: "Accesorios", slug: "accesorios" },
    });
    expect(category.status).toBe(201);
    const categoryId = (category.body as { item: { id: string } }).item.id;
    expect(categoryId).toMatch(/^[0-9a-f-]{36}$/i);

    const productInput = {
      categoryId,
      sku: "ACC-001",
      name: "Funda de viaje",
      price: "499.00",
      cost: "200.00",
      stock: 8,
      isActive: true,
    };
    const created = await call({ method: "POST", path: "/api/products", body: productInput });
    expect(created.status).toBe(201);
    const productId = (created.body as { item: { id: string; category: { id: string } } }).item.id;
    expect((created.body as { item: { category: { id: string } } }).item.category.id).toBe(categoryId);

    const detail = await call({ method: "GET", path: `/api/products/${productId}` });
    expect(detail.status).toBe(200);
    expect((detail.body as { item: { sku: string } }).item.sku).toBe("ACC-001");

    const updated = await call({
      method: "PATCH",
      path: `/api/products/${productId}`,
      body: { ...productInput, name: "Funda reforzada", stock: 12 },
    });
    expect((updated.body as { item: { name: string; stock: number } }).item).toMatchObject({ name: "Funda reforzada", stock: 12 });

    expect((await call({ method: "DELETE", path: `/api/products/${productId}` })).status).toBe(204);
    expect((await call({ method: "DELETE", path: `/api/categories/${categoryId}` })).status).toBe(204);

    const categoryUpdate = await call({ method: "PATCH", path: `/api/categories/${firstCategory.id}`, body: { name: "Electrónica de consumo", slug: "electronica-consumo" } });
    expect((categoryUpdate.body as { item: { slug: string } }).item.slug).toBe("electronica-consumo");
  });

  it("consulta el detalle, actualiza artículos con versión y elimina una orden", async () => {
    const orders = await call({ method: "GET", path: "/api/orders", query: { page: 1, limit: 100 } });
    const first = (orders.body as { items: Array<{ id: string }> }).items[0]!;
    const detail = await call({ method: "GET", path: `/api/orders/${first.id}` });
    const order = (detail.body as { item: { id: string; version: number; items: Array<{ productId: string }> } }).item;
    expect(detail.status).toBe(200);
    expect(order.items.length).toBeGreaterThan(0);

    const products = await call({ method: "GET", path: "/api/products", query: { page: 1, limit: 100, active: "true" } });
    const productId = (products.body as { items: Array<{ id: string }> }).items[0]!.id;
    const updated = await call({
      method: "PATCH",
      path: `/api/orders/${order.id}`,
      body: { expectedVersion: order.version, items: [{ productId, quantity: 2 }] },
    });
    expect(updated.status).toBe(200);
    expect((updated.body as { item: { version: number; items: Array<{ quantity: number }> } }).item).toMatchObject({ version: order.version + 1, items: [{ quantity: 2 }] });

    const stale = await call({
      method: "PATCH",
      path: `/api/orders/${order.id}`,
      body: { expectedVersion: order.version, items: [{ productId, quantity: 1 }] },
    });
    expect(stale.status).toBe(409);

    expect((await call({ method: "DELETE", path: `/api/orders/${order.id}` })).status).toBe(204);
    expect((await call({ method: "GET", path: `/api/orders/${order.id}` })).status).toBe(404);
  });

  it("expone healthcheck y endpoints de evaluación en Auditoría", async () => {
    expect((await call({ method: "GET", path: "/api/health" })).status).toBe(200);
    expect((await call({ method: "GET", path: "/api/test/analytics", query: { page: 1, limit: 50 } })).status).toBe(200);
    expect((await call({ method: "GET", path: "/api/test/kanban-status", query: { orderNumber: "OM-TEST-1001" } })).status).toBe(200);
    const contract = await call({ method: "GET", path: "/api/test/contract" });
    expect((contract.body as { endpoints: string[] }).endpoints).toContain("GET /api/test/kanban-status?orderNumber=OM-TEST-1001");
  });

  it("filtra productos por texto y paginación sin perder el total", async () => {
    const filtered = await call({
      method: "GET",
      path: "/api/products",
      query: { search: "p-aud-01", active: "true", page: 1, limit: 1 },
    });
    expect(filtered.status).toBe(200);
    expect((filtered.body as { items: Array<{ sku: string }>; pagination: { total: number; page: number } })).toMatchObject({
      items: [expect.objectContaining({ sku: "P-AUD-01" })],
      pagination: { total: 1, page: 1 },
    });
  });

  it("protege categorías que todavía tienen productos asociados", async () => {
    const categories = await call({ method: "GET", path: "/api/categories" });
    const categoryId = (categories.body as { items: Array<{ id: string }> }).items[0]!.id;

    expect((await call({ method: "DELETE", path: `/api/categories/${categoryId}` })).status).toBe(409);
    expect((await call({ method: "GET", path: "/api/categories" })).status).toBe(200);
  });
});
