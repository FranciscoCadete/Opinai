import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import {
  db,
  citizenRequestsTable,
  auditLogTable,
  usersTable,
} from "@workspace/db";
import { UpdateRequestInput } from "@workspace/api-zod";
import {
  withCors,
  withErrorHandler,
  methodNotAllowed,
  parseBody,
} from "../../_lib/http";
import { requireRole, hasRole } from "../../_lib/auth";

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    const id = req.query.id;
    const requestId = Array.isArray(id) ? id[0] : id;
    if (!requestId) {
      res.status(400).json({ error: "Missing request id" });
      return;
    }

    if (req.method === "GET") {
      const session = await requireRole(req, res, "technician");
      if (!session) return;
      const row = await db.query.citizenRequestsTable.findFirst({
        where: eq(citizenRequestsTable.id, requestId),
      });
      if (!row) {
        res.status(404).json({ error: "Request not found" });
        return;
      }
      if (
        session.role === "technician" &&
        row.assignedTo !== session.sub
      ) {
        res.status(403).json({ error: "Not assigned to you" });
        return;
      }
      res.status(200).json({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      });
      return;
    }

    if (req.method !== "PATCH") return methodNotAllowed(res, ["GET", "PATCH"]);

    const session = await requireRole(req, res, "technician");
    if (!session) return;

    const parsed = parseBody(UpdateRequestInput, req.body);
    if (!parsed.ok) {
      res.status(400).json(parsed.error);
      return;
    }
    const input = parsed.data;

    const existing = await db.query.citizenRequestsTable.findFirst({
      where: eq(citizenRequestsTable.id, requestId),
    });
    if (!existing) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    if (
      session.role === "technician" &&
      existing.assignedTo !== session.sub
    ) {
      res.status(403).json({ error: "Not assigned to you" });
      return;
    }

    if (
      input.assignedToId !== undefined &&
      !hasRole(session, "manager")
    ) {
      res
        .status(403)
        .json({ error: "Only managers can reassign requests" });
      return;
    }

    if (input.assignedToId) {
      const target = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, input.assignedToId),
      });
      if (!target || (target.role !== "technician" && target.role !== "manager")) {
        res.status(400).json({
          error: "assignedToId must reference a technician or manager",
        });
        return;
      }
    }

    const updates: Partial<typeof citizenRequestsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.status !== undefined) {
      updates.status = input.status;
      if (input.status === "resolved") {
        updates.resolvedAt = new Date();
      } else if (existing.status === "resolved") {
        updates.resolvedAt = null;
      }
    }
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.assignedToId !== undefined)
      updates.assignedTo = input.assignedToId;

    const [updated] = await db
      .update(citizenRequestsTable)
      .set(updates)
      .where(eq(citizenRequestsTable.id, requestId))
      .returning();

    await db.insert(auditLogTable).values({
      actorUserId: session.sub,
      action: "request.updated",
      entityType: "citizen_request",
      entityId: existing.ticketId,
      payload: {
        before: {
          status: existing.status,
          priority: existing.priority,
          assignedTo: existing.assignedTo,
        },
        after: {
          status: updated.status,
          priority: updated.priority,
          assignedTo: updated.assignedTo,
        },
        note: input.note ?? null,
      },
      ipAddress:
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
        null,
      userAgent: (req.headers["user-agent"] as string) ?? null,
    });

    res.status(200).json({
      id: updated.id,
      ticketId: updated.ticketId,
      status: updated.status,
      priority: updated.priority,
      assignedToId: updated.assignedTo,
      updatedAt: updated.updatedAt.toISOString(),
      resolvedAt: updated.resolvedAt
        ? updated.resolvedAt.toISOString()
        : null,
    });
  }),
);
