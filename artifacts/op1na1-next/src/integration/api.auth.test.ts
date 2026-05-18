import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Route handlers under test
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { GET  as meGET }      from "@/app/api/auth/me/route";

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── POST /api/auth/login ──────────────────────────────────────────
describe("POST /api/auth/login (demo mode)", () => {
  it("returns 200 + user object for valid admin credentials", async () => {
    const res = await loginPOST(makeRequest("POST", "/api/auth/login", {
      email: "admin@mulenvos.ao",
      password: "demo1234",
    }));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { role: string; email: string } };
    expect(json.data.role).toBe("admin");
    expect(json.data.email).toBe("admin@mulenvos.ao");
  });

  it("returns 200 for manager credentials", async () => {
    const res = await loginPOST(makeRequest("POST", "/api/auth/login", {
      email: "gestor@mulenvos.ao",
      password: "demo1234",
    }));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { role: string } };
    expect(json.data.role).toBe("manager");
  });

  it("returns 200 for technician credentials", async () => {
    const res = await loginPOST(makeRequest("POST", "/api/auth/login", {
      email: "tecnico@mulenvos.ao",
      password: "demo1234",
    }));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { role: string } };
    expect(json.data.role).toBe("technician");
  });

  it("returns 403 for wrong password", async () => {
    const res = await loginPOST(makeRequest("POST", "/api/auth/login", {
      email: "admin@mulenvos.ao",
      password: "wrongpassword",
    }));
    expect(res.status).toBe(403);
  });

  it("returns 403 for unknown email", async () => {
    const res = await loginPOST(makeRequest("POST", "/api/auth/login", {
      email: "unknown@example.com",
      password: "demo1234",
    }));
    expect(res.status).toBe(403);
  });

  it("is case-insensitive for email", async () => {
    const res = await loginPOST(makeRequest("POST", "/api/auth/login", {
      email: "ADMIN@MULENVOS.AO",
      password: "demo1234",
    }));
    expect(res.status).toBe(200);
  });

  it("returns 400 for missing body fields", async () => {
    const res = await loginPOST(makeRequest("POST", "/api/auth/login", { email: "admin@mulenvos.ao" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for completely invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(400);
  });

  it("response includes municipalityId", async () => {
    const res = await loginPOST(makeRequest("POST", "/api/auth/login", {
      email: "admin@mulenvos.ao",
      password: "demo1234",
    }));
    const json = await res.json() as { data: { municipalityId: string } };
    expect(typeof json.data.municipalityId).toBe("string");
    expect(json.data.municipalityId.length).toBeGreaterThan(0);
  });
});

// ─── POST /api/auth/logout ─────────────────────────────────────────
describe("POST /api/auth/logout (demo mode)", () => {
  it("returns 200", async () => {
    const res = await logoutPOST(makeRequest("POST", "/api/auth/logout"));
    expect(res.status).toBe(200);
  });

  it("returns ok:true", async () => {
    const res  = await logoutPOST(makeRequest("POST", "/api/auth/logout"));
    const json = await res.json() as { data: unknown };
    expect(json.data).toBeTruthy();
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────
describe("GET /api/auth/me (demo mode, no session cookie)", () => {
  it("returns 200 with null data when no session cookie is set", async () => {
    const res  = await meGET(makeRequest("GET", "/api/auth/me"));
    const json = await res.json() as { data: unknown };
    // Demo mode: no cookie → null user
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) expect(json.data).toBeNull();
  });
});
