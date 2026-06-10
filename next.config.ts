import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-34f6096b-5e93-4f06-9792-eaeece6edda3.space-z.ai",
  ],
};

export default nextConfig;
