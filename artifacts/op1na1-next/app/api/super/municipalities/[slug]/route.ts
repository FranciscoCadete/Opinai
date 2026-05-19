import { NextRequest } from "next/server";
import { ok, err, unauthorized, forbidden, notFound } from "@/lib/server/response";
import { getSessionUser } from "@/lib/server/auth";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

function isSuperAdmin(role: string, municipalityId: string | null | undefined): boolean {
  return role === "admin" && !municipalityId;
}

type Params = { params: Promise<{ slug: string }> };

// ─── GET /api/super/municipalities/:slug ──────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  if (DEMO_MODE) {
    const { demoGetMunicipality } = await import("@/lib/demo");
    const m = demoGetMunicipality(slug);
    if (!m) return notFound("Município não encontrado");
    return ok(m);
  }

  const session = await getSessionUser();
  if (!session) return unauthorized();
  // Technicians can read their own municipality's data (for branding etc.)
  // Superadmins can read any.
  const ownMunicipality = session.municipalityId === slug || isSuperAdmin(session.role, session.municipalityId);
  if (!ownMunicipality) return forbidden();

  try {
    const { db } = await import("@workspace/db");
    const { municipalitiesTable: municipalities } = await import("@workspace/db/schema");
    const { eq } = await import("drizzle-orm");

    const [row] = await db.select().from(municipalities).where(eq(municipalities.slug, slug as never)).limit(1);
    if (!row) return notFound("Município não encontrado");
    return ok(row);
  } catch (e) {
    console.error("[super/municipalities/:slug GET]", e);
    return err("Erro interno", 500);
  }
}

// ─── PATCH /api/super/municipalities/:slug ────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const session = await getSessionUser();
  if (!session) return unauthorized();
  if (!isSuperAdmin(session.role, session.municipalityId) && !DEMO_MODE) return forbidden();

  let body: unknown;
  try { body = await req.json(); } catch { return err("Corpo inválido", 400); }

  const { name, province, primaryColor, contactEmail, contactPhone, active } =
    (body ?? {}) as Record<string, unknown>;

  if (DEMO_MODE) {
    const { demoUpdateMunicipality } = await import("@/lib/demo");
    try {
      const updated = demoUpdateMunicipality(slug, { name, province, primaryColor, contactEmail, contactPhone, active } as never);
      return ok(updated);
    } catch {
      return notFound("Município não encontrado");
    }
  }

  try {
    const { db } = await import("@workspace/db");
    const { municipalitiesTable: municipalities } = await import("@workspace/db/schema");
    const { eq } = await import("drizzle-orm");

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (name         !== undefined) patch.name         = name;
    if (province     !== undefined) patch.province     = province;
    if (primaryColor !== undefined) patch.primaryColor = primaryColor;
    if (contactEmail !== undefined) patch.contactEmail = contactEmail;
    if (contactPhone !== undefined) patch.contactPhone = contactPhone;
    if (active       !== undefined) patch.active       = active;

    const [updated] = await db.update(municipalities)
      .set(patch)
      .where(eq(municipalities.slug, slug as never))
      .returning();

    if (!updated) return notFound("Município não encontrado");
    return ok(updated);
  } catch (e) {
    console.error("[super/municipalities/:slug PATCH]", e);
    return err("Erro interno", 500);
  }
}

// ─── DELETE /api/super/municipalities/:slug ───────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  if (DEMO_MODE) return err("Eliminação não disponível em modo demo", 403);

  const session = await getSessionUser();
  if (!session) return unauthorized();
  if (!isSuperAdmin(session.role, session.municipalityId)) return forbidden();

  // Safety: prevent deleting primary/seed municipalities
  const PROTECTED_SLUGS = ["mulenvos"];
  if (PROTECTED_SLUGS.includes(slug)) {
    return err("Município raiz não pode ser eliminado", 403);
  }

  try {
    const { db } = await import("@workspace/db");
    const { municipalitiesTable: municipalities } = await import("@workspace/db/schema");
    const { eq } = await import("drizzle-orm");

    const [deleted] = await db.delete(municipalities)
      .where(eq(municipalities.slug, slug as never))
      .returning({ id: municipalities.id, slug: municipalities.slug });

    if (!deleted) return notFound("Município não encontrado");
    return ok({ deleted: true, slug: deleted.slug });
  } catch (e) {
    console.error("[super/municipalities/:slug DELETE]", e);
    return err("Erro interno", 500);
  }
}
