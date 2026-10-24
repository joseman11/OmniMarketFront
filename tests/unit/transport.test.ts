import { describe, expect, it } from "vitest";
import { buildUrl } from "@/lib/api/transport";

describe("rutas del transporte HTTP", () => {
  it("envía las rutas de API por el proxy y codifica los filtros", () => {
    expect(buildUrl("/api/orders", {
      page: 2,
      search: "A/B & C",
      empty: "",
      omitted: undefined,
    })).toBe("/backend/orders?page=2&search=A%2FB+%26+C");
  });

  it("conserva las rutas internas del proxy y omite el query cuando queda vacío", () => {
    expect(buildUrl("/api/internal/test-reset", { token: "" })).toBe("/api/internal/test-reset");
    expect(buildUrl("/health")).toBe("/health");
  });
});
