import { z } from "zod";

/** Esquema del reporte que acepta /api/internal/client-error (mismo contrato que buildClientErrorReport). */
export const clientErrorReportSchema = z
  .object({
    message: z.string().max(1000),
    name: z.string().max(100),
    digest: z.string().max(200).optional(),
    stack: z.string().max(4000).optional(),
    path: z.string().max(500),
    userAgent: z.string().max(300),
  })
  .strict();

export type ValidClientErrorReport = z.infer<typeof clientErrorReportSchema>;

const REDACTIONS: [RegExp, string][] = [
  // Tokens Bearer y JWT (tres segmentos base64url).
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redactado]"],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[jwt]"],
  // Correos electrónicos.
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]"],
  // Query strings en URLs (callbackUrl, tokens…): se conserva la ruta.
  [/(https?:\/\/[^\s?#"')]+|\/[^\s?#"')]*)\?[^\s#"')]*/g, "$1?[query]"],
  // Secuencias largas de dígitos (tarjetas, teléfonos, IDs personales).
  [/\b\d[\d -]{10,}\d\b/g, "[número]"],
];

export function redactText(value: string): string {
  return REDACTIONS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

/** Redacta datos personales y secretos antes de escribir el reporte en los logs. */
export function redactClientErrorReport(report: ValidClientErrorReport): ValidClientErrorReport {
  return {
    ...report,
    message: redactText(report.message),
    stack: report.stack === undefined ? undefined : redactText(report.stack),
    path: redactText(report.path),
  };
}
