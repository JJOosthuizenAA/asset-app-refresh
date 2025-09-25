// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add config as needed
  eslint: {
    // TEMP: don’t block builds on lint errors while we fix "any" types, etc.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

