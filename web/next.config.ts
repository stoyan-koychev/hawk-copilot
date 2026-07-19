import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { externalDir: true },
  webpack: (config) => {
    // the agent library uses NodeNext ".js" import specifiers for .ts files
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return config;
  },
};

export default nextConfig;
