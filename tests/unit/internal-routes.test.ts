import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as clientError } from "@/app/api/internal/client-error/route";
import { POST as testReset } from "@/app/api/internal/test-reset/route";

const ORIGIN = "http://localhost:3000";
const post = (path: string, body: string, headers: Record<string, string> = {}) =>
  new NextRequest(`${ORIGIN}${path}`, { method: "POST", body, headers: { origin: ORIGIN, ...headers } });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/internal/client-error", () => {
  const valid = { message: "fallo de ana@example.mx", name: "Error", path: "/dashboard", userAgent: "UA" };

  it("rechaza por bytes un cuerpo que por caracteres cabría (8 KiB)", async () => {
    const body = JSON.stringify({ ...valid, message: "€".repeat(3000) }); // ~3 000 caracteres, ~9 000 bytes
    expect(body.length).toBeLessThan(8 * 1024);
    const res = await clientError(post("/api/internal/client-error", body));
    expect(res.status).toBe(413);
  });

  it("rechaza JSON fuera del esquema", async () => {
    const res = await clientError(post("/api/internal/client-error", JSON.stringify({ anything: true })));
    expect(res.status).toBe(400);
  });

  it("rechaza otro origen", async () => {
    const res = await clientError(post("/api/internal/client-error", JSON.stringify(valid), { origin: "https://evil.test" }));
    expect(res.status).toBe(403);
  });

  it("registra el reporte válido ya redactado", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await clientError(post("/api/internal/client-error", JSON.stringify(valid)));
    expect(res.status).toBe(204);
    const logged = String(log.mock.calls[0]?.[1]);
    expect(logged).toContain("[email]");
    expect(logged).not.toContain("ana@example.mx");
  });
});

describe("POST /api/internal/test-reset", () => {
  it("no existe sin el interruptor explícito aunque haya token", async () => {
    vi.stubEnv("TEST_API_TOKEN", "secreto");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await testReset(post("/api/internal/test-reset", ""));
    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("con el interruptor sigue exigiendo origen exacto", async () => {
    vi.stubEnv("TEST_RESET_ENABLED", "true");
    vi.stubEnv("TEST_API_TOKEN", "secreto");
    const res = await testReset(post("/api/internal/test-reset", "", { origin: "https://evil.test" }));
    expect(res.status).toBe(403);
  });
});
