import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.2.22",
    "192.168.2.22:3000",
    "localhost",
    "localhost:3000",
    "172.20.10.6",
    "192.168.2.47"
  ],
};

export default nextConfig;