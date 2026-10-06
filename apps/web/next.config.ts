import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    const apiUrl = process.env.API_URL?.replace(/\/$/, "");
    if (!apiUrl) return [];
    return [{ source: "/api/v1/:path*", destination: `${apiUrl}/api/v1/:path*` }];
  },
};

export default nextConfig;
