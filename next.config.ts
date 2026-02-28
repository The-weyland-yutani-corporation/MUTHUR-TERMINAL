import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" is required for Docker/self-hosted deployments (Azure Container Apps)
  // but must be omitted on Vercel, which uses its own serverless build pipeline.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  serverExternalPackages: ["@github/copilot-sdk"],
};

export default nextConfig;
