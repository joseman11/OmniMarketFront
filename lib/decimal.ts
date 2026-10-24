/**
 * Prisma serializa `Decimal` como string ("1234.50"). Estas utilidades
 * convierten de forma segura sin lanzar excepciones ni propagar NaN.
 */

const DECIMAL_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

export type DecimalInput = string | number | null | undefined;

/** Convierte un Decimal (string o number) a number. Devuelve `fallback` si no es válido. */
export function parseDecimal(value: DecimalInput, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/,/g, "");
  if (!DECIMAL_RE.test(trimmed)) return fallback;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : fallback;
}

/** Igual que parseDecimal pero devuelve null cuando el valor no es válido. */
export function tryParseDecimal(value: DecimalInput): number | null {
  const sentinel = Number.NaN;
  const n = parseDecimal(value, sentinel);
  return Number.isNaN(n) ? null : n;
}

/** Redondea a `digits` decimales evitando errores de coma flotante (1.005 → 1.01). */
export function roundTo(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
