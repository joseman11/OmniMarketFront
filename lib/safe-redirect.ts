const FALLBACK = "/dashboard";
const BASE = "http://omnimarket.internal";

/**
 * Normaliza ?callbackUrl= a una ruta interna. Rechaza todo lo que el navegador
 * pueda interpretar como otro origen: "//evil.com", "/\evil.com", "/\t/evil.com",
 * "https://evil.com", "javascript:…". Ante la duda, vuelve a /dashboard.
 */
export function safeCallbackPath(raw: unknown, fallback = FALLBACK): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return fallback;
  // Barras invertidas y caracteres de control: los navegadores los "corrigen" a "/".
  if (!raw.startsWith("/") || raw.includes("\\") || /[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const url = new URL(raw, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
