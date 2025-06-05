import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    emotion: true,
  },
  experimental: {
    // Enable HTTP/2 server push
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
