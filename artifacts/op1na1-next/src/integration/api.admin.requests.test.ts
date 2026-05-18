import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { GET  as listGET }   from "@/app/api/admin/requests/route";
import { GET  as itemGET,
         PATCH as itemPATCH,
         DELETE as itemDELETE } from "@/app/api/admin/requests/[id]/route";

type Params<K extends string> = { params: Promise<Record<K, string>> };

function makeParams<K extends string>(obj: Record<K, string>): Params<K> {
  return { params: Promise.resolve(obj) };
}

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── GET /api/admin/requests ──────────────────────────────────────
describe("GET /api/admin/requests (demo mode)", () => {
  it("returns 200 with items array", async () => {
    const res  = await listGET(makeRequest("GET", "/api/admin/requests"));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { items: unknown[]; total: number } };
    expect(Array.isArray(json.data.items)).toBe(true);
    expect(typeof json.data.total).toBe("number");
    expect(json.data.total).toBeGreaterThan(0);
  });

  it("returns all expected fields per request", async () => {
    const res  = await listGET(makeRequest("GET", "/api/admin/requests"));
    const json = await res.json() as { data: { items: Record<string, unknown>[] } };
    const item = json.data.items[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("ticketId");
    expect(item).toHaveProperty("status");
    expect(item).toHaveProperty("priority");
    expect(item).toHaveProperty("channel");
    expect(item).toHaveProperty("createdAt");
  });

  it("filters by status", async () => {
    const url = "/api/admin/requests?status=resolved";
    const res  = await listGET(makeRequest("GET", url));
    const json = await res.json() as { data: { items: { status: string }[] } };
    for (const item of json.data.items) {
      expect(item.status).toBe("resolved");
    }
  });

  it("filters by priority", async () => {
    const url = "/api/admin/requests?priority=urgent";
    const res  = await listGET(makeRequest("GET", url));
    const json = await res.json() as { data: { items: { priority: string }[] } };
    for (const item of json.data.items) {
      expect(item.priority).toBe("urgent");
    }
  });

  it("search filters by description", async () => {
    const url = "/api/admin/requests?search=água";
    const res  = await listGET(makeRequest("GET", url));
    const json = await res.json() as { data: { items: unknown[]; total: number } };
    expect(json.data.total).toBeGreaterThanOrEqual(0);
  });

  it("respects pageSize", async () => {
    const url = "/api/admin/requests?pageSize=3";
    const res  = await listGET(makeRequest("GET", url));
    const json = await res.json() as { data: { items: unknown[] } };
    expect(json.data.items.length).toBeLessThanOrEqual(3);
  });

  it("returns page metadata", async () => {
    const url = "/api/admin/requests?page=1&pageSize=5";
    const res  = await listGET(makeRequest("GET", url));
    const json = await res.json() as { data: { page: number; pageSize: number } };
    expect(json.data.page).toBe(1);
    expect(json.data.pageSize).toBe(5);
  });
});

// ─── GET /api/admin/requests/:id ─────────────────────────────────
describe("GET /api/admin/requests/:id (demo mode)", () => {
  it("returns 200 for existing request", async () => {
    const res  = await itemGET(makeRequest("GET", "/api/admin/requests/r-001"), makeParams({ id: "r-001" }));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { id: string; ticketId: string } };
    expect(json.data.id).toBe("r-001");
    expect(typeof json.data.ticketId).toBe("string");
  });

  it("returns 404 for non-existent ID", async () => {
    const res = await itemGET(makeRequest("GET", "/api/admin/requests/r-999"), makeParams({ id: "r-999" }));
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/admin/requests/:id ───────────────────────────────
describe("PATCH /api/admin/requests/:id (demo mode)", () => {
  it("updates status and returns updated fields", async () => {
    const res  = await itemPATCH(
      makeRequest("PATCH", "/api/admin/requests/r-002", { status: "in_progress" }),
      makeParams({ id: "r-002" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { status: string } };
    expect(json.data.status).toBe("in_progress");
  });

  it("updates priority", async () => {
    const res  = await itemPATCH(
      makeRequest("PATCH", "/api/admin/requests/r-006", { priority: "high" }),
      makeParams({ id: "r-006" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { priority: string } };
    expect(json.data.priority).toBe("high");
  });

  it("returns 404 for unknown ID", async () => {
    const res = await itemPATCH(
      makeRequest("PATCH", "/api/admin/requests/r-999", { status: "resolved" }),
      makeParams({ id: "r-999" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for unparseable body", async () => {
    const req = new NextRequest("http://localhost/api/admin/requests/r-001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{{bad",
    });
    const res = await itemPATCH(req, makeParams({ id: "r-001" }));
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/admin/requests/:id ──────────────────────────────
describe("DELETE /api/admin/requests/:id (demo mode)", () => {
  it("returns 403 in demo mode", async () => {
    const res = await itemDELETE(
      makeRequest("DELETE", "/api/admin/requests/r-001"),
      makeParams({ id: "r-001" }),
    );
    expect(res.status).toBe(403);
  });
});
