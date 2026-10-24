import { headers } from "next/headers";
import { assertProductionConfig, isTestEnvironment } from "@/lib/env-guard";
import { parseBackendSession, type BackendUser } from "@/lib/server/session-schema";

assertProductionConfig();

export type { BackendUser } from "@/lib/server/session-schema";

export const backendUrl = (process.env.OMNIMARKET_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export async function getBackendUser(): Promise<BackendUser | null> {
  try {
    const incoming = await headers();
    const cookie = incoming.get("cookie");
    // Bypass E2E: requiere el flag y el modo de pruebas explícito; nunca en producción.
    if (process.env.E2E_MOCK_AUTH === "true" && isTestEnvironment() && cookie?.split(";").some((part) => part.trim() === "omni_session=e2e-mock-session")) {
      return {
        id: "e2e-user",
        email: "e2e@omnimarket.mx",
        name: "E2E Administrador",
        image: null,
        role: "ADMIN",
      };
    }
    const response = await fetch(`${backendUrl}/api/auth/session`, {
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
    if (!response.ok) return null;
    return parseBackendSession(await response.json());
  } catch {
    return null;
  }
}
