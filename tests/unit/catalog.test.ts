import { describe, expect, it } from "vitest";
import { CATEGORIES, categoryColor, findProduct } from "@/lib/catalog";

describe("catálogo de demostración", () => {
  it("resuelve el mismo color por identificador y por nombre conocido", () => {
    expect(categoryColor(CATEGORIES[0]!.id)).toBe(CATEGORIES[0]!.color);
    expect(categoryColor(CATEGORIES[0]!.name)).toBe(CATEGORIES[0]!.color);
  });

  it("asigna un color estable a categorías externas", () => {
    expect(categoryColor("custom-category-123")).toBe(categoryColor("custom-category-123"));
    expect(CATEGORIES.map((category) => category.color)).toContain(categoryColor("custom-category-123"));
  });

  it("encuentra productos por id y reporta ids desconocidos", () => {
    expect(findProduct("p-aud-01")?.name).toContain("Aud");
    expect(findProduct("does-not-exist")).toBeUndefined();
  });
});
