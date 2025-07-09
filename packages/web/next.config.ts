import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  compiler: {
    emotion: true,
  },
  experimental: {
    // Enable HTTP/2 server push
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
