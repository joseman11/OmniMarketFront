import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    // El servidor de desarrollo se levanta en el puerto 3100 (ver playwright.config.ts).
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:3100",
    viewportWidth: 1440,
    viewportHeight: 900,
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    setupNodeEvents() {
      // Sin plugins por ahora. Cypress envía aquí los eventos de Node si se necesitan.
    },
    defaultCommandTimeout: 10_000,
    pageLoadTimeout: 120_000,
    responseTimeout: 30_000,
    retries: {
      runMode: process.env.CI ? 2 : 0,
      openMode: 0,
    },
    video: false,
    screenshotOnRunFailure: true,
    testIsolation: true,
  },
});
