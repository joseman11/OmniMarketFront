"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { backendUrl } from "@/lib/server/session";

export async function signOutAction() {
  const [incoming, cookieStore] = await Promise.all([headers(), cookies()]);
  const cookie = incoming.get("cookie");
  // Borrar la cookie local no demuestra la revocación en el servidor: los fallos se registran
  // (sin cookies ni cuerpo) para poder auditarlos. La cookie local se limpia igualmente.
  try {
    const response = await fetch(`${backendUrl}/api/auth/session`, {
      method: "DELETE",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
    if (!response.ok) console.error("[logout] La revocación de sesión respondió", response.status);
  } catch (error) {
    console.error("[logout] No se pudo revocar la sesión en el backend:", error instanceof Error ? error.name : "Error");
  }
  cookieStore.delete("omni_session");
  redirect("/login");
}
