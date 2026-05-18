import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { db, usersTable, auditLogTable } from "@workspace/db";
import { UpdateUserInput } from "@workspace/api-zod";
import bcrypt from "bcryptjs";
import {
  withCors,
  withErrorHandler,
  methodNotAllowed,
  parseBody,
} from "../../_lib/http";
import { requireRole } from "../../_lib/auth";

const BCRYPT_ROUNDS = 12;

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    const id = req.query.id;
    const userId = Array.isArray(id) ? id[0] : id;
    if (!userId) {
      res.status(400).json({ error: "Missing user id" });
      return;
    }

    // ── GET /api/admin/users/:id — detalhe do utilizador ──
    if (req.method === "GET") {
      const session = await requireRole(req, res, "manager");
      if (!session) return;

      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
      });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.status(200).json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        municipalityId: user.municipalityId,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });
      return;
    }

    // ── PATCH /api/admin/users/:id — editar papel/município/password ──
    if (req.method === "PATCH") {
      const session = await requireRole(req, res, "admin");
      if (!session) return;

      const parsed = parseBody(UpdateUserInput, req.body);
      if (!parsed.ok) {
        res.status(400).json(parsed.error);
        return;
      }
      const input = parsed.data;

      const existing = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
      });
      if (!existing) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Prevent self-demotion from admin
      if (userId === session.sub && input.role && input.role !== "admin") {
        res.status(400).json({ error: "Cannot demote your own admin role" });
        return;
      }

      const updates: Partial<typeof usersTable.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.name !== undefined) updates.name = input.name;
      if (input.role !== undefined) updates.role = input.role;
      if (input.municipalityId !== undefined)
        updates.municipalityId = input.municipalityId;
      if (input.password !== undefined) {
        updates.passwordHash = await bcrypt.hash(
          input.password,
          BCRYPT_ROUNDS,
        );
      }

      const [updated] = await db
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, userId))
        .returning();

      // Audit log (never log password hashes)
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      if (input.name !== undefined) {
        before.name = existing.name;
        after.name = updated.name;
      }
      if (input.role !== undefined) {
        before.role = existing.role;
        after.role = updated.role;
      }
      if (input.municipalityId !== undefined) {
        before.municipalityId = existing.municipalityId;
        after.municipalityId = updated.municipalityId;
      }
      if (input.password !== undefined) {
        after.passwordChanged = true;
      }

      await db.insert(auditLogTable).values({
        actorUserId: session.sub,
        action: "user.updated",
        entityType: "user",
        entityId: userId,
        payload: { before, after },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
          null,
        userAgent: (req.headers["user-agent"] as string) ?? null,
      });

      res.status(200).json({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        municipalityId: updated.municipalityId,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
      return;
    }

    // ── DELETE /api/admin/users/:id — eliminar utilizador ──
    if (req.method === "DELETE") {
      const session = await requireRole(req, res, "admin");
      if (!session) return;

      // Prevent self-deletion
      if (userId === session.sub) {
        res.status(400).json({ error: "Cannot delete your own account" });
        return;
      }

      const existing = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
      });
      if (!existing) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Audit log before deletion
      await db.insert(auditLogTable).values({
        actorUserId: session.sub,
        action: "user.deleted",
        entityType: "user",
        entityId: userId,
        payload: {
          email: existing.email,
          name: existing.name,
          role: existing.role,
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
          null,
        userAgent: (req.headers["user-agent"] as string) ?? null,
      });

      await db.delete(usersTable).where(eq(usersTable.id, userId));

      res.status(200).json({ deleted: true, id: userId });
      return;
    }

    return methodNotAllowed(res, ["GET", "PATCH", "DELETE"]);
  }),
);
