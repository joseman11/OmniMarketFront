import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { SWRConfig, useSWRConfig, type ScopedMutator } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMockDb, mockTransport } from "@/lib/api/mock/server";
import { OrderDetail } from "@/components/orders/order-detail";
import { server } from "./setup";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }) }));

type Detail = { item: { id: string; version: number } & Record<string, unknown> };

let order: Detail["item"];
let patchBodies: { expectedVersion: number }[];
let globalMutate: ScopedMutator;

function CaptureMutate() {
  globalMutate = useSWRConfig().mutate;
  return null;
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false, revalidateOnFocus: false }}>
    <CaptureMutate />
    {children}
  </SWRConfig>
);

beforeEach(async () => {
  __resetMockDb();
  // Fixtures válidas según los esquemas reales: se toman del adaptador mock.
  const list = await mockTransport({ method: "GET", path: "/api/orders", query: { page: 1, limit: 100 } });
  const firstId = (list.body as { items: { id: string }[] }).items[0]!.id;
  order = ((await mockTransport({ method: "GET", path: `/api/orders/${firstId}` })).body as Detail).item;
  const products = (await mockTransport({ method: "GET", path: "/api/products", query: { page: 1, limit: 100 } })).body as Record<string, unknown>;
  patchBodies = [];

  server.use(
    http.get("/backend/orders/:id", () => HttpResponse.json({ item: order })),
    http.get("/backend/products", () => HttpResponse.json(products)),
    http.patch("/backend/orders/:id", async ({ request }) => {
      const body = (await request.json()) as { expectedVersion: number };
      patchBodies.push(body);
      if (body.expectedVersion !== order.version) return HttpResponse.json({ error: "Versión obsoleta" }, { status: 409 });
      order = { ...order, version: order.version + 1 };
      return HttpResponse.json({ item: order });
    }),
  );
});

describe("editor de artículos ante 409 (E3)", () => {
  it("conserva baseVersion pese a la revalidación, bloquea el reintento y sólo guarda tras recargar", async () => {
    const user = userEvent.setup();
    render(<OrderDetail orderId={order.id} />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Editar artículos" }));

    // Otra sesión guarda v2 y esta pestaña revalida la orden mientras edita.
    order = { ...order, version: 2 };
    await globalMutate(["order-detail", order.id]);
    await screen.findByText(/versión 2/);

    await user.click(screen.getByRole("button", { name: "Guardar artículos" }));
    await screen.findByText(/cambió en otra sesión desde la versión 1/);
    expect(patchBodies).toEqual([expect.objectContaining({ expectedVersion: 1 })]);

    // Reintento bloqueado: botón deshabilitado y el envío del formulario no llega a la red.
    const save = screen.getByRole("button", { name: "Guardar artículos" });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(save.closest("form")!);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(patchBodies).toHaveLength(1);

    // Decisión explícita: recargar trae contenido y versión juntos; ahora sí se guarda con v2.
    await user.click(screen.getByRole("button", { name: "Recargar orden" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Guardar artículos" }) as HTMLButtonElement).disabled).toBe(false));
    await user.click(screen.getByRole("button", { name: "Guardar artículos" }));
    await waitFor(() => expect(patchBodies).toHaveLength(2));
    expect(patchBodies[1]).toMatchObject({ expectedVersion: 2 });
    await screen.findByRole("button", { name: "Editar artículos" });
  });

  it("bloquea el doble envío síncrono del mismo borrador", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.patch("/backend/orders/:id", async ({ request }) => {
        patchBodies.push((await request.json()) as { expectedVersion: number });
        await gate;
        order = { ...order, version: order.version + 1 };
        return HttpResponse.json({ item: order });
      }),
    );
    const user = userEvent.setup();
    render(<OrderDetail orderId={order.id} />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Editar artículos" }));
    const form = screen.getByRole("button", { name: "Guardar artículos" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(patchBodies).toHaveLength(1));
    release();
    await screen.findByRole("button", { name: "Editar artículos" });
    expect(patchBodies).toHaveLength(1);
  });
});
