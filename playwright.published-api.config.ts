import { defineConfig } from "@playwright/test";

const port = Number(process.env.PUBLISHED_API_E2E_PORT ?? 3101);
const baseURL = `http://127.0.0.1:${port}`;
const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/published-api",
  fullyParallel: false,
  workers: 1,
  reporter: isCi ? "github" : "list",
  use: { baseURL },
  webServer: {
    command: isCi ? `npm run start -- -p ${port}` : `npm run dev -- -p ${port}`,
    // Avoid touching the backend before the first measured request in CI.
    url: isCi ? baseURL : `${baseURL}/api/test/contract`,
    reuseExistingServer: !isCi,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_USE_MOCKS: "false",
      E2E_MOCK_AUTH: "false",
      OMNIMARKET_API_URL: process.env.OMNIMARKET_API_URL ?? "https://omni-market-back.vercel.app",
    },
  },
});
