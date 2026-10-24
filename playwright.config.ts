import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * E2E con el adaptador mock (NEXT_PUBLIC_USE_MOCKS=true) para que sean repetibles.
 * La sesión autenticada se fabrica en global-setup firmando un JWT de Auth.js
 * con AUTH_SECRET: no existe ningún atajo de login en la aplicación.
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
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-only-secret-not-for-production-000000",
    },
  },
});
