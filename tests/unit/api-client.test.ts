import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api/client";
import { transport } from "@/lib/api/transport";

vi.mock("@/lib/api/transport", () => ({ transport: vi.fn() }));

const mockedTransport = vi.mocked(transport);

describe("cliente API", () => {
  beforeEach(() => mockedTransport.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("valida y transforma la respuesta de analítica en el contrato del cliente", async () => {
    mockedTransport.mockResolvedValue({
      status: 200,
      latencyMs: 18,
      body: {
        summary: { ordersCount: 2, revenue: "150.50", avgTicket: "75.25", grossMargin: "40.00" },
        items: [{
          day: "2026-10-20T00:00:00.000Z",
          category: { id: "cat-1", name: "Hogar", slug: "hogar" },
          ordersCount: 2,
          revenue: "150.50",
          avgTicket: "75.25",
          grossMargin: "40.00",
        }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    });

    const result = await api.getAnalytics({ page: 1, limit: 10, from: "2026-10-20" });
    expect(result.data.data[0]).toMatchObject({ day: "2026-10-20", categoryId: "cat-1", revenue: 150.5 });
    expect(result.latencyMs).toBe(18);
    expect(mockedTransport).toHaveBeenCalledWith(expect.objectContaining({
      method: "GET",
      path: "/api/analytics",
      query: expect.objectContaining({ page: 1, limit: 10, from: "2026-10-20" }),
    }));
  });

  it("mapea los conflictos HTTP a ApiError con estado y mensaje del backend", async () => {
    mockedTransport.mockResolvedValue({
      status: 409,
      latencyMs: 9,
      body: { error: { code: "VERSION_CONFLICT", message: "La orden cambió." } },
    });

    const error = await api.getAnalytics({ page: 1, limit: 10 }).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "La orden cambió.", status: 409, latencyMs: 9, isConflict: true });
  });

  it("rechaza respuestas exitosas fuera del contrato y registra el endpoint", async () => {
    mockedTransport.mockResolvedValue({ status: 200, latencyMs: 3, body: { items: "invalid" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const error = await api.getCategories().catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 200, message: "La respuesta del servidor no coincide con el contrato esperado" });
    expect(log).toHaveBeenCalledWith("[api] Respuesta fuera de contrato", "/api/categories", expect.anything());
  });

  it("valida los datos antes de enviar una mutación", () => {
    expect(() => api.createCategory({ name: "", slug: "Invalid Slug" })).toThrow();
    expect(mockedTransport).not.toHaveBeenCalled();
  });

  it("adapta el resultado de actualización masiva al modelo de la interfaz", async () => {
    mockedTransport.mockResolvedValue({ status: 200, latencyMs: 6, body: { updatedCount: 2, ids: ["a", "b"] } });
    await expect(api.bulkUpdate({ ids: ["a", "b"], patch: { status: "SHIPPED" } }))
      .resolves.toMatchObject({ data: { updated: 2 }, status: 200 });
  });
});
