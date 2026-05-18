import { describe, it, expect, beforeEach } from "vitest";
import {
  demoLogin,
  demoLogout,
  demoGetMe,
  demoListAdminRequests,
  demoUpdateAdminRequest,
  demoListAdminUsers,
  demoCreateAdminUser,
  demoUpdateAdminUser,
  demoDeleteAdminUser,
  demoListAdminAuditLog,
  demoGetRealtimeStats,
} from "./demo";

// Reset session between tests
beforeEach(() => {
  demoLogout();
});

// ─── Auth ──────────────────────────────────────────────────────────

describe("demoLogin", () => {
  it("accepts admin credentials", () => {
    const user = demoLogin("admin@mulenvos.ao", "demo1234");
    expect(user.role).toBe("admin");
    expect(user.email).toBe("admin@mulenvos.ao");
  });

  it("accepts manager credentials", () => {
    const user = demoLogin("gestor@mulenvos.ao", "demo1234");
    expect(user.role).toBe("manager");
  });

  it("accepts technician credentials", () => {
    const user = demoLogin("tecnico@mulenvos.ao", "demo1234");
    expect(user.role).toBe("technician");
  });

  it("throws on wrong password", () => {
    expect(() => demoLogin("admin@mulenvos.ao", "wrong")).toThrow();
  });

  it("throws on unknown email", () => {
    expect(() => demoLogin("nobody@example.com", "demo1234")).toThrow();
  });

  it("is case-insensitive on email", () => {
    const user = demoLogin("ADMIN@MULENVOS.AO", "demo1234");
    expect(user.role).toBe("admin");
  });
});

describe("demoGetMe", () => {
  it("returns null before login", () => {
    expect(demoGetMe()).toBeNull();
  });

  it("returns user after login", () => {
    demoLogin("admin@mulenvos.ao", "demo1234");
    const me = demoGetMe();
    expect(me).not.toBeNull();
    expect(me?.role).toBe("admin");
  });

  it("returns null after logout", () => {
    demoLogin("admin@mulenvos.ao", "demo1234");
    demoLogout();
    expect(demoGetMe()).toBeNull();
  });
});

// ─── Requests ──────────────────────────────────────────────────────

describe("demoListAdminRequests", () => {
  it("returns items and total", async () => {
    const result = await demoListAdminRequests({});
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.total).toBe(result.items.length);
    expect(result.page).toBe(1);
  });

  it("filters by status", async () => {
    const result = await demoListAdminRequests({ status: "resolved" });
    expect(result.items.every(r => r.status === "resolved")).toBe(true);
  });

  it("filters by priority", async () => {
    const result = await demoListAdminRequests({ priority: "urgent" });
    expect(result.items.every(r => r.priority === "urgent")).toBe(true);
  });

  it("paginates correctly", async () => {
    const all = await demoListAdminRequests({});
    const page1 = await demoListAdminRequests({ page: 1, pageSize: 3 });
    expect(page1.items.length).toBeLessThanOrEqual(3);
    expect(page1.total).toBe(all.total);
  });

  it("searches by description", async () => {
    const all = await demoListAdminRequests({});
    const firstDesc = all.items[0].description.slice(0, 8).toLowerCase();
    const result = await demoListAdminRequests({ search: firstDesc });
    expect(result.items.length).toBeGreaterThan(0);
  });
});

describe("demoUpdateAdminRequest", () => {
  it("updates status", async () => {
    const list = await demoListAdminRequests({});
    const id = list.items[0].id;
    const updated = await demoUpdateAdminRequest(id, { status: "resolved" });
    expect(updated.status).toBe("resolved");
  });

  it("updates priority", async () => {
    const list = await demoListAdminRequests({});
    const id = list.items[0].id;
    const updated = await demoUpdateAdminRequest(id, { priority: "urgent" });
    expect(updated.priority).toBe("urgent");
  });

  it("throws on unknown id", async () => {
    await expect(demoUpdateAdminRequest("nonexistent", { status: "resolved" })).rejects.toThrow();
  });
});

// ─── Users ─────────────────────────────────────────────────────────

describe("demoListAdminUsers", () => {
  it("returns users list", async () => {
    const result = await demoListAdminUsers({});
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.total).toBe(result.items.length);
  });

  it("filters by role", async () => {
    const result = await demoListAdminUsers({ role: "admin" });
    expect(result.items.every(u => u.role === "admin")).toBe(true);
  });
});

describe("demoCreateAdminUser", () => {
  it("creates a new user", async () => {
    const before = await demoListAdminUsers({});
    const newUser = await demoCreateAdminUser({
      email: "novo@mulenvos.ao",
      name: "Novo Utilizador",
      password: "test1234",
      role: "technician",
    });
    expect(newUser.email).toBe("novo@mulenvos.ao");
    expect(newUser.role).toBe("technician");

    const after = await demoListAdminUsers({});
    expect(after.total).toBe(before.total + 1);
  });

  it("throws on duplicate email", async () => {
    await expect(
      demoCreateAdminUser({
        email: "admin@mulenvos.ao",
        name: "Dup",
        password: "test",
        role: "technician",
      })
    ).rejects.toThrow();
  });
});

describe("demoDeleteAdminUser", () => {
  it("removes a non-admin user", async () => {
    const list = await demoListAdminUsers({});
    const tech = list.items.find(u => u.role === "technician");
    if (!tech) return;
    const result = await demoDeleteAdminUser(tech.id);
    expect(result.deleted).toBe(true);
    const after = await demoListAdminUsers({});
    expect(after.items.find(u => u.id === tech.id)).toBeUndefined();
  });
});

// ─── Audit Log ─────────────────────────────────────────────────────

describe("demoListAdminAuditLog", () => {
  it("returns audit entries", async () => {
    const result = await demoListAdminAuditLog({});
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.total).toBe(result.items.length);
  });
});

// ─── Stats ─────────────────────────────────────────────────────────

describe("demoGetRealtimeStats", () => {
  it("returns all required fields", () => {
    const stats = demoGetRealtimeStats();
    expect(stats.resolvedThisMonth).toBeGreaterThanOrEqual(0);
    expect(stats.inProgress).toBeGreaterThanOrEqual(0);
    expect(stats.averageResponseHours).toBeGreaterThan(0);
    expect(stats.byCategory.length).toBeGreaterThan(0);
    expect(stats.byBairro.length).toBeGreaterThan(0);
    const totalPct = stats.byCategory.reduce((s, c) => s + c.pct, 0);
    expect(totalPct).toBe(100);
  });
});
