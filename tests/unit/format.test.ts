import { describe, expect, it } from "vitest";
import { formatCurrency, formatPercent, formatRelativeTime, splitCurrency } from "@/lib/format";

// Intl usa NBSP en algunos formatos; normalizamos para comparar.
const n = (s: string) => s.replace(/ | /g, " ");

describe("formatCurrency (MXN, es-MX)", () => {
  it("formatea con separador de miles y dos decimales", () => {
    expect(n(formatCurrency(1234.5))).toBe("$1,234.50");
  });

  it("redondea a centavos y maneja negativos", () => {
    expect(n(formatCurrency(-99.999))).toBe("-$100.00");
  });

  it("trata NaN/Infinity como cero", () => {
    expect(n(formatCurrency(Number.NaN))).toBe("$0.00");
    expect(n(formatCurrency(Number.POSITIVE_INFINITY))).toBe("$0.00");
  });

  it("separa entero y centavos para la cifra grande", () => {
    expect(splitCurrency(297924.8)).toEqual({ whole: "$297,924", cents: ".80" });
  });
});

describe("formatPercent", () => {
  it("convierte una razón a porcentaje con un decimal", () => {
    expect(n(formatPercent(0.1234))).toBe("12.3%");
  });

  it("antepone signo en deltas positivos y negativos", () => {
    expect(n(formatPercent(0.052, { signed: true }))).toBe("+5.2%");
    expect(n(formatPercent(-0.025, { signed: true }))).toBe("-2.5%");
  });
});

describe("formatRelativeTime", () => {
  it("expresa minutos y días en español", () => {
    const now = new Date("2026-10-23T12:00:00Z");
    expect(formatRelativeTime(new Date("2026-10-23T11:55:00Z"), now)).toBe("hace 5 minutos");
    expect(formatRelativeTime(new Date("2026-10-22T12:00:00Z"), now)).toBe("ayer");
  });
});
