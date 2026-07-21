import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @hawk/agent ships TypeScript source, so Next transpiles it like app code.
  transpilePackages: ["@hawk/agent"],
  // web/ + the agent package live in one workspace; trace from the repo root so
  // the serverless bundle includes the package.
  outputFileTracingRoot: path.join(import.meta.dirname, ".."),
  webpack: (config) => {
    // the agent uses NodeNext ".js" import specifiers for its .ts files
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return config;
  },
};

export default nextConfig;
