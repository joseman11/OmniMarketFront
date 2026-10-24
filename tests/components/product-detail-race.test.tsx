import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetMockDb, mockTransport } from "@/lib/api/mock/server";
import { useProductDetail } from "@/lib/hooks/use-api";
import { server } from "./setup";

type Product = { id: string; name: string } & Record<string, unknown>;
let a: Product;
let b: Product;

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{children}</SWRConfig>
);

beforeEach(async () => {
  __resetMockDb();
  const list = (await mockTransport({ method: "GET", path: "/api/products", query: { page: 1, limit: 100 } })).body as { items: Product[] };
  [a, b] = list.items as [Product, Product];
});

describe("detalle de producto A/B (E4)", () => {
  it("la respuesta tardía de A no reemplaza a B", async () => {
    let releaseA!: () => void;
    const gateA = new Promise<void>((resolve) => (releaseA = resolve));
    server.use(
      http.get("/backend/products/:id", async ({ params }) => {
        if (params.id === a.id) await gateA;
        return HttpResponse.json({ item: params.id === a.id ? a : b });
      }),
    );
    const { result, rerender } = renderHook(({ id }) => useProductDetail(id), { wrapper, initialProps: { id: a.id as string | null } });
    rerender({ id: null }); // cerrar mientras A carga
    rerender({ id: b.id }); // abrir B
    await waitFor(() => expect(result.current.data?.name).toBe(b.name));

    await act(async () => {
      releaseA();
      await delay(20);
    });
    expect(result.current.data?.name).toBe(b.name);
  });

  it("el error tardío de A no se atribuye a B", async () => {
    let releaseA!: () => void;
    const gateA = new Promise<void>((resolve) => (releaseA = resolve));
    server.use(
      http.get("/backend/products/:id", async ({ params }) => {
        if (params.id === a.id) {
          await gateA;
          return HttpResponse.json({ error: "A falló" }, { status: 500 });
        }
        return HttpResponse.json({ item: b });
      }),
    );
    const { result, rerender } = renderHook(({ id }) => useProductDetail(id), { wrapper, initialProps: { id: a.id } });
    rerender({ id: b.id });
    await waitFor(() => expect(result.current.data?.name).toBe(b.name));
    await act(async () => {
      releaseA();
      await delay(20);
    });
    expect(result.current.error).toBeUndefined();
    expect(result.current.data?.name).toBe(b.name);
  });

  it("al cambiar de A a B no se muestra A mientras B carga (keepPreviousData: false)", async () => {
    server.use(
      http.get("/backend/products/:id", async ({ params }) => {
        if (params.id === b.id) await delay(50);
        return HttpResponse.json({ item: params.id === a.id ? a : b });
      }),
    );
    const { result, rerender } = renderHook(({ id }) => useProductDetail(id), { wrapper, initialProps: { id: a.id } });
    await waitFor(() => expect(result.current.data?.name).toBe(a.name));
    rerender({ id: b.id });
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data?.name).toBe(b.name));
  });
});
