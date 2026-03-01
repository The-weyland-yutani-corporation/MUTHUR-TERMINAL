import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@github/copilot-sdk"],
};

export default nextConfig;
