// Integration tests for the notification engine.
// Tests the full dispatch chain: notifyStatusChange() → channel routing → provider call.
// External HTTP calls (Meta/Twilio/Resend) are intercepted via vi.stubGlobal("fetch").

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notifyStatusChange } from "@/lib/server/notifications/index";

const TICKET = "MUL-20260518-TEST";
const BASE = {
  ticketId:       TICKET,
  contactName:    "Test User",
  contactPhone:   "+244923000001",
  contactEmail:   "test@example.ao",
  isAnonymous:    false,
  previousStatus: "triaged",
  channel:        "portal" as const,
};

// Provider mock responses
function mockFetch(ok = true, payload: object = {}) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json:   async () => payload,
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch(true, { id: "mock-email-id" }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ─── Guard conditions ─────────────────────────────────────────────
describe("notifyStatusChange — guards", () => {
  it("skips anonymous requests", async () => {
    const result = await notifyStatusChange({ ...BASE, isAnonymous: true, newStatus: "resolved" });
    expect(result.sent).toBe(false);
    expect(result.error).toBe("anonymous");
  });

  it("skips non-notifiable statuses (triaged)", async () => {
    const result = await notifyStatusChange({ ...BASE, newStatus: "triaged" });
    expect(result.sent).toBe(false);
    expect(result.error).toBe("status_not_notifiable");
  });

  it("skips non-notifiable statuses (assigned)", async () => {
    const result = await notifyStatusChange({ ...BASE, newStatus: "assigned" });
    expect(result.sent).toBe(false);
    expect(result.error).toBe("status_not_notifiable");
  });

  it("skips when status is unchanged", async () => {
    const result = await notifyStatusChange({ ...BASE, newStatus: "resolved", previousStatus: "resolved" });
    expect(result.sent).toBe(false);
    expect(result.error).toBe("status_unchanged");
  });
});

// ─── Email channel (portal) ──────────────────────────────────────
describe("notifyStatusChange — email (portal channel)", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM", "OP1NA1 <notificacoes@mulenvos.ao>");
    vi.stubGlobal("fetch", mockFetch(true, { id: "resend-msg-001" }));
  });

  it("sends email for portal channel + resolved status", async () => {
    const result = await notifyStatusChange({ ...BASE, channel: "portal", newStatus: "resolved" });
    expect(result.sent).toBe(true);
    expect(result.channel).toBe("email");
  });

  it("sends email for messenger channel + in_progress status", async () => {
    const result = await notifyStatusChange({ ...BASE, channel: "messenger", newStatus: "in_progress" });
    expect(result.sent).toBe(true);
    expect(result.channel).toBe("email");
  });

  it("sends email for rejected status", async () => {
    const result = await notifyStatusChange({ ...BASE, channel: "portal", newStatus: "rejected" });
    expect(result.sent).toBe(true);
    expect(result.channel).toBe("email");
  });

  it("calls Resend API with correct URL", async () => {
    const mockFn = mockFetch(true, { id: "resend-msg-002" });
    vi.stubGlobal("fetch", mockFn);
    await notifyStatusChange({ ...BASE, channel: "portal", newStatus: "resolved" });
    const [url] = mockFn.mock.calls[0] as [string, ...unknown[]];
    expect(url).toContain("api.resend.com");
  });

  it("falls back to SMS when email fails and phone available (portal, no email)", async () => {
    // No email address but has phone
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC_test");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "auth_test");
    vi.stubEnv("TWILIO_FROM_NUMBER", "+1234567890");
    vi.stubGlobal("fetch", mockFetch(true, { sid: "SM_test" }));
    const result = await notifyStatusChange({ ...BASE, channel: "portal", contactEmail: null, newStatus: "resolved" });
    // No email configured → tries SMS fallback for portal-with-phone
    expect(result.sent).toBe(true);
    expect(result.channel).toBe("sms");
  });
});

