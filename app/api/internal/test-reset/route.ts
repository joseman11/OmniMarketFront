import { NextRequest, NextResponse } from "next/server";
import { parseBackendSession } from "@/lib/server/session-schema";

const backendUrl = (process.env.OMNIMARKET_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

/**
 * Interruptor explícito de despliegue de fixtures. Sin él la ruta no existe, aunque haya
 * TEST_API_TOKEN: el token por sí solo ya no habilita el reset en cualquier entorno.
 */
const RESET_SWITCH = "TEST_RESET_ENABLED";

export async function POST(request: NextRequest) {
  if (process.env[RESET_SWITCH] !== "true") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }

  const token = process.env.TEST_API_TOKEN;
  if (!token) return NextResponse.json({ error: "The server-side test reset token is not configured." }, { status: 503 });

  const cookie = request.headers.get("cookie");
  const authResponse = await fetch(`${backendUrl}/api/auth/me`, {
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  });
  if (!authResponse.ok) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const authUser = parseBackendSession(await authResponse.json().catch(() => null));
  if (authUser?.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }

  const backendResponse = await fetch(`${backendUrl}/api/test/reset-data`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await backendResponse.text();
  return new NextResponse(body, {
    status: backendResponse.status,
    headers: { "Content-Type": backendResponse.headers.get("content-type") ?? "application/json" },
  });
}
