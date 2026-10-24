import { NextResponse, type NextRequest } from "next/server";

/**
 * Guardia ligera en el edge: sólo verifica la presencia de la cookie de sesión
 * de Auth.js (sin Prisma ni decodificar el JWT). La verificación real se hace
 * server-side con auth() en app/dashboard/layout.tsx.
 */
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function middleware(req: NextRequest) {
  const hasSession = req.cookies
    .getAll()
    .some(({ name }) => SESSION_COOKIES.some((c) => name === c || name.startsWith(`${c}.`)));

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
