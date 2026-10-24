import { describe, expect, it } from "vitest";
import { avatarDataUri, escapeXml } from "@/lib/avatar";

const svgOf = (uri: string) => decodeURIComponent(uri.replace("data:image/svg+xml;utf8,", ""));

describe("avatarDataUri (endurecimiento S5)", () => {
  it("escapa caracteres XML en las iniciales", () => {
    const svg = svgOf(avatarDataUri("<img &Co"));
    expect(svg).toContain(">&lt;&amp;</text>");
    expect(svg).not.toContain("<img");
  });

  it("produce XML bien formado para nombres con < y &", () => {
    for (const name of ["<script>", "& Asociados", '"Comillas" \'simples\'']) {
      const svg = svgOf(avatarDataUri(name));
      expect(svg.match(/</g)?.length).toBe(svg.match(/>/g)?.length);
    }
  });

  it("restringe los colores a hex y usa el predeterminado si no lo son", () => {
    const svg = svgOf(avatarDataUri("Ana", '"/><script>alert(1)</script>', "url(javascript:x)"));
    expect(svg).toContain('stop-color="#7c5cff"');
    expect(svg).toContain('stop-color="#ff9a5c"');
    expect(svg).not.toContain("script");
    expect(svgOf(avatarDataUri("Ana", "#123", "#abcdef"))).toContain('stop-color="#123"');
  });

  it("conserva las iniciales normales", () => {
    expect(svgOf(avatarDataUri("lucía prueba"))).toContain(">LP</text>");
    expect(escapeXml("a&b")).toBe("a&amp;b");
  });
});
