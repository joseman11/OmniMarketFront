/**
 * Adaptador mock: emula el backend en el navegador (NEXT_PUBLIC_USE_MOCKS=true).
 * Persiste en localStorage para que el Kanban sea idéntico tras recargar.
 * NO usar en producción.
 */
import {
  categoryInputSchema,
  moveOrderInputSchema,
  ORDER_STATUSES,
  paginationSchema,
  productInputSchema,
  type OrderStatus,
} from "../schemas";
import { z } from "zod";
import type { TransportRequest, TransportResponse } from "../transport";
import { createSeed, type MockDb, type RawCard, type RawCategory, type RawProduct } from "./seed";

const STORAGE_KEY = "omnimarket.mock.db.v2";
const CONTROLS_KEY = "omnimarket.mock.controls.v1";

export type MockControls = {
  /** Fuerza que la siguiente mutación falle con HTTP 500 (para ver el rollback). */
  failMutations: boolean;
};

let memoryDb: MockDb | null = null;

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadDb(): MockDb {
  // localStorage es la fuente de verdad (compartida entre pestañas → permite 409 reales).
  if (hasStorage()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        memoryDb = JSON.parse(raw) as MockDb;
        return memoryDb;
      }
    } catch {
      /* almacenamiento corrupto: se re-siembra */
    }
  } else if (memoryDb) {
    return memoryDb;
  }
  memoryDb = createSeed();
  saveDb(memoryDb);
  return memoryDb;
}

function saveDb(db: MockDb) {
  memoryDb = db;
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* cuota excedida o modo privado: se mantiene en memoria */
  }
}

export function getMockControls(): MockControls {
  if (!hasStorage()) return { failMutations: false };
  try {
    const raw = window.localStorage.getItem(CONTROLS_KEY);
    return raw ? { failMutations: false, ...(JSON.parse(raw) as Partial<MockControls>) } : { failMutations: false };
  } catch {
    return { failMutations: false };
  }
}

