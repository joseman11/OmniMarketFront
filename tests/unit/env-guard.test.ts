import { describe, expect, it } from "vitest";
import { assertProductionConfig, isTestEnvironment } from "@/lib/env-guard";

describe("guarda de configuración productiva", () => {
  it("falla con NODE_ENV=production y E2E_MOCK_AUTH=true", () => {
    expect(() => assertProductionConfig({ NODE_ENV: "production", E2E_MOCK_AUTH: "true" })).toThrow(/E2E_MOCK_AUTH/);
  });

  it("falla con NODE_ENV=production y NEXT_PUBLIC_USE_MOCKS=true", () => {
    expect(() => assertProductionConfig({ NODE_ENV: "production", NEXT_PUBLIC_USE_MOCKS: "true" })).toThrow(/NEXT_PUBLIC_USE_MOCKS/);
  });

  it("acepta producción sin flags de prueba (build de Vercel)", () => {
    expect(() => assertProductionConfig({ NODE_ENV: "production", NEXT_PUBLIC_USE_MOCKS: "false" })).not.toThrow();
    expect(() => assertProductionConfig({ NODE_ENV: "production" })).not.toThrow();
  });

  it("no interfiere con next dev en modo de pruebas", () => {
    expect(() => assertProductionConfig({ NODE_ENV: "development", E2E_MOCK_AUTH: "true", NEXT_PUBLIC_USE_MOCKS: "true" })).not.toThrow();
  });

  it("el modo de pruebas exige el interruptor explícito y nunca aplica en producción", () => {
    expect(isTestEnvironment({ NODE_ENV: "development" })).toBe(false);
    expect(isTestEnvironment({ NODE_ENV: "development", OMNIMARKET_TEST_ENV: "true" })).toBe(true);
    expect(isTestEnvironment({ NODE_ENV: "production", OMNIMARKET_TEST_ENV: "true" })).toBe(false);
  });
});
