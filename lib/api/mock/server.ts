/**
 * Adaptador mock: emula el backend en el navegador (NEXT_PUBLIC_USE_MOCKS=true).
 * Persiste en localStorage para que el Kanban sea idéntico tras recargar.
 * NO usar en producción.
 */
import { findProduct } from "@/lib/catalog";
import {
  bulkUpdateInputSchema,
  createOrderInputSchema,
  moveOrderInputSchema,
  ORDER_STATUSES,
  paginationSchema,
  type OrderStatus,
} from "../schemas";
import type { TransportRequest, TransportResponse } from "../transport";
import { createSeed, type MockDb, type RawCard } from "./seed";

const STORAGE_KEY = "omnimarket.mock.db.v1";
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
  cards
    .filter((c) => c.status === status)
    .sort((a, b) => a.position - b.position)
    .forEach((c, i) => {
      c.position = i;
    });
}

function boardResponse(db: MockDb) {
  return {
    columns: ORDER_STATUSES.map((status) => {
      const cards = db.cards
        .filter((c) => c.status === status)
        .sort((a, b) => a.position - b.position);
      return { status, count: cards.length, cards };
    }),
  };
}

function route(req: TransportRequest): { status: number; body: unknown } {
  const db = loadDb();
  const { method, path } = req;
  const mutating = method !== "GET" && path !== "/api/test/reset-data";
  if (mutating && getMockControls().failMutations) {
    return json(500, { error: "Error simulado del servidor (modo mock)" });
  }

  if (method === "GET" && path === "/api/test/analytics") {
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
    return json(200, {
      data: rows.slice((page - 1) * limit, page * limit),
      meta: { total, page, pageSize: limit, totalPages },
    });
  }

  if (method === "GET" && path === "/api/test/kanban-status") {
    return json(200, boardResponse(db));
  }

  if (method === "POST" && path === "/api/test/reset-data") {
    saveDb(createSeed());
    return json(200, { ok: true, message: "Datos restablecidos al conjunto de prueba conocido." });
  }

  const moveMatch = path.match(/^\/api\/orders\/([^/]+)\/move$/);
  if (method === "PATCH" && moveMatch) {
    const id = decodeURIComponent(moveMatch[1]!);
    const parsed = moveOrderInputSchema.safeParse(req.body);
    if (!parsed.success) return json(400, { error: "Cuerpo inválido" });
    const card = db.cards.find((c) => c.id === id);
    if (!card) return json(404, { error: "Orden no encontrada" });
    if (card.version !== parsed.data.version) {
      return json(409, { error: "La orden fue modificada por otro usuario", current: card });
    }
    const { toStatus, toPosition } = parsed.data;
    const from = card.status;
    // Sacar de la columna origen
    const target = db.cards
      .filter((c) => c.status === toStatus && c.id !== id)
      .sort((a, b) => a.position - b.position);
    const clamped = Math.min(toPosition, target.length);
    target.splice(clamped, 0, card);
    card.status = toStatus;
    card.version += 1;
    card.updatedAt = new Date().toISOString();
    target.forEach((c, i) => {
      c.position = i;
    });
    if (from !== toStatus) renumber(db.cards, from);
    saveDb(db);
    return json(200, card);
  }

  if (method === "POST" && path === "/api/orders/bulk") {
    const parsed = bulkUpdateInputSchema.safeParse(req.body);
    if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? "Cuerpo inválido" });
    const { ids, patch } = parsed.data;
    // Atómico: si falta alguna orden no se aplica ninguna.
    const cards = ids.map((id) => db.cards.find((c) => c.id === id));
    if (cards.some((c) => !c)) return json(404, { error: "Alguna orden no existe; no se aplicó ningún cambio" });
    const touched = new Set<OrderStatus>([patch.status]);
    let base = db.cards.filter((c) => c.status === patch.status && !ids.includes(c.id)).length;
    for (const c of cards as RawCard[]) {
      touched.add(c.status);
      if (c.status !== patch.status) {
        c.status = patch.status;
        c.position = base++;
      }
      c.version += 1;
      c.updatedAt = new Date().toISOString();
    }
    touched.forEach((s) => renumber(db.cards, s));
    saveDb(db);
    return json(200, { updated: ids.length });
  }

  if (method === "POST" && path === "/api/orders") {
    const parsed = createOrderInputSchema.safeParse(req.body);
    if (!parsed.success) return json(422, { error: parsed.error.issues[0]?.message ?? "Datos inválidos" });
    const { customerName, items, status } = parsed.data;
    let total = 0;
    let cost = 0;
    for (const it of items) {
      const p = findProduct(it.productId);
      if (!p) return json(422, { error: `Producto desconocido: ${it.productId}` });
      total += p.price * it.quantity;
      cost += p.cost * it.quantity;
    }
    const seq = db.nextOrderSeq++;
    db.cards
      .filter((c) => c.status === status)
      .forEach((c) => {
        c.position += 1;
      });
    const card: RawCard = {
      id: `ord_${seq.toString(36)}${Date.now().toString(36)}`,
      orderNumber: `OM-${seq}`,
      customerName,
      total: total.toFixed(2),
      margin: (total - cost).toFixed(2),
      position: 0,
      version: 1,
      status,
      updatedAt: new Date().toISOString(),
    };
    db.cards.push(card);
    saveDb(db);
    return json(201, card);
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

