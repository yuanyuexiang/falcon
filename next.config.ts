import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 启用 standalone 输出用于 Docker 部署
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/consultant/api/v1/:path*',
        destination: '/api/:path*',
      },
      {
        source: '/consultant/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

export default nextConfig;
