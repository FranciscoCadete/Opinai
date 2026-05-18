import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, usersTable, auditLogTable } from "@workspace/db";
import {
  AdminUsersQuery,
  CreateUserInput,
  type AdminUsersResponse,
  type AdminUserRow,
} from "@workspace/api-zod";
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
    // ── GET /api/admin/users — listar utilizadores com filtros e paginação ──
    if (req.method === "GET") {
      const session = await requireRole(req, res, "manager");
      if (!session) return;

      const queryParsed = parseBody(AdminUsersQuery, {
        ...req.query,
        page: req.query.page ?? "1",
        pageSize: req.query.pageSize ?? "20",
      });
      if (!queryParsed.ok) {
        res.status(400).json(queryParsed.error);
        return;
      }
      const q = queryParsed.data;
      const page = q.page ?? 1;
      const pageSize = q.pageSize ?? 20;

      const conditions: SQL[] = [];
      if (q.role) conditions.push(eq(usersTable.role, q.role));
      if (q.search) {
        const pattern = `%${q.search}%`;
        const searchCondition = or(
          ilike(usersTable.name, pattern),
          ilike(usersTable.email, pattern),
        );
        if (searchCondition) conditions.push(searchCondition);
      }

      // Scope to municipality unless admin
      if (session.role !== "admin" && session.municipalityId) {
        conditions.push(eq(usersTable.municipalityId, session.municipalityId));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (page - 1) * pageSize;

      const [items, [{ total }]] = await Promise.all([
        db
          .select({
            id: usersTable.id,
            email: usersTable.email,
            name: usersTable.name,
            role: usersTable.role,
            municipalityId: usersTable.municipalityId,
            createdAt: usersTable.createdAt,
            updatedAt: usersTable.updatedAt,
          })
          .from(usersTable)
          .where(whereClause)
          .orderBy(
            desc(
              sql`CASE ${usersTable.role}
                    WHEN 'admin' THEN 4
                    WHEN 'manager' THEN 3
                    WHEN 'technician' THEN 2
                    WHEN 'citizen' THEN 1
                  END`,
            ),
            asc(usersTable.name),
          )
          .limit(pageSize)
          .offset(offset),
        db
          .select({ total: sql<number>`count(*)::int` })
          .from(usersTable)
          .where(whereClause),
      ]);

      const rows: AdminUserRow[] = items.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        municipalityId: u.municipalityId,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      }));

      const body: AdminUsersResponse = { items: rows, total, page, pageSize };
      res.status(200).json(body);
      return;
    }

    // ── POST /api/admin/users — criar novo utilizador ──
    if (req.method === "POST") {
      const session = await requireRole(req, res, "admin");
      if (!session) return;

      const parsed = parseBody(CreateUserInput, req.body);
      if (!parsed.ok) {
        res.status(400).json(parsed.error);
        return;
      }
      const input = parsed.data;

      // Check email uniqueness
      const existing = await db.query.usersTable.findFirst({
        where: eq(usersTable.email, input.email.toLowerCase()),
      });
      if (existing) {
        res.status(409).json({ error: "Email already in use" });
        return;
      }

      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

      const [created] = await db
        .insert(usersTable)
        .values({
          email: input.email.toLowerCase(),
          name: input.name,
          role: input.role,
          municipalityId: input.municipalityId ?? null,
          passwordHash,
        })
        .returning();

      // Audit log
      await db.insert(auditLogTable).values({
        actorUserId: session.sub,
        action: "user.created",
        entityType: "user",
        entityId: created.id,
        payload: {
          email: created.email,
          name: created.name,
          role: created.role,
          municipalityId: created.municipalityId,
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
          null,
        userAgent: (req.headers["user-agent"] as string) ?? null,
      });

      res.status(201).json({
        id: created.id,
        email: created.email,
        name: created.name,
        role: created.role,
        municipalityId: created.municipalityId,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
      return;
    }

    return methodNotAllowed(res, ["GET", "POST"]);
  }),
);
