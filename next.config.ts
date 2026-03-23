import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 启用 standalone 输出用于 Docker 部署
  output: 'standalone',
};

export default nextConfig;
