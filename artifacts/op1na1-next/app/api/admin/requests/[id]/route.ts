import { NextRequest } from "next/server";
import { ok, err, unauthorized, forbidden, notFound } from "@/lib/server/response";
import { getSessionUser } from "@/lib/server/auth";
import { notifyStatusChange } from "@/lib/server/notifications";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const ROLE_RANK: Record<string, number> = { citizen: 0, technician: 1, manager: 2, admin: 3 };

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/admin/requests/:id ───────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  if (!DEMO_MODE) {
    const session = await getSessionUser();
    if (!session) return unauthorized();
    if ((ROLE_RANK[session.role] ?? 0) < ROLE_RANK.technician) return forbidden();
  }

  if (DEMO_MODE) {
    const { demoListAdminRequests } = await import("@/lib/demo");
    const list = await demoListAdminRequests({});
    const row = list.items.find(r => r.id === id);
    if (!row) return notFound("Pedido não encontrado");
    return ok(row);
  }

  try {
    const { db } = await import("@workspace/db");
    const { requests } = await import("@workspace/db/schema");
    const { eq } = await import("drizzle-orm");

    const [row] = await db.select().from(requests).where(eq(requests.id, id as never)).limit(1);
    if (!row) return notFound("Pedido não encontrado");
    return ok(row);
  } catch (e) {
    console.error("[admin/requests/:id GET]", e);
    return err("Erro interno", 500);
  }
}

// ─── PATCH /api/admin/requests/:id ────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  if (!DEMO_MODE) {
    const session = await getSessionUser();
    if (!session) return unauthorized();
    if ((ROLE_RANK[session.role] ?? 0) < ROLE_RANK.technician) return forbidden();
  }

  let body: unknown;
  try { body = await req.json(); } catch { return err("Corpo inválido", 400); }

  const { status, priority, assignedToId, note } = (body ?? {}) as Record<string, unknown>;

  if (DEMO_MODE) {
    const { demoUpdateAdminRequest } = await import("@/lib/demo");
    try {
      const updated = await demoUpdateAdminRequest(id, {
        status: status as never,
        priority: priority as never,
        assignedToId: assignedToId as string | null,
        note: note as string | undefined,
      });
      return ok(updated);
    } catch (e) {
      return notFound("Pedido não encontrado");
    }
  }

  try {
    const { db } = await import("@workspace/db");
    const { requests, auditLog } = await import("@workspace/db/schema");
    const { eq } = await import("drizzle-orm");

    // Fetch current row to detect status change for notifications
    const [current] = await db.select().from(requests).where(eq(requests.id, id as never)).limit(1);
    if (!current) return notFound("Pedido não encontrado");

    const session = await getSessionUser();

    // Manager+ required to reassign
    if (assignedToId !== undefined && (ROLE_RANK[session?.role ?? ""] ?? 0) < ROLE_RANK.manager) {
      return forbidden();
    }

    const now = new Date();
    const patch: Record<string, unknown> = { updatedAt: now };
    if (status)           patch.status        = status;
    if (priority)         patch.priority      = priority;
    if (assignedToId !== undefined) patch.assignedToId = assignedToId;
    if (status === "resolved") patch.resolvedAt = now;

    const [updated] = await db.update(requests)
      .set(patch)
      .where(eq(requests.id, id as never))
      .returning();

    // Audit trail
    if (session) {
      await db.insert(auditLog).values({
        actorUserId:  session.sub,
        actorName:    session.name,
        actorEmail:   session.email,
        action:       "request.updated",
        entityType:   "request",
        entityId:     id,
        payload:      { previousStatus: current.status, newStatus: status, priority, note },
        ipAddress:    req.headers.get("x-forwarded-for") ?? null,
        userAgent:    req.headers.get("user-agent") ?? null,
        createdAt:    now,
      });
    }

    // Fire-and-forget notification (never blocks the API response)
    if (status && status !== current.status) {
      notifyStatusChange({
        ticketId:       updated.ticketId,
        channel:        updated.channel,
        contactName:    updated.contactName,
        contactPhone:   updated.contactPhone,
        contactEmail:   (updated as Record<string, unknown>).contactEmail as string | null ?? null,
        isAnonymous:    updated.isAnonymous,
        newStatus:      String(status),
        previousStatus: String(current.status),
        note:           note as string | undefined,
      }).catch(e => console.error("[notify] unhandled", e));
    }

    return ok({
      id: updated.id,
      ticketId: updated.ticketId,
      status: updated.status,
      priority: updated.priority,
      assignedToId: updated.assignedToId,
      updatedAt: updated.updatedAt,
      resolvedAt: updated.resolvedAt,
    });
  } catch (e) {
    console.error("[admin/requests/:id PATCH]", e);
    return err("Erro interno", 500);
  }
}

// ─── DELETE /api/admin/requests/:id ───────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  if (!DEMO_MODE) {
    const session = await getSessionUser();
    if (!session) return unauthorized();
    // Only managers+ can delete requests
    if ((ROLE_RANK[session.role] ?? 0) < ROLE_RANK.manager) return forbidden();
  }

  if (DEMO_MODE) return err("Eliminação não disponível em modo demo", 403);

  try {
    const { db } = await import("@workspace/db");
    const { requests } = await import("@workspace/db/schema");
    const { eq } = await import("drizzle-orm");

    const [deleted] = await db.delete(requests).where(eq(requests.id, id as never)).returning({ id: requests.id });
    if (!deleted) return notFound("Pedido não encontrado");
    return ok({ deleted: true, id: deleted.id });
  } catch (e) {
    console.error("[admin/requests/:id DELETE]", e);
    return err("Erro interno", 500);
  }
}
