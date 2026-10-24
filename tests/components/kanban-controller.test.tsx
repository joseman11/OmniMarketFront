import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it } from "vitest";
import { useKanbanController } from "@/components/kanban/use-kanban-controller";
import type { KanbanBoard, KanbanCard, OrderStatus } from "@/lib/api/schemas";
import { server } from "./setup";

type Order = { id: string; orderNumber: string; status: OrderStatus; position: number; version: number };

let orders: Order[];
let calls: { get: number; patch: number; bulk: number; post: number };
let failReads: boolean;
let patchGate: Promise<void> | null;

const toBackend = (o: Order) => ({
  ...o,
  customer: { name: `Cliente ${o.orderNumber}`, email: "c@x.mx" },
  total: "100.00",
  margin: "40.00",
  updatedAt: "2026-10-24T00:00:00.000Z",
});

beforeEach(() => {
  orders = [
    { id: "a", orderNumber: "OM-1", status: "PENDING", position: 0, version: 1 },
    { id: "b", orderNumber: "OM-2", status: "PENDING", position: 1, version: 1 },
  ];
  calls = { get: 0, patch: 0, bulk: 0, post: 0 };
  failReads = false;
  patchGate = null;
  server.use(
    http.get("/backend/orders", () => {
      calls.get += 1;
      if (failReads) return HttpResponse.json({ error: "Lectura caída" }, { status: 500 });
      return HttpResponse.json({ items: orders.map(toBackend), pagination: { page: 1, limit: 100, total: orders.length, totalPages: 1 } });
    }),
    http.patch("/backend/orders/bulk", async () => {
      calls.bulk += 1;
      return HttpResponse.json({ updatedCount: 0, ids: [] });
    }),
    http.patch("/backend/orders/:id/status", async ({ params, request }) => {
      calls.patch += 1;
      if (patchGate) await patchGate;
      const body = (await request.json()) as { status: OrderStatus; position: number; expectedVersion: number };
      const order = orders.find((o) => o.id === params.id)!;
      if (order.version !== body.expectedVersion) return HttpResponse.json({ error: "conflicto" }, { status: 409 });
      Object.assign(order, { status: body.status, position: body.position, version: order.version + 1 });
      return HttpResponse.json({ item: toBackend(order) });
    }),
    http.post("/backend/orders", () => {
      calls.post += 1;
      return HttpResponse.json({ error: "no" }, { status: 500 });
    }),
  );
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{children}</SWRConfig>
);

const cardOf = (board: KanbanBoard | undefined, id: string): KanbanCard | undefined =>
  board?.columns.flatMap((c) => c.cards).find((c) => c.id === id);

async function setup() {
  const hook = renderHook(() => useKanbanController(), { wrapper });
  await waitFor(() => expect(hook.result.current.data).toBeDefined());
  return hook;
}

describe("coordinador del Kanban (E1/E2)", () => {
  it("PATCH exitoso + GET 500: conserva el dato confirmado, marca sincronización pendiente y no repite el PATCH", async () => {
    const { result } = await setup();
    const card = cardOf(result.current.data, "a")!;
    failReads = true;

    let outcome!: Awaited<ReturnType<typeof result.current.move>>;
    await act(async () => {
      outcome = await result.current.move(card, "SHIPPED", 0);
    });

    expect(outcome).toMatchObject({ blocked: false, write: "saved", synchronized: false });
    expect(result.current.phase).toBe("needs-sync");
    // Sin falso rollback: la tarjeta queda donde el servidor la confirmó, con su versión nueva.
    const saved = cardOf(result.current.data, "a")!;
    expect(saved.status).toBe("SHIPPED");
    expect(saved.version).toBe(2);
    expect(calls.patch).toBe(1);

    // Mientras no se sincronice no se aceptan más escrituras.
    let blocked!: Awaited<ReturnType<typeof result.current.move>>;
    await act(async () => {
      blocked = await result.current.move(cardOf(result.current.data, "b")!, "DELIVERED", 0);
    });
    expect(blocked).toEqual({ blocked: true });

    // El reintento sólo lee.
    failReads = false;
    const getsBefore = calls.get;
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.phase).toBe("idle");
    expect(calls.patch).toBe(1);
    expect(calls.get).toBe(getsBefore + 1);
  });

  it("serializa: un segundo movimiento, un bulk o un alta durante una escritura pendiente se bloquean sin tocar la red", async () => {
    const { result } = await setup();
    let release!: () => void;
    patchGate = new Promise<void>((resolve) => (release = resolve));
    const cardA = cardOf(result.current.data, "a")!;

    let first!: Promise<Awaited<ReturnType<typeof result.current.move>>>;
    act(() => {
      first = result.current.move(cardA, "PROCESSING", 0);
    });
    await waitFor(() => expect(calls.patch).toBe(1));

    // Misma tarjeta con la versión vieja y otra tarjeta: ambas bloqueadas.
    const again = await result.current.move(cardA, "DELIVERED", 0);
    const other = await result.current.move(cardOf(result.current.data, "b")!, "SHIPPED", 0);
    const bulk = await result.current.bulk({ ids: ["b"], patch: { status: "CANCELLED" } });
    const created = await result.current.create({ customerName: "Ana Prueba", customerEmail: "ana@x.mx", items: [{ productId: "p", quantity: 1 }] });
    expect([again, other, bulk, created]).toEqual([{ blocked: true }, { blocked: true }, { blocked: true }, { blocked: true }]);
    expect(calls).toMatchObject({ patch: 1, bulk: 0, post: 0 });

    await act(async () => {
      release();
      await first;
    });
    expect((await first)).toMatchObject({ write: "saved", synchronized: true });
    expect(result.current.phase).toBe("idle");

    // Terminada la escritura, el siguiente movimiento usa la versión confirmada (2), no la vieja.
    const fresh = cardOf(result.current.data, "a")!;
    expect(fresh.version).toBe(2);
    let next!: Awaited<ReturnType<typeof result.current.move>>;
    patchGate = null;
    await act(async () => {
      next = await result.current.move(fresh, "SHIPPED", 0);
    });
    expect(next).toMatchObject({ write: "saved", synchronized: true });
  });

  it("5xx en la escritura: resultado indeterminado, se muestra el estado del servidor sin afirmar rollback", async () => {
    server.use(http.patch("/backend/orders/:id/status", () => {
      calls.patch += 1;
      return HttpResponse.json({ error: "caído" }, { status: 503 });
    }));
    const { result } = await setup();
    let outcome!: Awaited<ReturnType<typeof result.current.move>>;
    await act(async () => {
      outcome = await result.current.move(cardOf(result.current.data, "a")!, "SHIPPED", 0);
    });
    expect(outcome).toMatchObject({ write: "unknown", synchronized: true });
    expect(cardOf(result.current.data, "a")!.status).toBe("PENDING"); // lo que reporta el servidor
    expect(result.current.phase).toBe("idle");
  });

  it("un alta con 5xx no se reintenta automáticamente", async () => {
    const { result } = await setup();
    let outcome!: Awaited<ReturnType<typeof result.current.create>>;
    await act(async () => {
      outcome = await result.current.create({ customerName: "Ana Prueba", customerEmail: "ana@x.mx", items: [{ productId: "p", quantity: 1 }] });
    });
    expect(outcome).toMatchObject({ write: "unknown" });
    expect(calls.post).toBe(1);
  });
});
