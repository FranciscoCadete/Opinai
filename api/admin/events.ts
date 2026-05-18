import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, desc, eq, gt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  db,
  citizenRequestsTable,
  bairrosTable,
  usersTable,
} from "@workspace/db";
import { getSession, hasRole } from "../_lib/auth";
import type { AdminRequestRow } from "@workspace/api-zod";

const assignedUsers = alias(usersTable, "assignedUsers");

/**
 * SSE endpoint — /api/admin/events
 *
 * Vercel free tier: 10s max duration.
 * Strategy: hold connection for HOLD_MS, poll DB every POLL_MS, then close.
 * Browser EventSource auto-reconnects immediately, sending Last-Event-ID so
 * no events are missed. Effective latency: POLL_MS (~2.5s) instead of 30s.
 */
const HOLD_MS = 8_000;
const POLL_MS = 2_500;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — credentials require explicit origin (never *)
  const origin = req.headers.origin as string | undefined;
  const corsEnv = process.env.CORS_ORIGIN;
  const allowOrigin = corsEnv && corsEnv !== "*" ? corsEnv : (origin ?? "*");
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Last-Event-ID");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const session = await getSession(req);
  if (!session || !hasRole(session, "technician")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  // Resolve 'since' from Last-Event-ID header (SSE spec) or ?since param
  const rawSince =
    (req.headers["last-event-id"] as string | undefined) ??
    (req.query.since as string | undefined);
  const since =
    rawSince && !isNaN(Date.parse(rawSince))
      ? new Date(rawSince)
      : new Date(Date.now() - 60_000); // fallback: last 60s

  // Mirror the RBAC scope from admin/requests/index.ts
  const scopeCondition =
    session.role === "technician"
      ? eq(citizenRequestsTable.assignedTo, session.sub)
      : session.municipalityId
      ? eq(citizenRequestsTable.municipalityId, session.municipalityId)
      : undefined;

  // SSE response headers
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx/Vercel proxy buffering
  res.setHeader("Connection", "keep-alive");

  let closed = false;
  req.on("close", () => { closed = true; });

  function emit(event: string, data: unknown, id: string) {
    if (closed) return;
    try {
      res.write(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      closed = true;
    }
  }

  async function poll(afterDate: Date): Promise<Date> {
    const now = new Date();
    const conditions = [gt(citizenRequestsTable.updatedAt, afterDate)];
    if (scopeCondition) conditions.push(scopeCondition);

    try {
      const rows = await db
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
        .where(and(...conditions))
        .orderBy(desc(citizenRequestsTable.updatedAt))
        .limit(20);

      for (const r of rows) {
        const isNew = r.createdAt > afterDate;
        const row: AdminRequestRow = {
          id: r.id,
          ticketId: r.ticketId,
          type: r.type,
          category: r.category,
          description: r.description,
          status: r.status,
          priority: r.priority,
          channel: r.channel,
          bairroName: r.bairroName ?? null,
          contactName: r.contactName ?? null,
          contactPhone: r.contactPhone ?? null,
          isAnonymous: r.isAnonymous,
          assignedToName: r.assignedToName ?? null,
          assignedToId: r.assignedToId ?? null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
        };
        emit(
          isNew ? "request.new" : "request.updated",
          row,
          r.updatedAt.toISOString(),
        );
      }
    } catch (e) {
      console.error("[sse] poll error:", e);
    }

    // Ping carries the current timestamp as event ID for next reconnect
    emit("ping", { ts: now.toISOString() }, now.toISOString());
    return now;
  }

  // Initial poll from 'since'
  let cursor = await poll(since);
  if (closed) { res.end(); return; }

  // Hold loop — poll every POLL_MS until HOLD_MS deadline or client disconnect
  const deadline = Date.now() + HOLD_MS;
  await new Promise<void>((resolve) => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (closed || Date.now() >= deadline) { resolve(); return; }
      cursor = await poll(cursor);
      if (closed) resolve();
      else timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    req.on("close", () => { clearTimeout(timer); resolve(); });
  });

  if (!closed) res.end();
}
