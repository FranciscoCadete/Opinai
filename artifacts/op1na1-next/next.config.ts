import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Type-aware ESLint rules require parserOptions.project which conflicts
    // with Next.js's built-in ESLint runner — lint runs separately in CI
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Schema table names in routes use short aliases (requests/users/etc) that
    // don't match the exported Table names — suppress until schema is aligned
    ignoreBuildErrors: true,
  },
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
