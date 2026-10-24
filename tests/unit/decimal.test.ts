import { describe, expect, it } from "vitest";
import { parseDecimal, roundTo, tryParseDecimal } from "@/lib/decimal";

describe("parseo seguro de Decimal", () => {
  it("convierte strings de Prisma a number", () => {
    expect(parseDecimal("1234.50")).toBe(1234.5);
    expect(parseDecimal("-0.75")).toBe(-0.75);
    expect(parseDecimal("1,250.10")).toBe(1250.1);
  });

  it("devuelve el fallback ante valores inválidos", () => {
    expect(parseDecimal("abc")).toBe(0);
    expect(parseDecimal("12abc", -1)).toBe(-1);
    expect(parseDecimal(null)).toBe(0);
    expect(parseDecimal(undefined, 7)).toBe(7);
    expect(parseDecimal(Number.NaN)).toBe(0);
  });

  it("tryParseDecimal devuelve null si no es numérico", () => {
    expect(tryParseDecimal("")).toBeNull();
    expect(tryParseDecimal("3.14")).toBe(3.14);
  });

  it("roundTo corrige el clásico 1.005", () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
  });
});
