import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = {
  // Isolate deployment verification builds from the running local acceptance app.
  distDir: [".next-hosting", ".next-rpc"].includes(process.env.NNETICS_BUILD_DIRECTORY || "") ? process.env.NNETICS_BUILD_DIRECTORY : ".next",
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
  poweredByHeader: false,
  serverExternalPackages: ["near-api-js"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:3100 https://rpc.testnet.fastnear.com https://test.rpc.fastnear.com https://rpc.testnet.near.org; frame-ancestors 'none'; form-action 'self'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};
export default config;
