import { NextRequest, NextResponse } from "next/server";

const backendUrl = (process.env.OMNIMARKET_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export async function POST(request: NextRequest) {
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

  const authBody = (await authResponse.json()) as { user?: { role?: string } };
  if (authBody.user?.role !== "ADMIN") {
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
