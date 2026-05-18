# Page components

These files are adapted from `artifacts/op1na1-architecture/src/pages/`.

**Changes per file:**
- `"use client"` directive added at top
- `import { useLocation } from "wouter"` removed
- `const [, navigate] = useLocation()` → `const router = useRouter()` (from `next/navigation`)
- `navigate("/path")` → `router.push("/path")`
- Route `/admin-dashboard` → `/admin` (Next.js App Router path)
- `import.meta.env.VITE_*` removed (api.ts and demo.ts already use `process.env.NEXT_PUBLIC_*`)

Each file exports a default React component ready to be used in a Next.js App Router "use client" boundary.
