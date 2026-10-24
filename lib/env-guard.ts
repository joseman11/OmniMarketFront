/**
 * Guarda de configuración: un artefacto productivo nunca admite el bypass de sesión E2E
 * ni el adaptador mock. Se ejecuta al cargar next.config.ts (build/start) y al importar
 * el módulo de sesión del servidor. Sin dependencias para poder importarse desde la config.
 */
type Env = Record<string, string | undefined>;

/** Modo explícito de pruebas E2E (next dev con mocks); independiente de NODE_ENV. */
export const TEST_ENV_FLAG = "OMNIMARKET_TEST_ENV";

export function isTestEnvironment(env: Env = process.env): boolean {
  return env[TEST_ENV_FLAG] === "true" && env.NODE_ENV !== "production";
}

export function assertProductionConfig(env: Env = process.env): void {
  if (env.NODE_ENV !== "production") return;
  const enabled = ["E2E_MOCK_AUTH", "NEXT_PUBLIC_USE_MOCKS"].filter((name) => env[name] === "true");
  if (enabled.length > 0) {
    throw new Error(
      `La configuración productiva no admite autenticación ni datos de prueba (${enabled.join(", ")}=true). ` +
        `Las pruebas con mocks se ejecutan con next dev y ${TEST_ENV_FLAG}=true.`,
    );
  }
}
