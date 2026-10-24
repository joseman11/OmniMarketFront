import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Contraste WCAG 2.1 entre dos colores hex opacos. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

const css = readFileSync("app/globals.css", "utf8");
const subtle = /--color-subtle:\s*(#[0-9a-f]{6})/i.exec(css)?.[1];

describe("token de texto secundario (WCAG 1.4.3 AA)", () => {
  it("está definido como color opaco", () => {
    expect(subtle).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it.each(["#0e0e15", "#0c0c12", "#07070a", "#16161f", "#15151e"])("alcanza ≥ 4.5:1 sobre %s", (background) => {
    expect(contrast(subtle!, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("el valor anterior (blanco al 40 % sobre #0e0e15 ≈ #6e6e72) no lo alcanzaba", () => {
    expect(contrast("#6e6e72", "#0e0e15")).toBeLessThan(4.5);
  });
});
