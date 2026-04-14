import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Keep linting in local/dev workflows, but do not fail production builds on warnings.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
