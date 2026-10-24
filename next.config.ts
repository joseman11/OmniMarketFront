import path from "node:path";
import type { NextConfig } from "next";

const backendUrl = (process.env.OMNIMARKET_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Hay otro lockfile fuera del repo; fijamos la raíz para el tracing y Turbopack.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/api/auth/:path*", destination: `${backendUrl}/api/auth/:path*` },
      { source: "/backend/:path*", destination: `${backendUrl}/api/:path*` },
    ];
  },
};

export default nextConfig;
