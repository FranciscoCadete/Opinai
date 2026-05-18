import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  db,
  citizenRequestsTable,
  bairrosTable,
  usersTable,
} from "@workspace/db";
import {
  AdminRequestsQuery,
  type AdminRequestsResponse,
  type AdminRequestRow,
} from "@workspace/api-zod";
import {
  withCors,
  withErrorHandler,
  methodNotAllowed,
  parseBody,
} from "../../_lib/http";
import { requireRole } from "../../_lib/auth";

const assignedUsers = alias(usersTable, "assignedUsers");

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

    const session = await requireRole(req, res, "technician");
    if (!session) return;

    const queryParsed = parseBody(AdminRequestsQuery, {
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
    if (q.status) conditions.push(eq(citizenRequestsTable.status, q.status));
    if (q.priority)
      conditions.push(eq(citizenRequestsTable.priority, q.priority));
    if (q.type) conditions.push(eq(citizenRequestsTable.type, q.type));
    if (q.bairroId)
      conditions.push(eq(citizenRequestsTable.bairroId, q.bairroId));
    if (q.assignedTo)
      conditions.push(eq(citizenRequestsTable.assignedTo, q.assignedTo));
    if (q.search) {
      const pattern = `%${q.search}%`;
      const searchCondition = or(
        ilike(citizenRequestsTable.ticketId, pattern),
        ilike(citizenRequestsTable.description, pattern),
        ilike(citizenRequestsTable.category, pattern),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    if (session.role === "technician") {
      conditions.push(eq(citizenRequestsTable.assignedTo, session.sub));
    } else if (session.municipalityId) {
      conditions.push(
        eq(citizenRequestsTable.municipalityId, session.municipalityId),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * pageSize;

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: citizenRequestsTable.id,
          ticketId: citizenRequestsTable.ticketId,
          type: citizenRequestsTable.type,
          category: citizenRequestsTable.category,
          description: citizenRequestsTable.description,
          status: citizenRequestsTable.status,
          priority: citizenRequestsTable.priority,
          channel: citizenRequestsTable.channel,
          bairroName: bairrosTable.name,
          contactName: citizenRequestsTable.contactName,
          contactPhone: citizenRequestsTable.contactPhone,
          isAnonymous: citizenRequestsTable.isAnonymous,
          assignedToName: assignedUsers.name,
          assignedToId: citizenRequestsTable.assignedTo,
          createdAt: citizenRequestsTable.createdAt,
          updatedAt: citizenRequestsTable.updatedAt,
          resolvedAt: citizenRequestsTable.resolvedAt,
        })
        .from(citizenRequestsTable)
        .leftJoin(
          bairrosTable,
          eq(citizenRequestsTable.bairroId, bairrosTable.id),
        )
        .leftJoin(
          assignedUsers,
          eq(citizenRequestsTable.assignedTo, assignedUsers.id),
        )
        .where(whereClause)
        .orderBy(
          desc(
            sql`CASE ${citizenRequestsTable.priority}
                  WHEN 'urgent' THEN 4
                  WHEN 'high' THEN 3
                  WHEN 'normal' THEN 2
                  WHEN 'low' THEN 1
                END`,
          ),
          asc(citizenRequestsTable.createdAt),
        )
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(citizenRequestsTable)
        .where(whereClause),
    ]);

    const rows: AdminRequestRow[] = items.map((r) => ({
      id: r.id,
      ticketId: r.ticketId,
      type: r.type,
      category: r.category,
      description: r.description,
      status: r.status,
      priority: r.priority,
      channel: r.channel,
      bairroName: r.bairroName,
      contactName: r.contactName,
      contactPhone: r.contactPhone,
      isAnonymous: r.isAnonymous,
      assignedToName: r.assignedToName,
      assignedToId: r.assignedToId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    }));

    const body: AdminRequestsResponse = {
      items: rows,
      total,
      page,
      pageSize,
    };
    res.status(200).json(body);
  }),
);
