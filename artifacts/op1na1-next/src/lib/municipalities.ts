// Client-side municipality types and fetch helpers.

export interface Municipality {
  id: string;
  slug: string;
  name: string;
  province: string;
  country: string;
  primaryColor?: string | null;
  logoUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMunicipalityInput {
  slug: string;
  name: string;
  province: string;
  country?: string;
  primaryColor?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateMunicipalityInput {
  name?: string;
  province?: string;
  primaryColor?: string;
  contactEmail?: string;
  contactPhone?: string;
  active?: boolean;
}

export async function listMunicipalities(): Promise<Municipality[]> {
  const res = await fetch("/api/super/municipalities");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as { data: Municipality[] };
  return json.data;
}

export async function getMunicipality(slug: string): Promise<Municipality> {
  const res = await fetch(`/api/super/municipalities/${slug}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as { data: Municipality };
  return json.data;
}

export async function createMunicipality(input: CreateMunicipalityInput): Promise<Municipality> {
  const res = await fetch("/api/super/municipalities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json() as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const json = await res.json() as { data: Municipality };
  return json.data;
}

export async function updateMunicipality(slug: string, input: UpdateMunicipalityInput): Promise<Municipality> {
  const res = await fetch(`/api/super/municipalities/${slug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json() as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const json = await res.json() as { data: Municipality };
  return json.data;
}

export async function deleteMunicipality(slug: string): Promise<void> {
  const res = await fetch(`/api/super/municipalities/${slug}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json() as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
}
