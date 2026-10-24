import { describe, expect, it, vi } from "vitest";

const TOTAL_PAGES = 12;
let inFlight = 0;
let peak = 0;
const requested: number[] = [];

vi.mock("@/lib/api/transport", () => ({
  transport: async (req: { path: string; query?: { page?: number } }) => {
    const page = Number(req.query?.page ?? 1);
    requested.push(page);
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return {
      status: 200,
      latencyMs: 1,
      body: {
        items: [
          {
            id: `o-${page}`,
            orderNumber: `OM-${page}`,
            customer: { name: `Cliente ${page}`, email: "c@x.mx" },
            total: "10.00",
            margin: "4.00",
            position: page,
            version: 1,
            status: "PENDING",
            updatedAt: "2026-10-24T00:00:00.000Z",
          },
        ],
        pagination: { page, limit: 100, total: TOTAL_PAGES, totalPages: TOTAL_PAGES },
      },
    };
  },
}));

const { api, mapWithConcurrency, PAGE_CONCURRENCY } = await import("@/lib/api/client");

describe("recorrido de páginas con concurrencia limitada (R2)", () => {
  it("getKanbanStatus no supera el límite de peticiones simultáneas y conserva el orden", async () => {
    const result = await api.getKanbanStatus();
    expect(requested).toHaveLength(TOTAL_PAGES);
    expect(peak).toBeLessThanOrEqual(PAGE_CONCURRENCY);
    expect(result.data.columns.find((c) => c.status === "PENDING")?.cards.map((c) => c.orderNumber)).toEqual(
      Array.from({ length: TOTAL_PAGES }, (_, i) => `OM-${i + 1}`),
    );
    expect(result).not.toHaveProperty("raw");
  });

  it("mapWithConcurrency deja de lanzar tareas tras el primer fallo", async () => {
    const started: number[] = [];
    await expect(
      mapWithConcurrency(20, 2, async (i) => {
        started.push(i);
        await new Promise((resolve) => setTimeout(resolve, 1));
        if (i === 1) throw new Error("falla");
        return i;
      }),
    ).rejects.toThrow("falla");
    expect(started.length).toBeLessThan(20);
  });

  it("mapWithConcurrency con 0 tareas devuelve vacío", async () => {
    await expect(mapWithConcurrency(0, 4, async (i) => i)).resolves.toEqual([]);
  });
});
