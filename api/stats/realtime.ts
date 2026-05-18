import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  db,
  citizenRequestsTable,
  bairrosTable,
  usersTable,
} from "@workspace/db";
import type { RealtimeStatsResponse } from "@workspace/api-zod";
import { withCors, withErrorHandler, methodNotAllowed } from "../_lib/http";

export default withCors(
  withErrorHandler(async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      [{ resolvedCount }],
      [{ inProgressCount }],
      [{ avgHours }],
      [{ mediatorCount }],
      [{ bairroCount }],
      categories,
      bairroBreakdown,
    ] = await Promise.all([
      db
        .select({ resolvedCount: sql<number>`count(*)::int` })
        .from(citizenRequestsTable)
        .where(
          and(
            eq(citizenRequestsTable.status, "resolved"),
            gte(citizenRequestsTable.resolvedAt, startOfMonth),
          ),
        ),
      db
        .select({ inProgressCount: sql<number>`count(*)::int` })
        .from(citizenRequestsTable)
        .where(eq(citizenRequestsTable.status, "in_progress")),
      db
        .select({
          avgHours: sql<number>`coalesce(extract(epoch from avg(${citizenRequestsTable.resolvedAt} - ${citizenRequestsTable.createdAt})) / 3600, 0)::float`,
        })
        .from(citizenRequestsTable)
        .where(eq(citizenRequestsTable.status, "resolved")),
      db
        .select({ mediatorCount: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(eq(usersTable.role, "technician")),
      db
        .select({ bairroCount: sql<number>`count(*)::int` })
        .from(bairrosTable),
      db
        .select({
          label: citizenRequestsTable.category,
          count: sql<number>`count(*)::int`,
        })
        .from(citizenRequestsTable)
        .groupBy(citizenRequestsTable.category),
      db
        .select({
          name: bairrosTable.name,
          estrato: bairrosTable.estrato,
          count: sql<number>`count(${citizenRequestsTable.id})::int`,
        })
        .from(bairrosTable)
        .leftJoin(
          citizenRequestsTable,
          eq(citizenRequestsTable.bairroId, bairrosTable.id),
        )
        .groupBy(bairrosTable.id, bairrosTable.name, bairrosTable.estrato)
        .orderBy(sql`count(${citizenRequestsTable.id}) desc`)
        .limit(10),
    ]);

    const totalForPct = categories.reduce((s, c) => s + c.count, 0) || 1;
    const byCategory = categories
      .map((c) => ({
        label: c.label,
        pct: Math.round((c.count / totalForPct) * 1000) / 10,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);

    const body: RealtimeStatsResponse = {
      resolvedThisMonth: resolvedCount,
      inProgress: inProgressCount,
      averageResponseHours: Math.round(avgHours * 10) / 10,
      activeMediators: mediatorCount,
      bairrosCovered: bairroCount,
      channelsAvailable: 6,
      byCategory,
      byBairro: bairroBreakdown.map((b) => ({
        name: b.name,
        estrato: b.estrato,
        count: b.count,
      })),
    };

    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    res.status(200).json(body);
  }),
);
