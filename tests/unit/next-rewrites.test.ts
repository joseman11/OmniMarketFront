import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("Next.js backend rewrites", () => {
  it("publishes the official audit paths on the frontend origin", async () => {
    const rewrites = await nextConfig.rewrites?.();

    expect(Array.isArray(rewrites)).toBe(true);
    const auditRewrite = Array.isArray(rewrites)
      ? rewrites.find((rewrite) => rewrite.source === "/api/test/:path*")
      : undefined;
    expect(auditRewrite?.destination).toBe(
      `${(process.env.OMNIMARKET_API_URL ?? "http://localhost:3001").replace(/\/$/, "")}/api/test/:path*`,
    );
  });
});
