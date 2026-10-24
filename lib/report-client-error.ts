/** Datos que se envían al endpoint de logging. Recortados para no inflar los logs. */
export type ClientErrorReport = {
  message: string;
  name: string;
  digest?: string;
  stack?: string;
  path: string;
  userAgent: string;
};

export const CLIENT_ERROR_ENDPOINT = "/api/internal/client-error";

export function buildClientErrorReport(error: Error & { digest?: string }): ClientErrorReport {
  return {
    message: String(error.message ?? "").slice(0, 1000),
    name: String(error.name ?? "Error").slice(0, 100),
    digest: error.digest,
    stack: error.stack?.slice(0, 4000),
    // Sin query string: puede llevar callbackUrl u otros datos del usuario.
    path: window.location.pathname,
    userAgent: navigator.userAgent.slice(0, 300),
  };
}

/**
 * Registra el error real en la consola y lo manda a los logs del servidor (Vercel → Logs).
 * En producción, los errores de Server Components llegan sin mensaje: el `digest` es la llave para
 * encontrar el error completo en los logs de la función.
 */
export function reportClientError(error: Error & { digest?: string }): void {
  const report = buildClientErrorReport(error);
  console.error("[OmniMarket] Error capturado por el error boundary:", report, error);
  try {
    const body = JSON.stringify(report);
    const sent = navigator.sendBeacon?.(CLIENT_ERROR_ENDPOINT, new Blob([body], { type: "application/json" }));
    if (!sent) {
      void fetch(CLIENT_ERROR_ENDPOINT, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  } catch {
    /* El logging nunca debe romper la vista de error. */
  }
}
