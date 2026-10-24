"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { backendUrl } from "@/lib/server/session";

export async function signOutAction() {
  const [incoming, cookieStore] = await Promise.all([headers(), cookies()]);
  const cookie = incoming.get("cookie");
  try {
    await fetch(`${backendUrl}/api/auth/session`, {
      method: "DELETE",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });
  } catch {
    // La cookie local se limpia aunque el servicio de sesión no responda.
  }
  cookieStore.delete("omni_session");
  redirect("/login");
}
