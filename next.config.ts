import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hay otro lockfile fuera del repo; fijamos la raíz para el tracing y Turbopack.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
  poweredByHeader: false,
};

export default nextConfig;
