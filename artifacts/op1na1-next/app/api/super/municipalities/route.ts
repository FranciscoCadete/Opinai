import { NextRequest } from "next/server";
import { ok, err, unauthorized, forbidden } from "@/lib/server/response";
import { getSessionUser } from "@/lib/server/auth";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

function isSuperAdmin(role: string, municipalityId: string | null | undefined): boolean {
  return role === "admin" && !municipalityId;
}

// ─── GET /api/super/municipalities ────────────────────────────────
export async function GET() {
  if (DEMO_MODE) {
    const { demoListMunicipalities } = await import("@/lib/demo");
    return ok(demoListMunicipalities());
  }

  const session = await getSessionUser();
  if (!session) return unauthorized();
  if (!isSuperAdmin(session.role, session.municipalityId)) return forbidden();

  try {
    const { db } = await import("@workspace/db");
    const { municipalities } = await import("@workspace/db/schema");
    const { desc } = await import("drizzle-orm");

    const rows = await db.select().from(municipalities).orderBy(desc(municipalities.createdAt));
    return ok(rows);
  } catch (e) {
    console.error("[super/municipalities GET]", e);
    return err("Erro interno", 500);
  }
}

// ─── POST /api/super/municipalities ───────────────────────────────
export async function POST(req: NextRequest) {
  if (DEMO_MODE) {
    const { demoCreateMunicipality } = await import("@/lib/demo");
    let body: unknown;
    try { body = await req.json(); } catch { return err("Corpo inválido", 400); }
    try {
      const created = demoCreateMunicipality(body as Parameters<typeof demoCreateMunicipality>[0]);
      return ok(created, 201);
    } catch (e) {
      return err(String(e), 409);
    }
  }

  const session = await getSessionUser();
  if (!session) return unauthorized();
  if (!isSuperAdmin(session.role, session.municipalityId)) return forbidden();

  let body: unknown;
  try { body = await req.json(); } catch { return err("Corpo inválido", 400); }

  const { slug, name, province, country, primaryColor, contactEmail, contactPhone } =
    (body ?? {}) as Record<string, unknown>;

  if (!slug || !name || !province) return err("slug, name e province são obrigatórios", 400);

  // Basic slug validation
  if (!/^[a-z0-9-]{2,40}$/.test(String(slug))) {
    return err("slug deve ter 2-40 caracteres (letras minúsculas, números e hífens)", 400);
  }

  try {
    const { db } = await import("@workspace/db");
    const { municipalities } = await import("@workspace/db/schema");

    const now = new Date();
    const [created] = await db.insert(municipalities).values({
      slug:          String(slug),
      name:          String(name),
      province:      String(province),
      country:       country ? String(country) : "Angola",
      primaryColor:  primaryColor ? String(primaryColor) : "#00c49a",
      contactEmail:  contactEmail ? String(contactEmail) : null,
      contactPhone:  contactPhone ? String(contactPhone) : null,
      active:        true,
      createdAt:     now,
      updatedAt:     now,
    } as never).returning();

    return ok(created, 201);
  } catch (e: unknown) {
    const msg = String((e as { message?: string }).message ?? e);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return err(`Município com slug '${slug}' já existe`, 409);
    }
    console.error("[super/municipalities POST]", e);
    return err("Erro interno", 500);
  }
}
