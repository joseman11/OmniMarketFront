import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "@/lib/safe-redirect";

describe("safeCallbackPath (open redirect)", () => {
  it("conserva rutas internas con query y hash", () => {
    expect(safeCallbackPath("/dashboard/kanban?new=1#x")).toBe("/dashboard/kanban?new=1#x");
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "",
  ])("rechaza %j", (raw) => {
    expect(safeCallbackPath(raw)).toBe("/dashboard");
  });

  it("rechaza valores que no son string", () => {
    expect(safeCallbackPath(null)).toBe("/dashboard");
    expect(safeCallbackPath(undefined)).toBe("/dashboard");
  });
});
