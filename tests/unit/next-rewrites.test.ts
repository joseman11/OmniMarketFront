import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("Next.js backend rewrites", () => {
  it("serves the public fixture from the CDN and proxies other audit requests", async () => {
    const rewrites = await nextConfig.rewrites?.();

    expect(Array.isArray(rewrites)).toBe(false);
    if (!rewrites || Array.isArray(rewrites)) throw new Error("Expected staged rewrites.");

    expect(rewrites.beforeFiles).toContainEqual({
      source: "/api/test/analytics",
      has: [
        { type: "query", key: "page", value: "1" },
        { type: "query", key: "limit", value: "50" },
      ],
      missing: [
        { type: "cookie", key: "omni_session" },
        { type: "query", key: "from" },
        { type: "query", key: "to" },
        { type: "query", key: "categoryId" },
      ],
      destination: "/fixtures/test-analytics.json",
    });
    expect(rewrites.afterFiles).toContainEqual({
      source: "/api/test/:path*",
      destination:
      `${(process.env.OMNIMARKET_API_URL ?? "http://localhost:3001").replace(/\/$/, "")}/api/test/:path*`,
    });
  });
});
