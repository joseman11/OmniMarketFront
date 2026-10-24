import { NextRequest, NextResponse } from "next/server";

const MAX_BODY = 8 * 1024;

/** Recibe errores del error boundary y los escribe en los logs de la función (Vercel → Logs). */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }

  const text = await request.text();
  if (text.length > MAX_BODY) return new NextResponse(null, { status: 413 });

  let report: unknown;
  try {
    report = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  console.error("[client-error]", JSON.stringify(report));
  return new NextResponse(null, { status: 204 });
}
