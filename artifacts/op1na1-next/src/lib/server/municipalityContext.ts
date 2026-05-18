// Server-side helper: reads the municipality context injected by middleware.
// The middleware extracts municipalityId from the verified JWT and sets
// x-municipality-id on every protected route request.

import { headers } from "next/headers";

export interface MunicipalityContext {
  municipalityId: string;
  municipalitySlug: string;
}

export async function getMunicipalityContext(): Promise<MunicipalityContext | null> {
  const h = await headers();
  const id   = h.get("x-municipality-id");
  const slug = h.get("x-municipality-slug") ?? "";
  if (!id) return null;
  return { municipalityId: id, municipalitySlug: slug };
}

// Convenience: get just the ID for DB filtering.
// Returns empty string in demo mode (middleware sets "d-muni-001").
export async function getMunicipalityId(): Promise<string> {
  const ctx = await getMunicipalityContext();
  return ctx?.municipalityId ?? "";
}
