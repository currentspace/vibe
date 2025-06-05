import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    emotion: true,
  },
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;
