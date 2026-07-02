import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Set Turbopack's root to the monorepo workspace directory
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;

