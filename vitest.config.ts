import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    projects: [
      {
        // Tests puros existentes: sin DOM, igual que antes.
        extends: true,
        test: { name: "unit", environment: "node", include: ["tests/unit/**/*.test.ts"] },
      },
      {
        // Componentes y hooks con DOM: React Testing Library + MSW sobre jsdom.
        extends: true,
        // tsconfig usa jsx: preserve (Next compila el JSX); aquí lo transforma oxc.
        oxc: { jsx: { runtime: "automatic" } },
        test: {
          name: "components",
          environment: "jsdom",
          environmentOptions: { jsdom: { url: "http://localhost:3000/" } },
          include: ["tests/components/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/components/setup.ts"],
        },
      },
    ],
  },
});
