import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/reports/route";

function req(period?: string): NextRequest {
  const url = period
    ? `http://localhost/api/admin/reports?period=${period}`
    : "http://localhost/api/admin/reports";
  return new NextRequest(url);
}

interface ReportsData {
  period: string;
  generatedAt: string;
  kpi: {
    total: number;
    resolved: number;
    inProgress: number;
    rejected: number;
    avgResolutionHours: number;
    resolutionRate: number;
  };
  trend: Array<{ date: string; submitted: number; resolved: number }>;
  byCategory: Array<{ label: string; count: number; pct: number }>;
  byChannel: Array<{ channel: string; count: number; pct: number }>;
  byBairro: Array<{ name: string; count: number }>;
  byPriority: Array<{ priority: string; count: number; pct: number }>;
}

// ─── GET /api/admin/reports ───────────────────────────────────────
describe("GET /api/admin/reports (demo mode)", () => {
  it("returns 200 with default period (30d)", async () => {
    const res  = await GET(req());
    expect(res.status).toBe(200);
    const json = await res.json() as { data: ReportsData };
    expect(json.data.period).toBe("30d");
  });

  it("accepts period=7d", async () => {
    const res  = await GET(req("7d"));
    const json = await res.json() as { data: ReportsData };
    expect(json.data.period).toBe("7d");
    expect(json.data.trend).toHaveLength(7);
  });

  it("accepts period=30d", async () => {
    const res  = await GET(req("30d"));
    const json = await res.json() as { data: ReportsData };
    expect(json.data.period).toBe("30d");
    expect(json.data.trend).toHaveLength(30);
  });

  it("accepts period=90d", async () => {
    const res  = await GET(req("90d"));
    const json = await res.json() as { data: ReportsData };
    expect(json.data.period).toBe("90d");
    expect(json.data.trend).toHaveLength(90);
  });

  it("falls back to 30d for unknown period", async () => {
    const res  = await GET(req("invalid"));
    const json = await res.json() as { data: ReportsData };
    expect(json.data.period).toBe("30d");
  });

  it("KPI has all required numeric fields", async () => {
    const res  = await GET(req("30d"));
    const json = await res.json() as { data: ReportsData };
    const { kpi } = json.data;
    expect(typeof kpi.total).toBe("number");
    expect(typeof kpi.resolved).toBe("number");
    expect(typeof kpi.inProgress).toBe("number");
    expect(typeof kpi.rejected).toBe("number");
    expect(typeof kpi.avgResolutionHours).toBe("number");
    expect(typeof kpi.resolutionRate).toBe("number");
  });

  it("resolutionRate is between 0 and 100", async () => {
    const res  = await GET(req("30d"));
    const json = await res.json() as { data: ReportsData };
    expect(json.data.kpi.resolutionRate).toBeGreaterThanOrEqual(0);
    expect(json.data.kpi.resolutionRate).toBeLessThanOrEqual(100);
  });

  it("trend entries have date, submitted, resolved", async () => {
    const res  = await GET(req("7d"));
    const json = await res.json() as { data: ReportsData };
    for (const entry of json.data.trend) {
      expect(typeof entry.date).toBe("string");
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof entry.submitted).toBe("number");
      expect(typeof entry.resolved).toBe("number");
      expect(entry.submitted).toBeGreaterThanOrEqual(0);
      expect(entry.resolved).toBeGreaterThanOrEqual(0);
    }
  });

  it("byCategory has label, count, pct for each entry", async () => {
    const res  = await GET(req("30d"));
    const json = await res.json() as { data: ReportsData };
    expect(json.data.byCategory.length).toBeGreaterThan(0);
    for (const c of json.data.byCategory) {
      expect(typeof c.label).toBe("string");
      expect(typeof c.count).toBe("number");
      expect(c.pct).toBeGreaterThanOrEqual(0);
      expect(c.pct).toBeLessThanOrEqual(100);
    }
  });

  it("byChannel entries match known channel names", async () => {
    const KNOWN = new Set(["whatsapp", "portal", "sms", "messenger", "ussd"]);
    const res   = await GET(req("30d"));
    const json  = await res.json() as { data: ReportsData };
    for (const c of json.data.byChannel) {
      expect(KNOWN.has(c.channel)).toBe(true);
    }
  });

  it("byBairro is sorted descending by count", async () => {
    const res  = await GET(req("30d"));
    const json = await res.json() as { data: ReportsData };
    const counts = json.data.byBairro.map(b => b.count);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    }
  });

  it("generatedAt is a valid ISO timestamp", async () => {
    const res  = await GET(req("30d"));
    const json = await res.json() as { data: ReportsData };
    expect(() => new Date(json.data.generatedAt)).not.toThrow();
    expect(new Date(json.data.generatedAt).getTime()).not.toBeNaN();
  });
});
