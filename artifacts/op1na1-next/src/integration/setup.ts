import { vi } from "vitest";

// Mock next/headers — required by setSessionCookie, getSessionUser, getMunicipalityContext
// These call cookies() / headers() which only exist inside a real Next.js request context.
vi.mock("next/headers", () => {
  const cookieStore = {
    set:    vi.fn(),
    get:    vi.fn(() => undefined),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
    has:    vi.fn(() => false),
  };
  const headerStore = new Map<string, string>();

  return {
    cookies:  vi.fn(async () => cookieStore),
    headers:  vi.fn(async () => ({
      get: (key: string) => headerStore.get(key.toLowerCase()) ?? null,
      set: (key: string, val: string) => headerStore.set(key.toLowerCase(), val),
    })),
    // Expose for per-test overrides
    __cookieStore: cookieStore,
    __headerStore: headerStore,
  };
});

// Silence console noise from route handlers during tests
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});
