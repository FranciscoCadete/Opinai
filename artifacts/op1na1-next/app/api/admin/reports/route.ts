import { NextRequest } from "next/server";
import { ok, err, unauthorized, forbidden } from "@/lib/server/response";
import { getSessionUser } from "@/lib/server/auth";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const ROLE_RANK: Record<string, number> = { citizen: 0, technician: 1, manager: 2, admin: 3 };

type Period = "7d" | "30d" | "90d";

function parsePeriod(raw: string | null): Period {
  if (raw === "7d" || raw === "30d" || raw === "90d") return raw;
  return "30d";
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── GET /api/admin/reports ────────────────────────────────────────
export async function GET(req: NextRequest) {
  const period = parsePeriod(req.nextUrl.searchParams.get("period"));

  if (!DEMO_MODE) {
    const session = await getSessionUser();
    if (!session) return unauthorized();
    if ((ROLE_RANK[session.role] ?? 0) < ROLE_RANK.manager) return forbidden();
  }

  if (DEMO_MODE) {
    const { demoGetAdminReports } = await import("@/lib/demo");
    return ok(demoGetAdminReports(period));
  }

  try {
    const { db } = await import("@workspace/db");
    const { citizenRequestsTable: requests } = await import("@workspace/db/schema");
    const { gte, and, sql } = await import("drizzle-orm");

    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const since = daysAgo(days);

    // All requests in period
    const rows = await db.select().from(requests).where(gte(requests.createdAt, since as never));

    const total = rows.length;
    const resolved = rows.filter(r => r.status === "resolved").length;
    const inProgress = rows.filter(r => ["assigned", "in_progress"].includes(r.status)).length;
    const rejected = rows.filter(r => r.status === "rejected").length;

    const resolvedWithTime = rows.filter(r => r.status === "resolved" && r.resolvedAt && r.createdAt);
    const avgResolutionHours = resolvedWithTime.length
      ? resolvedWithTime.reduce((sum, r) => {
          const ms = new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime();
          return sum + ms / 3_600_000;
        }, 0) / resolvedWithTime.length
      : 0;

    // Trend: group by day
    const trendMap = new Map<string, { submitted: number; resolved: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendMap.set(d.toISOString().slice(0, 10), { submitted: 0, resolved: 0 });
    }
    for (const r of rows) {
      const day = new Date(r.createdAt).toISOString().slice(0, 10);
      const entry = trendMap.get(day);
      if (entry) entry.submitted++;
    }
    for (const r of rows.filter(r => r.resolvedAt)) {
      const day = new Date(r.resolvedAt!).toISOString().slice(0, 10);
      const entry = trendMap.get(day);
      if (entry) entry.resolved++;
    }
    const trend = Array.from(trendMap.entries()).map(([date, v]) => ({ date, ...v }));

    // By category
    const catMap = new Map<string, number>();
    for (const r of rows) catMap.set(r.category, (catMap.get(r.category) ?? 0) + 1);
    const byCategory = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count, pct: total ? Math.round((count / total) * 100) : 0 }));

    // By channel
    const chanMap = new Map<string, number>();
    for (const r of rows) chanMap.set(r.channel, (chanMap.get(r.channel) ?? 0) + 1);
    const byChannel = Array.from(chanMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([channel, count]) => ({ channel, count, pct: total ? Math.round((count / total) * 100) : 0 }));

    // By bairro (top 10)
    const bairroMap = new Map<string, number>();
    for (const r of rows) {
      const name = r.bairroId ?? "Desconhecido";
      bairroMap.set(name, (bairroMap.get(name) ?? 0) + 1);
    }
    const byBairro = Array.from(bairroMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // By priority
    const priMap = new Map<string, number>();
    for (const r of rows) priMap.set(r.priority, (priMap.get(r.priority) ?? 0) + 1);
    const byPriority = Array.from(priMap.entries())
      .map(([priority, count]) => ({ priority, count, pct: total ? Math.round((count / total) * 100) : 0 }));

    return ok({
      period,
      generatedAt: new Date().toISOString(),
      kpi: {
        total,
        resolved,
        inProgress,
        rejected,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        resolutionRate: total ? Math.round((resolved / total) * 100) : 0,
      },
      trend,
      byCategory,
      byChannel,
      byBairro,
      byPriority,
    });
  } catch (e) {
    console.error("[admin/reports GET]", e);
    return err("Erro interno", 500);
  }
}
