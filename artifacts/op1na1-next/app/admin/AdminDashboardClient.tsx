"use client";

// Adapted from artifacts/op1na1-architecture/src/pages/AdminDashboard.tsx
// Key changes vs. Vite version:
//   - "use client" directive (Next.js App Router)
//   - Removed `import { useLocation } from "wouter"` (not used in dashboard)
//   - All import.meta.env.VITE_* removed (api.ts / demo.ts already use process.env.NEXT_PUBLIC_*)

export { default } from "@/components/pages/AdminDashboard";
