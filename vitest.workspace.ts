import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  // Next.js package — server-side unit tests (Node environment)
  {
    test: {
      name: "op1na1-next",
      include: ["artifacts/op1na1-next/src/**/*.test.ts"],
      exclude: ["artifacts/op1na1-next/src/integration/**"],
      environment: "node",
      globals: true,
    },
  },
  // Integration tests — route handlers + notification engine + offline queue
  {
    test: {
      name: "integration",
      include: ["artifacts/op1na1-next/src/integration/**/*.test.ts"],
      environment: "node",
      globals: true,
      // Each file gets its own module registry — prevents demo state leaking between files
      pool: "forks",
      setupFiles: ["artifacts/op1na1-next/src/integration/setup.ts"],
      env: {
        NEXT_PUBLIC_DEMO_MODE: "true",
        AUTH_SECRET: "integration-test-secret-at-least-32-chars",
        RESEND_API_KEY: "",
        TWILIO_ACCOUNT_SID: "",
        WHATSAPP_PHONE_NUMBER_ID: "",
      },
    },
  },
  // API-zod schemas
  {
    test: {
      name: "api-zod",
      include: ["lib/api-zod/src/**/*.test.ts"],
      environment: "node",
      globals: true,
    },
  },
]);
