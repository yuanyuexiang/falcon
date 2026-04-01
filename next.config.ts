import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /* config options here */
  // 启用 standalone 输出用于 Docker 部署
  output: 'standalone',
  turbopack: {
    root: projectRoot,
  },
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
