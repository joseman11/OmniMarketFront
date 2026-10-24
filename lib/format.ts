const LOCALE = "es-MX";

const currencyFmt = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFmt = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "MXN",
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFmt = new Intl.NumberFormat(LOCALE);

/** Formatea un monto en pesos mexicanos: 1234.5 → "$1,234.50". */
export function formatCurrency(value: number, opts?: { compact?: boolean }): string {
  const safe = Number.isFinite(value) ? value : 0;
  return opts?.compact ? compactCurrencyFmt.format(safe) : currencyFmt.format(safe);
}

/** Separa entero y centavos para mostrarlos con distinto tamaño (ref. Starlight). */
export function splitCurrency(value: number): { whole: string; cents: string } {
  const formatted = formatCurrency(value);
  const idx = formatted.lastIndexOf(".");
  if (idx === -1) return { whole: formatted, cents: "" };
  return { whole: formatted.slice(0, idx), cents: formatted.slice(idx) };
}

/**
 * Formatea una razón (0.1234) como porcentaje "12.3%".
 * `signed` antepone "+" a los valores positivos (para deltas).
 */
export function formatPercent(
  ratio: number,
  opts: { digits?: number; signed?: boolean } = {},
): string {
  const { digits = 1, signed = false } = opts;
  const safe = Number.isFinite(ratio) ? ratio : 0;
  const formatted = new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(safe);
  return formatted;
}

export function formatNumber(value: number): string {
  return numberFmt.format(Number.isFinite(value) ? value : 0);
}

export function formatMs(ms: number): string {
  return `${Math.round(ms)} ms`;
}

const dayFmt = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "short" });
const fullDayFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** "2026-10-12" → "12 oct" (se interpreta como fecha local, sin desfase UTC). */
export function formatDay(isoDay: string, opts?: { year?: boolean }): string {
  const [y, m, d] = isoDay.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return isoDay;
  const date = new Date(y, m - 1, d);
  return (opts?.year ? fullDayFmt : dayFmt).format(date).replace(".", "");
}

const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

/** Tiempo relativo en español: "hace 5 minutos", "ayer". */
export function formatRelativeTime(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return "justo ahora";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
}
