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
import { AdminAuditLogQuery } from "@workspace/api-zod";
import {
  withCors,
  withErrorHandler,
  methodNotAllowed,
  parseBody,
} from "../../_lib/http";
import { requireRole } from "../../_lib/auth";

const actorUsers = alias(usersTable, "actorUsers");

/** Maximum rows per export to prevent OOM in serverless. */
const MAX_EXPORT_ROWS = 10_000;

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

    const session = await requireRole(req, res, "manager");
    if (!session) return;

    const format = (req.query.format ?? "json") as string;
    if (format !== "json" && format !== "csv") {
      res.status(400).json({ error: "format must be 'json' or 'csv'" });
      return;
    }

    // Reuse the same query schema but ignore pagination
    const queryParsed = parseBody(AdminAuditLogQuery, {
      ...req.query,
      page: "1",
      pageSize: String(MAX_EXPORT_ROWS),
    });
    if (!queryParsed.ok) {
      res.status(400).json(queryParsed.error);
      return;
    }
    const q = queryParsed.data;

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

    const items = await db
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
      .leftJoin(actorUsers, eq(auditLogTable.actorUserId, actorUsers.id))
      .where(whereClause)
      .orderBy(desc(auditLogTable.createdAt))
      .limit(MAX_EXPORT_ROWS);

    // Audit the export itself
    await db.insert(auditLogTable).values({
      actorUserId: session.sub,
      action: "audit_log.exported",
      entityType: "audit_log",
      entityId: `export_${Date.now()}`,
      payload: { format, rowCount: items.length, filters: q },
      ipAddress:
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
        null,
      userAgent: (req.headers["user-agent"] as string) ?? null,
    });

    if (format === "csv") {
      const header =
        "id,timestamp,actorEmail,actorName,action,entityType,entityId,ipAddress,payload";
      const rows = items.map((e) => {
        const payloadStr = e.payload
          ? JSON.stringify(e.payload).replace(/"/g, '""')
          : "";
        return [
          e.id,
          e.createdAt.toISOString(),
          e.actorEmail ?? "",
          (e.actorName ?? "").replace(/,/g, " "),
          e.action,
          e.entityType,
          e.entityId,
          e.ipAddress ?? "",
          `"${payloadStr}"`,
        ].join(",");
      });
      const csv = [header, ...rows].join("\n");
      const timestamp = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="op1na1_audit_${timestamp}.csv"`,
      );
      res.status(200).send(csv);
      return;
    }

    // JSON format
    const jsonRows = items.map((e) => ({
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
    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="op1na1_audit_${timestamp}.json"`,
    );
    res.status(200).json({ exported: jsonRows.length, items: jsonRows });
  }),
);
