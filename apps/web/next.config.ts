import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: '../../dist/apps/web',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
