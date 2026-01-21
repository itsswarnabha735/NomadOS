import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  eslint: {
    // Disable ESLint during builds to speed up deployment
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
