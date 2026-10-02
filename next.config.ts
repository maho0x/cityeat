import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  // Lets the E2E server run alongside `next dev` without sharing a build dir.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactCompiler: true,
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
};

export default createNextIntlPlugin()(nextConfig);
