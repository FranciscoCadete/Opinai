import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, auditLogTable, usersTable } from "@workspace/db";
import {
  AdminAuditLogQuery,
  type AdminAuditLogResponse,
  type AdminAuditLogRow,
} from "@workspace/api-zod";
import {
  withCors,
  withErrorHandler,
  methodNotAllowed,
  parseBody,
} from "../../_lib/http";
import { requireRole } from "../../_lib/auth";

const actorUsers = alias(usersTable, "actorUsers");

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

    const session = await requireRole(req, res, "manager");
    if (!session) return;

    const queryParsed = parseBody(AdminAuditLogQuery, {
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
    if (q.action) conditions.push(eq(auditLogTable.action, q.action));
    if (q.entityType)
      conditions.push(eq(auditLogTable.entityType, q.entityType));
    if (q.actorUserId)
      conditions.push(eq(auditLogTable.actorUserId, q.actorUserId));
    if (q.from) {
      const fromDate = new Date(q.from);
      if (!isNaN(fromDate.getTime())) {
        conditions.push(gte(auditLogTable.createdAt, fromDate));
      }
    }
    if (q.to) {
      const toDate = new Date(q.to);
      if (!isNaN(toDate.getTime())) {
        conditions.push(lte(auditLogTable.createdAt, toDate));
      }
    }
    if (q.search) {
      const pattern = `%${q.search}%`;
      const searchCondition = or(
        ilike(auditLogTable.action, pattern),
        ilike(auditLogTable.entityType, pattern),
        ilike(auditLogTable.entityId, pattern),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * pageSize;

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: auditLogTable.id,
          actorUserId: auditLogTable.actorUserId,
          actorName: actorUsers.name,
          actorEmail: actorUsers.email,
          action: auditLogTable.action,
          entityType: auditLogTable.entityType,
          entityId: auditLogTable.entityId,
          payload: auditLogTable.payload,
          ipAddress: auditLogTable.ipAddress,
          userAgent: auditLogTable.userAgent,
          createdAt: auditLogTable.createdAt,
        })
        .from(auditLogTable)
        .leftJoin(
          actorUsers,
          eq(auditLogTable.actorUserId, actorUsers.id),
        )
        .where(whereClause)
        .orderBy(desc(auditLogTable.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(auditLogTable)
        .where(whereClause),
    ]);

    const rows: AdminAuditLogRow[] = items.map((e) => ({
      id: e.id,
      actorUserId: e.actorUserId,
      actorName: e.actorName,
      actorEmail: e.actorEmail,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      payload: e.payload,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      createdAt: e.createdAt.toISOString(),
    }));

    const body: AdminAuditLogResponse = { items: rows, total, page, pageSize };
    res.status(200).json(body);
  }),
);
