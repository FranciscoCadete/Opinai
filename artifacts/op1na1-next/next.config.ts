import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output as standalone for optimised Docker/container deploys
  // (Vercel ignores this and handles optimisation itself)
  output: "standalone",

  // Forward the demo-mode flag baked in at build time
  env: {
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE ?? "false",
  },

  // Allow images from external citizen-upload domains if needed later
  images: {
    remotePatterns: [],
  },

};

export default nextConfig;
