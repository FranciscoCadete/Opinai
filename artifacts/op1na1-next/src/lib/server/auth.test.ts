import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "./auth";
import type { SessionPayload } from "./auth";

const SAMPLE: Omit<SessionPayload, "iat" | "exp"> = {
  sub: "u-test-001",
  email: "test@mulenvos.ao",
  name: "Teste",
  role: "admin",
  municipalityId: "mun-mulenvos",
};

describe("signSession / verifySession", () => {
  it("round-trips a valid session", async () => {
    const token = await signSession(SAMPLE);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // JWT structure

    const payload = await verifySession(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe(SAMPLE.sub);
    expect(payload?.email).toBe(SAMPLE.email);
    expect(payload?.role).toBe(SAMPLE.role);
    expect(payload?.municipalityId).toBe(SAMPLE.municipalityId);
  });

  it("returns null for a tampered token", async () => {
    const token = await signSession(SAMPLE);
    const tampered = token.slice(0, -4) + "XXXX";
    const result = await verifySession(tampered);
    expect(result).toBeNull();
  });

  it("returns null for a completely invalid string", async () => {
    expect(await verifySession("not.a.jwt")).toBeNull();
    expect(await verifySession("")).toBeNull();
  });

  it("encodes all roles correctly", async () => {
    const roles = ["admin", "manager", "technician", "citizen"] as const;
    for (const role of roles) {
      const token = await signSession({ ...SAMPLE, role });
      const payload = await verifySession(token);
      expect(payload?.role).toBe(role);
    }
  });

  it("preserves null municipalityId", async () => {
    const token = await signSession({ ...SAMPLE, municipalityId: null });
    const payload = await verifySession(token);
    expect(payload?.municipalityId).toBeNull();
  });

  it("produces different tokens for same payload (iat jitter)", async () => {
    await new Promise(r => setTimeout(r, 10));
    const t1 = await signSession(SAMPLE);
    await new Promise(r => setTimeout(r, 10));
    const t2 = await signSession(SAMPLE);
    expect(t1).not.toBe(t2);
  });
});
