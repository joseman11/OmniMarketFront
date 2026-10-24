import { headers } from "next/headers";

export type BackendUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "ADMIN" | "OPERATOR";
};

export const backendUrl = (process.env.OMNIMARKET_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export async function getBackendUser(): Promise<BackendUser | null> {
  try {
    const incoming = await headers();
    const cookie = incoming.get("cookie");
    if (process.env.E2E_MOCK_AUTH === "true" && cookie?.split(";").some((part) => part.trim() === "omni_session=e2e-mock-session")) {
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
    const body = (await response.json()) as { user?: BackendUser | null };
    return body.user ?? null;
  } catch {
    return null;
  }
}
