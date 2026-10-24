import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import useSWR from "swr";
import { describe, expect, it, vi } from "vitest";
import { SessionScope } from "@/components/dashboard/session-scope";
import { api } from "@/lib/api/client";
import { server } from "./setup";

function Categories() {
  const { data, error } = useSWR("categories", () => api.getCategories());
  if (error) return <p>error {(error as Error).message}</p>;
  return <p>{data ? `categorías: ${data.data.items.length}` : "cargando"}</p>;
}

describe("SessionScope (S2)", () => {
  it("un 401 en lectura termina la sesión cliente: vacía y desmonta el contenido", async () => {
    server.use(http.get("/backend/categories", () => HttpResponse.json({ error: "Sesión expirada" }, { status: 401 })));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {}); // jsdom: navegación no implementada
    render(
      <SessionScope userId="u1">
        <Categories />
      </SessionScope>,
    );
    await waitFor(() => expect(screen.queryByText(/cargando|error|categorías/)).toBeNull());
    errorLog.mockRestore();
  });

  it("un 403 no cierra la sesión: el contenido sigue montado con su error", async () => {
    server.use(http.get("/backend/categories", () => HttpResponse.json({ error: "Sin permiso" }, { status: 403 })));
    render(
      <SessionScope userId="u1">
        <Categories />
      </SessionScope>,
    );
    expect(await screen.findByText("error Sin permiso")).toBeTruthy();
  });

  it("cada identidad tiene su propia caché: remontar con otro usuario no reutiliza datos", async () => {
    let calls = 0;
    server.use(
      http.get("/backend/categories", () => {
        calls += 1;
        return HttpResponse.json({ items: Array.from({ length: calls }, (_, i) => ({ id: `c${i}`, name: `C${i}`, slug: `c${i}` })) });
      }),
    );
    const { rerender } = render(
      <SessionScope key="u1" userId="u1">
        <Categories />
      </SessionScope>,
    );
    expect(await screen.findByText("categorías: 1")).toBeTruthy();
    rerender(
      <SessionScope key="u2" userId="u2">
        <Categories />
      </SessionScope>,
    );
    expect(screen.queryByText("categorías: 1")).toBeNull();
    expect(await screen.findByText("categorías: 2")).toBeTruthy();
  });
});
