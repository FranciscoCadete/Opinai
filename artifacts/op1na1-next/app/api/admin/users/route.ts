import { NextRequest } from "next/server";
import { ok, err, unauthorized, forbidden } from "@/lib/server/response";
import { getSessionUser } from "@/lib/server/auth";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const ROLE_RANK: Record<string, number> = { citizen: 0, technician: 1, manager: 2, admin: 3 };

export async function GET(req: NextRequest) {
  if (!DEMO_MODE) {
    const session = await getSessionUser();
    if (!session) return unauthorized();
    if ((ROLE_RANK[session.role] ?? 0) < ROLE_RANK.manager) return forbidden();
  }

  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, Number(searchParams.get("page")     ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 25)));

  if (DEMO_MODE) {
    return ok({ items: [], total: 0, page, pageSize });
  }

  try {
    const { db } = await import("@workspace/db");
    const { usersTable: users } = await import("@workspace/db/schema");
    const { sql, eq, ilike, and } = await import("drizzle-orm");

    const conditions = [];
    const role   = searchParams.get("role");
    const search = searchParams.get("search");

    if (role)   conditions.push(eq(users.role, role as never));
    if (search) conditions.push(ilike(users.name, `%${search}%`));

    const where = conditions.length ? and(...conditions) : undefined;
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(where);
    const items = await db.select({
      id: users.id, email: users.email, name: users.name,
      role: users.role, municipalityId: users.municipalityId,
      createdAt: users.createdAt, updatedAt: users.updatedAt,
    }).from(users).where(where)
      .orderBy(sql`created_at desc`)
      .limit(pageSize).offset((page - 1) * pageSize);

    return ok({ items, total: count, page, pageSize });
  } catch (e) {
    console.error("[admin/users GET]", e);
    return err("Erro interno", 500);
  }
}

export async function POST(req: NextRequest) {
  if (!DEMO_MODE) {
    const session = await getSessionUser();
    if (!session) return unauthorized();
    if ((ROLE_RANK[session.role] ?? 0) < ROLE_RANK.admin) return forbidden();
  }

  if (DEMO_MODE) return err("Não disponível em modo demo", 403);

  let body: unknown;
  try { body = await req.json(); } catch { return err("Corpo inválido", 400); }

  try {
    const { db } = await import("@workspace/db");
    const { usersTable: users } = await import("@workspace/db/schema");
    const bcrypt = await import("bcryptjs");

    const { email, name, password, role, municipalityId } = body as Record<string, unknown>;
    if (!email || !name || !password || !role) return err("Campos obrigatórios em falta", 400);

    const hash = await bcrypt.hash(password as string, 12);
    const now = new Date();
    const [user] = await db.insert(users).values({
      email: (email as string).trim().toLowerCase(),
      name: name as string,
      passwordHash: hash,
      role: role as never,
      municipalityId: municipalityId as string | null ?? null,
      createdAt: now, updatedAt: now,
    }).returning();

    return ok({ id: user.id, email: user.email, name: user.name, role: user.role, municipalityId: user.municipalityId, createdAt: user.createdAt, updatedAt: user.updatedAt }, 201);
  } catch (e) {
    console.error("[admin/users POST]", e);
    return err("Erro interno", 500);
  }
}
