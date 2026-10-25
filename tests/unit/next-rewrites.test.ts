import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

const backendUrl = (process.env.OMNIMARKET_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

describe("Next.js backend rewrites", () => {
  it("proxies every audit request to the backend and never to a static file", async () => {
    const rewrites = await nextConfig.rewrites?.();
    if (!Array.isArray(rewrites)) throw new Error("Expected a flat list of rewrites.");

    expect(rewrites).toContainEqual({ source: "/api/test/:path*", destination: `${backendUrl}/api/test/:path*` });
    expect(rewrites).toContainEqual({ source: "/api/auth/:path*", destination: `${backendUrl}/api/auth/:path*` });
    expect(rewrites).toContainEqual({ source: "/backend/:path*", destination: `${backendUrl}/api/:path*` });
    expect(rewrites.every((rewrite) => rewrite.destination.startsWith(backendUrl))).toBe(true);
  });
});
