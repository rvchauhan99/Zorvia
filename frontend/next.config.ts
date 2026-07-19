import type { NextConfig } from "next";
import path from "path";

const backend =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  // Prefer IPv4: macOS resolves `localhost` to ::1 first; uvicorn --host 0.0.0.0 is IPv4-only.
  "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Turbopack walks up looking for a workspace root; the monorepo root has
  // package.json but no `next` install → "Next.js package not found" (v0.0.0).
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backend.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
