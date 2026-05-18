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
    const { auditLog } = await import("@workspace/db/schema");
    const { sql } = await import("drizzle-orm");

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(auditLog);
    const items = await db.select().from(auditLog)
      .orderBy(sql`created_at desc`)
      .limit(pageSize).offset((page - 1) * pageSize);

    return ok({ items, total: count, page, pageSize });
  } catch (e) {
    console.error("[admin/audit-log GET]", e);
    return err("Erro interno", 500);
  }
}
