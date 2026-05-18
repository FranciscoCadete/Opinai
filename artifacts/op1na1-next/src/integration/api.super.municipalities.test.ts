import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { GET as listGET, POST as listPOST }
  from "@/app/api/super/municipalities/route";
import { GET as itemGET, PATCH as itemPATCH, DELETE as itemDELETE }
  from "@/app/api/super/municipalities/[slug]/route";

type Params = { params: Promise<{ slug: string }> };

function makeParams(slug: string): Params {
  return { params: Promise.resolve({ slug }) };
}

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

interface Municipality {
  id: string;
  slug: string;
  name: string;
  province: string;
  active: boolean;
}

// ─── GET /api/super/municipalities ────────────────────────────────
describe("GET /api/super/municipalities (demo mode)", () => {
  it("returns 200 with array", async () => {
    const res  = await listGET();
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Municipality[] };
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("includes demo municipalities", async () => {
    const res  = await listGET();
    const json = await res.json() as { data: Municipality[] };
    const slugs = json.data.map(m => m.slug);
    expect(slugs).toContain("mulenvos");
    expect(slugs).toContain("luanda-sambizanga");
  });

  it("each entry has required fields", async () => {
    const res  = await listGET();
    const json = await res.json() as { data: Municipality[] };
    for (const m of json.data) {
      expect(typeof m.id).toBe("string");
      expect(typeof m.slug).toBe("string");
      expect(typeof m.name).toBe("string");
      expect(typeof m.province).toBe("string");
      expect(typeof m.active).toBe("boolean");
    }
  });

  it("kilamba-kiaxi is inactive", async () => {
    const res  = await listGET();
    const json = await res.json() as { data: Municipality[] };
    const kk   = json.data.find(m => m.slug === "kilamba-kiaxi");
    expect(kk).toBeDefined();
    expect(kk?.active).toBe(false);
  });
});

// ─── GET /api/super/municipalities/:slug ──────────────────────────
describe("GET /api/super/municipalities/:slug (demo mode)", () => {
  it("returns 200 for mulenvos", async () => {
    const res  = await itemGET(makeRequest("GET", "/api/super/municipalities/mulenvos"), makeParams("mulenvos"));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Municipality };
    expect(json.data.slug).toBe("mulenvos");
    expect(json.data.active).toBe(true);
  });

  it("returns 200 for luanda-sambizanga", async () => {
    const res  = await itemGET(makeRequest("GET", "/api/super/municipalities/luanda-sambizanga"), makeParams("luanda-sambizanga"));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Municipality };
    expect(json.data.slug).toBe("luanda-sambizanga");
  });

  it("returns 404 for unknown slug", async () => {
    const res = await itemGET(makeRequest("GET", "/api/super/municipalities/unknown-muni"), makeParams("unknown-muni"));
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/super/municipalities ───────────────────────────────
describe("POST /api/super/municipalities (demo mode)", () => {
  it("creates a new municipality and returns 201", async () => {
    const res = await listPOST(makeRequest("POST", "/api/super/municipalities", {
      slug:     "viana-integration-test",
      name:     "Município de Viana",
      province: "Luanda",
    }));
    expect(res.status).toBe(201);
    const json = await res.json() as { data: Municipality };
    expect(json.data.slug).toBe("viana-integration-test");
    expect(json.data.active).toBe(true);
  });

  it("returns 409 for duplicate slug", async () => {
    // "mulenvos" already exists
    const res = await listPOST(makeRequest("POST", "/api/super/municipalities", {
      slug:     "mulenvos",
      name:     "Duplicate",
      province: "Luanda",
    }));
    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid slug characters", async () => {
    const res = await listPOST(makeRequest("POST", "/api/super/municipalities", {
      slug:     "Invalid Slug!",
      name:     "Test",
      province: "Luanda",
    }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await listPOST(makeRequest("POST", "/api/super/municipalities", { slug: "no-name" }));
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/super/municipalities/:slug ────────────────────────
describe("PATCH /api/super/municipalities/:slug (demo mode)", () => {
  it("toggles active to false", async () => {
    const res  = await itemPATCH(
      makeRequest("PATCH", "/api/super/municipalities/luanda-sambizanga", { active: false }),
      makeParams("luanda-sambizanga"),
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Municipality };
    expect(json.data.active).toBe(false);
  });

  it("updates name", async () => {
    const res  = await itemPATCH(
      makeRequest("PATCH", "/api/super/municipalities/mulenvos", { name: "Novo Nome Mulenvos" }),
      makeParams("mulenvos"),
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { data: Municipality };
    expect(json.data.name).toBe("Novo Nome Mulenvos");
  });

  it("returns 404 for unknown slug", async () => {
    const res = await itemPATCH(
      makeRequest("PATCH", "/api/super/municipalities/no-such-muni", { active: true }),
      makeParams("no-such-muni"),
    );
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/super/municipalities/:slug ───────────────────────
describe("DELETE /api/super/municipalities/:slug (demo mode)", () => {
  it("returns 403 in demo mode", async () => {
    const res = await itemDELETE(
      makeRequest("DELETE", "/api/super/municipalities/kilamba-kiaxi"),
      makeParams("kilamba-kiaxi"),
    );
    expect(res.status).toBe(403);
  });
});
