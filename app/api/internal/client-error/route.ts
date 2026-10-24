import { NextRequest, NextResponse } from "next/server";
import { clientErrorReportSchema, redactClientErrorReport } from "@/lib/client-error-report";

/** Límite en bytes (no caracteres) del cuerpo; se aplica durante la lectura. */
const MAX_BODY_BYTES = 8 * 1024;

/** Lee el cuerpo deteniéndose en cuanto supera `limit` bytes; null si lo excede. */
async function readBodyWithLimit(request: NextRequest, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Recibe errores del error boundary y los escribe en los logs de la función (Vercel → Logs). */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }

  const text = await readBodyWithLimit(request, MAX_BODY_BYTES);
  if (text === null) return new NextResponse(null, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = clientErrorReportSchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  console.error("[client-error]", JSON.stringify(redactClientErrorReport(parsed.data)));
  return new NextResponse(null, { status: 204 });
}
