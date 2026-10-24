import { defineConfig } from "cypress";
import { readE2ESecret } from "./tests/e2e/secret";

// next-auth/jwt es ESM; se carga con import() real (el config se compila a CJS).
const importEsm = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<typeof import("next-auth/jwt")>;

export default defineConfig({
  e2e: {
    // El servidor de desarrollo se levanta en el puerto 3100 (ver playwright.config.ts).
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:3100",
    viewportWidth: 1440,
    viewportHeight: 900,
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    setupNodeEvents(on) {
      on("task", {
        /**
         * Firma una sesión de Auth.js con el mismo AUTH_SECRET que el servidor
         * (.env.local o variable de entorno). Nunca se guardan tokens en el repo.
         */
        async sessionToken() {
          const { encode } = await importEsm("next-auth/jwt");
          return encode({
            secret: readE2ESecret(),
            salt: "authjs.session-token",
            token: { sub: "cypress-user", name: "Cypress Evaluador", email: "cypress@omnimarket.mx", role: "Operador" },
            maxAge: 60 * 60,
          });
        },
      });
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
