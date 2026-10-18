import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  serverExternalPackages: ["@github/copilot-sdk"],
};

export default nextConfig;