// ─── SMS channel ─────────────────────────────────────────────────
describe("notifyStatusChange — SMS channel", () => {
  beforeEach(() => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC_test_sid");
    vi.stubEnv("TWILIO_AUTH_TOKEN",  "test_auth_token");
    vi.stubEnv("TWILIO_FROM_NUMBER", "+1234567890");
    vi.stubGlobal("fetch", mockFetch(true, { sid: "SM_test_001" }));
  });

  it("sends SMS for sms channel + in_progress", async () => {
    const result = await notifyStatusChange({ ...BASE, channel: "sms", newStatus: "in_progress" });
    expect(result.sent).toBe(true);
    expect(result.channel).toBe("sms");
  });

  it("sends SMS for ussd channel", async () => {
    const result = await notifyStatusChange({ ...BASE, channel: "ussd", newStatus: "resolved" });
    expect(result.sent).toBe(true);
    expect(result.channel).toBe("sms");
  });

  it("calls Twilio API", async () => {
    const mockFn = mockFetch(true, { sid: "SM_test_002" });
    vi.stubGlobal("fetch", mockFn);
    await notifyStatusChange({ ...BASE, channel: "sms", newStatus: "in_progress" });
    const [url] = mockFn.mock.calls[0] as [string, ...unknown[]];
    expect(url).toContain("twilio.com");
  });

  it("returns not sent when no phone and no email", async () => {
    const result = await notifyStatusChange({
      ...BASE, channel: "sms", contactPhone: null, contactEmail: null, newStatus: "resolved",
    });
    expect(result.sent).toBe(false);
  });
});

// ─── WhatsApp channel ─────────────────────────────────────────────
describe("notifyStatusChange — WhatsApp channel", () => {
  beforeEach(() => {
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "1234567890");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN",    "EAA_test_token");
    vi.stubGlobal("fetch", mockFetch(true, { messages: [{ id: "wamid.test" }] }));
  });

  it("sends WhatsApp template for whatsapp channel + resolved", async () => {
    const result = await notifyStatusChange({ ...BASE, channel: "whatsapp", newStatus: "resolved" });
    expect(result.sent).toBe(true);
    expect(result.channel).toBe("whatsapp");
  });

  it("falls back to SMS when WhatsApp fails", async () => {
    // WhatsApp fails, SMS succeeds
    let call = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      call++;
      if (call === 1) return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: { message: "WA error" } }) });
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ sid: "SM_fallback" }) });
    }));
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC_test");
    vi.stubEnv("TWILIO_AUTH_TOKEN",  "auth_test");
    vi.stubEnv("TWILIO_FROM_NUMBER", "+1234567890");

    const result = await notifyStatusChange({ ...BASE, channel: "whatsapp", newStatus: "in_progress" });
    expect(result.sent).toBe(true);
    expect(result.channel).toBe("sms");
  });

  it("calls WhatsApp Graph API", async () => {
    const mockFn = mockFetch(true, { messages: [{ id: "wamid.verify" }] });
    vi.stubGlobal("fetch", mockFn);
    await notifyStatusChange({ ...BASE, channel: "whatsapp", newStatus: "resolved" });
    const [url] = mockFn.mock.calls[0] as [string, ...unknown[]];
    expect(url).toContain("graph.facebook.com");
  });
});

// ─── No credentials configured ────────────────────────────────────
describe("notifyStatusChange — no providers configured", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY",              "");
    vi.stubEnv("TWILIO_ACCOUNT_SID",          "");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID",    "");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN",       "");
  });

  it("returns sent:false and no_reachable_channel", async () => {
    const result = await notifyStatusChange({ ...BASE, channel: "portal", newStatus: "resolved" });
    expect(result.sent).toBe(false);
    expect(result.error).toBe("no_reachable_channel");
  });

  it("never throws", async () => {
    await expect(
      notifyStatusChange({ ...BASE, channel: "whatsapp", newStatus: "in_progress" }),
    ).resolves.toBeDefined();
  });
});
