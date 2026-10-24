import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * E2E con el adaptador mock (NEXT_PUBLIC_USE_MOCKS=true) para que sean repetibles.
 * La sesión de prueba es una cookie aislada, aceptada sólo con E2E_MOCK_AUTH=true y el modo
 * de pruebas explícito OMNIMARKET_TEST_ENV=true sobre next dev (nunca en un build productivo).
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_USE_MOCKS: "true",
      E2E_MOCK_AUTH: "true",
      OMNIMARKET_TEST_ENV: "true",
    },
  },
});
