import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { externalDir: true },
  // The app lives in web/ but imports the agent from ../src and its deps from the
  // repo root. Trace/bundle from the monorepo root so serverless output includes them.
  outputFileTracingRoot: path.join(import.meta.dirname, ".."),
  webpack: (config) => {
    // the agent library uses NodeNext ".js" import specifiers for .ts files
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    // ../src (externalDir) resolves bare imports (pg, openai, @anthropic-ai/sdk)
    // relative to its OWN location. On Vercel those deps live in web/node_modules,
    // which isn't in that chain — so add it to the module search path.
    config.resolve.modules = [path.join(import.meta.dirname, "node_modules"), "node_modules"];
    return config;
  },
};

export default nextConfig;