export function setMockControls(next: MockControls) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(CONTROLS_KEY, JSON.stringify(next));
  } catch {
    /* ignorar */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function json(status: number, body: unknown) {
  return { status, body };
}

function renumber(cards: RawCard[], status: OrderStatus) {
  const ordered = cards
    .filter((c) => c.status === status)
    .sort((a, b) => a.position - b.position);
  ordered.forEach((card, index) => {
    if (card.position !== index) {
      card.position = index;
      card.version += 1;
      card.updatedAt = new Date().toISOString();
    }
  });
}

function categoryById(db: MockDb, id: string) {
  return db.categories.find((category) => category.id === id);
}

function productResponse(db: MockDb, product: RawProduct) {
  const category = categoryById(db, product.categoryId);
  if (!category) return null;
  return { ...product, category };
}

function orderDetailResponse(db: MockDb, card: RawCard) {
  return {
    item: {
      id: card.id,
      orderNumber: card.orderNumber,
      customer: { name: card.customerName, email: card.customerEmail, city: null },
      total: card.total,
      margin: card.margin,
      position: card.position,
      version: card.version,
      status: card.status,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      items: card.items.map((line) => {
        const product = db.products.find((candidate) => candidate.id === line.productId);
        return { ...line, product: product ? productResponse(db, product) : null };
      }),
    },
  };
}

function productInput(value: unknown) {
  return productInputSchema.safeParse(value);
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function route(req: TransportRequest): { status: number; body: unknown } {
  const db = loadDb();
  const { method, path } = req;
  const mutating = method !== "GET" && path !== "/api/test/reset-data" && path !== "/api/internal/test-reset";
  if (mutating && getMockControls().failMutations) {
    return json(500, { error: "Error simulado del servidor (modo mock)" });
  }

  if (method === "GET" && path === "/api/health") {
    return json(200, { status: "ok", service: "omnimarket-api" });
  }

  if (method === "GET" && (path === "/api/analytics" || path === "/api/test/analytics")) {
    const parsed = paginationSchema.safeParse({ page: req.query?.page ?? 1, limit: req.query?.limit ?? 50 });
    if (!parsed.success) {
      return json(400, { error: parsed.error.issues[0]?.message ?? "Parámetros inválidos" });
    }
    const { page, limit } = parsed.data;
    const from = req.query?.from ? String(req.query.from) : undefined;
    const to = req.query?.to ? String(req.query.to) : undefined;
    const categoryId = req.query?.categoryId ? String(req.query.categoryId) : undefined;
    const rows = db.analytics
      .filter((r) => (!from || r.day >= from) && (!to || r.day <= to))
      .filter((r) => !categoryId || r.categoryId === categoryId)
      .sort((a, b) => (a.day === b.day ? a.categoryName.localeCompare(b.categoryName) : b.day.localeCompare(a.day)));
    const total = rows.length;
    const totalPages = Math.ceil(total / limit);
    const selectedRows = rows.slice((page - 1) * limit, page * limit);
    const revenue = rows.reduce((sum, row) => sum + Number(row.revenue), 0);
    const ordersCount = rows.reduce((sum, row) => sum + row.ordersCount, 0);
    const grossMargin = rows.reduce((sum, row) => sum + Number(row.grossMargin), 0);
    return json(200, {
      summary: {
        ordersCount,
        revenue: revenue.toFixed(2),
        avgTicket: ordersCount ? (revenue / ordersCount).toFixed(2) : "0.00",
        grossMargin: grossMargin.toFixed(2),
      },
      items: selectedRows.map((row) => ({
        day: row.day,
        category: {
          id: row.categoryId,
          name: row.categoryName,
          slug: db.categories.find((category) => category.id === row.categoryId)?.slug ?? row.categoryId,
        },
        ordersCount: row.ordersCount,
        revenue: row.revenue,
        avgTicket: row.avgTicket,
        grossMargin: row.grossMargin,
      })),
      pagination: { total, page, limit, totalPages },
    });
  }

  if (method === "GET" && path === "/api/categories") {
    return json(200, { items: db.categories });
  }

  if (method === "GET" && path === "/api/products") {
    const parsed = paginationSchema.safeParse({ page: req.query?.page ?? 1, limit: req.query?.limit ?? 50 });
    if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? "Paginación inválida" });
    const { page, limit } = parsed.data;
    const active = req.query?.active === undefined ? undefined : String(req.query.active) === "true";
    const categoryId = req.query?.categoryId ? String(req.query.categoryId) : undefined;
    const search = req.query?.search ? String(req.query.search).trim().toLowerCase() : "";
    const items = db.products
      .filter((product) => active === undefined || product.isActive === active)
      .filter((product) => !categoryId || product.categoryId === categoryId)
      .filter((product) => !search || `${product.name} ${product.sku}`.toLowerCase().includes(search))
      .map((product) => productResponse(db, product))
      .filter((product) => product !== null);
    return json(200, {
      items: items.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) },
    });
  }

  const categoryMatch = path.match(/^\/api\/categories\/([^/]+)$/);
  if (categoryMatch) {
    const id = decodeURIComponent(categoryMatch[1]!);
    const category = db.categories.find((item) => item.id === id);
    if (!category) return json(404, { error: "Category not found." });
    if (method === "PATCH") {
      const parsed = categoryInputSchema.partial().refine((value) => Object.keys(value).length > 0).safeParse(req.body);
      if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? "Invalid category." });
      const updated = { ...category, ...parsed.data };
      db.categories[db.categories.indexOf(category)] = updated;
      saveDb(db);
      return json(200, { item: updated });
    }
    if (method === "DELETE") {
      if (db.products.some((product) => product.categoryId === id)) return json(409, { error: "Category has products." });
      db.categories = db.categories.filter((item) => item.id !== id);
      saveDb(db);
      return json(204, null);
    }
  }

  if (method === "POST" && path === "/api/categories") {
    const parsed = categoryInputSchema.safeParse(req.body);
    if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? "Invalid category." });
    if (db.categories.some((category) => category.slug === parsed.data.slug)) return json(409, { error: "Category slug already exists." });
    const category: RawCategory = { id: crypto.randomUUID(), ...parsed.data };
    db.categories.push(category);
    saveDb(db);
    return json(201, { item: category });
  }

  const productMatch = path.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch) {
    const id = decodeURIComponent(productMatch[1]!);
    const product = db.products.find((item) => item.id === id);
    if (!product) return json(404, { error: "Product not found." });
    if (method === "GET") return json(200, { item: productResponse(db, product) });
    if (method === "PATCH") {
      const parsed = productInput(req.body);
      if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? "Invalid product." });
      if (!categoryById(db, parsed.data.categoryId)) return json(400, { error: "The selected category is not available." });
      if (db.products.some((item) => item.id !== id && item.sku.toLowerCase() === parsed.data.sku.toLowerCase())) return json(409, { error: "SKU already exists." });
      Object.assign(product, { ...parsed.data, sku: parsed.data.sku.toUpperCase(), price: String(parsed.data.price), cost: String(parsed.data.cost) });
      saveDb(db);
      return json(200, { item: productResponse(db, product) });
    }
    if (method === "DELETE") {
      if (db.cards.some((card) => card.items.some((line) => line.productId === id))) return json(409, { error: "Product has order history." });
      db.products = db.products.filter((item) => item.id !== id);
      saveDb(db);
      return json(204, null);
    }
  }

  if (method === "POST" && path === "/api/products") {
    const parsed = productInput(req.body);
    if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? "Invalid product." });
    if (!categoryById(db, parsed.data.categoryId)) return json(400, { error: "The selected category is not available." });
    if (db.products.some((item) => item.sku.toLowerCase() === parsed.data.sku.toLowerCase())) return json(409, { error: "SKU already exists." });
    const product: RawProduct = {
      id: newId("prd"),
      ...parsed.data,
      sku: parsed.data.sku.toUpperCase(),
      price: String(parsed.data.price),
      cost: String(parsed.data.cost),
    };
    db.products.push(product);
    saveDb(db);
    return json(201, { item: productResponse(db, product) });
  }

  if (method === "GET" && path === "/api/orders") {
    const parsed = paginationSchema.safeParse({ page: req.query?.page ?? 1, limit: req.query?.limit ?? 50 });
    if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? "Paginación inválida" });
    const { page, limit } = parsed.data;
    const cards = [...db.cards].sort((a, b) => a.status.localeCompare(b.status) || a.position - b.position);
    const items = cards.slice((page - 1) * limit, page * limit).map((card) => ({
      id: card.id,
      orderNumber: card.orderNumber,
      customer: { name: card.customerName, email: card.customerEmail },
      total: card.total,
      margin: card.margin,
      position: card.position,
      version: card.version,
      status: card.status,
      updatedAt: card.updatedAt,
    }));
    return json(200, { items, pagination: { page, limit, total: cards.length, totalPages: Math.ceil(cards.length / limit) } });
  }

  const orderMatch = path.match(/^\/api\/orders\/([^/]+)$/);
  if (method === "GET" && orderMatch) {
    const id = decodeURIComponent(orderMatch[1]!);
    const card = db.cards.find((item) => item.id === id);
    return card ? json(200, orderDetailResponse(db, card)) : json(404, { error: "Order not found." });
  }

  if (method === "GET" && path === "/api/test/kanban-status") {
    const id = req.query?.orderId ? String(req.query.orderId) : undefined;
    const orderNumber = req.query?.orderNumber ? String(req.query.orderNumber) : undefined;
    if (!id && !orderNumber) return json(400, { error: "Provide orderId or orderNumber." });
    const card = db.cards.find((item) => id ? item.id === id : item.orderNumber === orderNumber);
    if (card) return json(200, { id: card.id, orderNumber: card.orderNumber, status: card.status, position: card.position, version: card.version, updatedAt: card.updatedAt });
    if (!id && orderNumber === "OM-TEST-1001") {
      return json(200, {
        id: "00000000-0000-4000-8000-000000000100",
        orderNumber,
        status: "PENDING",
        position: 0,
        version: 1,
        updatedAt: db.seededAt,
      });
    }
    return json(404, { error: "Order not found." });
  }

  if (method === "GET" && path === "/api/test/contract") {
    return json(200, { endpoints: [
      "GET /api/test/analytics?page=1&limit=50",
      "POST /api/test/reset-data",
      "GET /api/test/kanban-status?orderNumber=OM-TEST-1001",
    ] });
  }

  if (method === "POST" && path === "/api/internal/test-reset") {
    const seeded = createSeed();
    saveDb(seeded);
    return json(200, { reset: true, counts: { categories: seeded.categories.length, products: seeded.products.length, orders: seeded.cards.length } });
  }

  if (method === "POST" && path === "/api/test/reset-data") {
    saveDb(createSeed());
    return json(200, { ok: true, message: "Datos restablecidos al conjunto de prueba conocido." });
  }

  const moveMatch = path.match(/^\/api\/orders\/([^/]+)\/status$/);
  if (method === "PATCH" && moveMatch) {
    const id = decodeURIComponent(moveMatch[1]!);
    const parsed = z.object({ status: moveOrderInputSchema.shape.toStatus, position: z.number().int().nonnegative(), expectedVersion: z.number().int().positive() }).safeParse(req.body);
    if (!parsed.success) return json(400, { error: "Cuerpo inválido" });
    const card = db.cards.find((c) => c.id === id);
    if (!card) return json(404, { error: "Orden no encontrada" });
    if (card.version !== parsed.data.expectedVersion) {
      return json(409, { error: "La orden fue modificada por otro usuario", current: card });
    }
    const from = card.status;
    const target = db.cards
      .filter((c) => c.status === parsed.data.status && c.id !== id)
      .sort((a, b) => a.position - b.position);
    const clamped = Math.min(parsed.data.position, target.length);
    target.splice(clamped, 0, card);
    const source = db.cards.filter((c) => c.status === from && c.id !== id).sort((a, b) => a.position - b.position);
    const nextStatus = parsed.data.status;
    const nextPositions = new Map<string, number>();
    target.forEach((c, i) => {
      nextPositions.set(c.id, i);
    });
    if (from !== nextStatus) source.forEach((c, i) => nextPositions.set(c.id, i));
    for (const [orderId, position] of nextPositions) {
      const changed = db.cards.find((item) => item.id === orderId)!;
      if (changed.position !== position || changed.status !== nextStatus || changed.id === id) {
        changed.position = position;
        if (changed.id === id) changed.status = nextStatus;
        changed.version += 1;
        changed.updatedAt = new Date().toISOString();
      }
    }
    saveDb(db);
    return json(200, { item: {
      id: card.id,
      orderNumber: card.orderNumber,
      customer: { name: card.customerName, email: card.customerEmail },
      total: card.total,
      margin: card.margin,
      position: card.position,
      version: card.version,
      status: card.status,
      updatedAt: card.updatedAt,
    } });
  }

  if (method === "PATCH" && path === "/api/orders/bulk") {
    const parsed = z.object({ ids: z.array(z.string()).min(1).max(100), status: z.enum(ORDER_STATUSES) }).safeParse(req.body);
    if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? "Cuerpo inválido" });
    const { ids, status } = parsed.data;
    // Atómico: si falta alguna orden no se aplica ninguna.
    const cards = ids.map((id) => db.cards.find((c) => c.id === id));
    if (cards.some((c) => !c)) return json(404, { error: "Alguna orden no existe; no se aplicó ningún cambio" });
    const touched = new Set<OrderStatus>([status]);
    let base = db.cards.filter((c) => c.status === status && !ids.includes(c.id)).length;
    const changedIds: string[] = [];
    for (const c of cards as RawCard[]) {
      touched.add(c.status);
      if (c.status !== status) {
        c.status = status;
        c.position = base++;
        c.version += 1;
        c.updatedAt = new Date().toISOString();
        changedIds.push(c.id);
      }
    }
    touched.forEach((s) => renumber(db.cards, s));
    saveDb(db);
    return json(200, { updatedCount: changedIds.length, ids: changedIds });
  }

  const orderMutationMatch = path.match(/^\/api\/orders\/([^/]+)$/);
  if (method === "PATCH" && orderMutationMatch) {
    const id = decodeURIComponent(orderMutationMatch[1]!);
    const parsed = z.object({
      expectedVersion: z.number().int().positive(),
      items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1) })).min(1).max(100),
    }).safeParse(req.body);
    if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? "Invalid order." });
    const card = db.cards.find((item) => item.id === id);
    if (!card) return json(404, { error: "Order not found." });
    if (card.version !== parsed.data.expectedVersion) return json(409, { error: "This order was updated by another request; reload and retry." });
    const pricedItems: RawCard["items"] = [];
    for (const line of parsed.data.items) {
      const product = db.products.find((item) => item.id === line.productId && item.isActive);
      if (!product) return json(400, { error: "Every order item must reference an active product." });
      pricedItems.push({
        id: newId("line"),
        productId: product.id,
        quantity: line.quantity,
        unitPrice: product.price,
        unitCost: product.cost,
      });
    }
    const total = pricedItems.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
    const cost = pricedItems.reduce((sum, line) => sum + Number(line.unitCost) * line.quantity, 0);
    card.items = pricedItems;
    card.total = total.toFixed(2);
    card.margin = (total - cost).toFixed(2);
    card.version += 1;
    card.updatedAt = new Date().toISOString();
    saveDb(db);
    return json(200, orderDetailResponse(db, card));
  }

  if (method === "DELETE" && orderMutationMatch) {
    const id = decodeURIComponent(orderMutationMatch[1]!);
    const card = db.cards.find((item) => item.id === id);
    if (!card) return json(404, { error: "Order not found." });
    const oldStatus = card.status;
    db.cards = db.cards.filter((item) => item.id !== id);
    renumber(db.cards, oldStatus);
    saveDb(db);
    return json(204, null);
  }

  if (method === "POST" && path === "/api/orders") {
    const parsed = z.object({
      customer: z.object({ name: z.string().min(1), email: z.string().email() }),
      items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1) })).min(1),
    }).safeParse(req.body);
    if (!parsed.success) return json(422, { error: "Datos inválidos" });
    const { customer, items } = parsed.data;
    let total = 0;
    let cost = 0;
    for (const it of items) {
      const p = db.products.find((product) => product.id === it.productId && product.isActive);
      if (!p) return json(422, { error: `Producto desconocido o inactivo: ${it.productId}` });
      total += Number(p.price) * it.quantity;
      cost += Number(p.cost) * it.quantity;
    }
    const seq = db.nextOrderSeq++;
    const status: OrderStatus = "PENDING";
    const position = db.cards.filter((c) => c.status === status).length;
    const now = new Date().toISOString();
    const card: RawCard = {
      id: `ord_${seq.toString(36)}${Date.now().toString(36)}`,
      orderNumber: `OM-${seq}`,
      customerName: customer.name,
      customerEmail: customer.email,
      createdAt: now,
      items: items.map((line) => {
        const product = db.products.find((candidate) => candidate.id === line.productId)!;
        return {
          id: newId("line"),
          productId: product.id,
          quantity: line.quantity,
          unitPrice: product.price,
          unitCost: product.cost,
        };
      }),
      total: total.toFixed(2),
      margin: (total - cost).toFixed(2),
      position,
      version: 1,
      status,
      updatedAt: now,
    };
    db.cards.push(card);
    saveDb(db);
    return json(201, { item: {
      id: card.id,
      orderNumber: card.orderNumber,
      customer: { name: card.customerName, email: card.customerEmail },
      total: card.total,
      margin: card.margin,
      position: card.position,
      version: card.version,
      status: card.status,
      updatedAt: card.updatedAt,
    } });
  }

  return json(404, { error: `Ruta mock no implementada: ${method} ${path}` });
}

export async function mockTransport(req: TransportRequest): Promise<TransportResponse> {
  const started = performance.now();
  // Latencia realista bajo el SLA de 300 ms
  await sleep(70 + Math.random() * 150);
  if (req.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  // Clonado profundo: el consumidor nunca comparte referencias con la "BD".
  const { status, body } = route(req);
  return {
    status,
    body: body === undefined ? null : JSON.parse(JSON.stringify(body)),
    latencyMs: performance.now() - started,
  };
}

/** Utilidad para tests/depuración. */
export function __resetMockDb() {
  memoryDb = null;
  if (hasStorage()) window.localStorage.removeItem(STORAGE_KEY);
}

