import path from "node:path";
import type { NextConfig } from "next";
import { assertProductionConfig } from "./lib/env-guard";

// Falla el build/arranque productivo si hay bypass de sesión E2E o mocks activados.
assertProductionConfig();

const backendUrl = (process.env.OMNIMARKET_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

// Los rewrites se fijan en el build: sin OMNIMARKET_API_URL un deploy en Vercel proxificaría a localhost
// y todo /api/auth/* fallaría en silencio. Mejor romper el build con un mensaje claro.
if (process.env.VERCEL && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(backendUrl)) {
  throw new Error(
    "OMNIMARKET_API_URL no está configurada en Vercel. Usa el dominio estable del backend " +
      "(p. ej. https://omni-market-back.vercel.app), no la URL de un deployment concreto.",
  );
}

const nextConfig: NextConfig = {
  // Hay otro lockfile fuera del repo; fijamos la raíz para el tracing y Turbopack.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
  poweredByHeader: false,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/test/analytics",
          has: [
            { type: "query", key: "page", value: "1" },
            { type: "query", key: "limit", value: "50" },
          ],
          missing: [
            { type: "cookie", key: "omni_session" },
            { type: "query", key: "from" },
            { type: "query", key: "to" },
            { type: "query", key: "categoryId" },
          ],
          destination: "/fixtures/test-analytics.json",
        },
      ],
      afterFiles: [
        { source: "/api/auth/:path*", destination: `${backendUrl}/api/auth/:path*` },
        { source: "/api/test/:path*", destination: `${backendUrl}/api/test/:path*` },
        { source: "/backend/:path*", destination: `${backendUrl}/api/:path*` },
      ],
    };
  },
};

export default nextConfig;
