import { readFileSync } from "node:fs";
import path from "node:path";

/** Mismo AUTH_SECRET para el servidor de pruebas y para firmar la sesión E2E. */
export function readE2ESecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  try {
    const env = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    const m = env.match(/^AUTH_SECRET=(.+)$/m);
    if (m?.[1]) return m[1].trim();
  } catch {
    /* sin .env.local */
  }
  return "e2e-only-secret-not-for-production-000000";
}
