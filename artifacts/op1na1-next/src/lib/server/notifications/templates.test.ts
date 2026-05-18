import { describe, it, expect } from "vitest";
import {
  buildTemplate,
  getStatusLabel,
  NOTIFY_ON_STATUS,
  type NotifiableStatus,
  type Lang,
} from "./templates";

// ── NOTIFY_ON_STATUS ───────────────────────────────────────────────
describe("NOTIFY_ON_STATUS", () => {
  it("includes in_progress, resolved, rejected", () => {
    expect(NOTIFY_ON_STATUS.has("in_progress")).toBe(true);
    expect(NOTIFY_ON_STATUS.has("resolved")).toBe(true);
    expect(NOTIFY_ON_STATUS.has("rejected")).toBe(true);
  });

  it("excludes triaged and assigned", () => {
    expect(NOTIFY_ON_STATUS.has("triaged")).toBe(false);
    expect(NOTIFY_ON_STATUS.has("assigned")).toBe(false);
  });
});

// ── getStatusLabel ─────────────────────────────────────────────────
describe("getStatusLabel", () => {
  it("returns pt-AO label for in_progress", () => {
    expect(getStatusLabel("in_progress")).toBe("em progresso");
  });

  it("returns pt-AO label for resolved", () => {
    expect(getStatusLabel("resolved")).toBe("resolvido");
  });

  it("returns pt-AO label for rejected", () => {
    expect(getStatusLabel("rejected")).toBe("rejeitado");
  });

  it("returns pt-AO label for triaged", () => {
    expect(getStatusLabel("triaged")).toBe("em triagem");
  });

  it("returns pt-AO label for assigned", () => {
    expect(getStatusLabel("assigned")).toBe("atribuído");
  });

  it("defaults to pt-AO when no lang given", () => {
    expect(getStatusLabel("resolved")).toBe("resolvido");
  });

  it("returns kmb label", () => {
    const label = getStatusLabel("resolved", "kmb");
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });

  it("returns umb label", () => {
    const label = getStatusLabel("resolved", "umb");
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });

  it("falls back to status key for unknown status", () => {
    // TypeScript won't allow this normally, but the runtime guard should handle it
    const label = getStatusLabel("unknown" as NotifiableStatus);
    expect(label).toBe("unknown");
  });
});

// ── buildTemplate: in_progress ─────────────────────────────────────
describe("buildTemplate — in_progress", () => {
  const ctx = { ticketId: "MUL-20260518-ABCD", contactName: "João Silva", statusLabel: "em progresso" };

  it("sets subject with ticket ID", () => {
    const t = buildTemplate("in_progress", ctx);
    expect(t.subject).toContain("MUL-20260518-ABCD");
    expect(t.subject).toContain("Em progresso");
  });

  it("body includes greeting with contact name", () => {
    const t = buildTemplate("in_progress", ctx);
    expect(t.body).toContain("João Silva");
  });

  it("body includes ticket ID in bold", () => {
    const t = buildTemplate("in_progress", ctx);
    expect(t.body).toContain("**MUL-20260518-ABCD**");
  });

  it("body includes the op1na1 domain", () => {
    const t = buildTemplate("in_progress", ctx);
    expect(t.body).toContain("op1na1.mulenvos.ao");
  });

  it("body includes note when provided", () => {
    const t = buildTemplate("in_progress", { ...ctx, note: "Técnico deslocado ao local." });
    expect(t.body).toContain("Técnico deslocado ao local.");
  });

  it("body omits note line when not provided", () => {
    const t = buildTemplate("in_progress", ctx);
    expect(t.body).not.toContain("Nota:");
  });

  it("uses op1na1_status_update WhatsApp template", () => {
    const t = buildTemplate("in_progress", ctx);
    expect(t.whatsappTemplate.name).toBe("op1na1_status_update");
  });

  it("WhatsApp params[0] is ticket ID", () => {
    const t = buildTemplate("in_progress", ctx);
    expect(t.whatsappTemplate.params[0]).toBe("MUL-20260518-ABCD");
  });

  it("WhatsApp params[1] is status label", () => {
    const t = buildTemplate("in_progress", ctx);
    expect(t.whatsappTemplate.params[1]).toBe("em progresso");
  });

  it("WhatsApp params[2] uses note when provided", () => {
    const t = buildTemplate("in_progress", { ...ctx, note: "A processar." });
    expect(t.whatsappTemplate.params[2]).toBe("A processar.");
  });

  it("WhatsApp params[2] falls back to default when no note", () => {
    const t = buildTemplate("in_progress", ctx);
    expect(t.whatsappTemplate.params[2].length).toBeGreaterThan(0);
  });

  it("falls back to 'Cidadão' when contactName is empty", () => {
    const t = buildTemplate("in_progress", { ...ctx, contactName: "" });
    expect(t.body).toContain("Cidadão");
  });
});

// ── buildTemplate: resolved ────────────────────────────────────────
describe("buildTemplate — resolved", () => {
  const ctx = { ticketId: "MUL-20260518-EFGH", contactName: "Maria Santos", statusLabel: "resolvido" };

  it("subject contains ticket ID and resolved marker", () => {
    const t = buildTemplate("resolved", ctx);
    expect(t.subject).toContain("MUL-20260518-EFGH");
    expect(t.subject).toContain("Resolvido");
  });

  it("body contains resolved in bold", () => {
    const t = buildTemplate("resolved", ctx);
    expect(t.body).toContain("**resolvido**");
  });

  it("body contains thank-you message", () => {
    const t = buildTemplate("resolved", ctx);
    expect(t.body).toContain("Obrigado");
  });

  it("body includes resolution note when provided", () => {
    const t = buildTemplate("resolved", { ...ctx, note: "Canalização substituída." });
    expect(t.body).toContain("Canalização substituída.");
  });

  it("WhatsApp params[1] is 'resolvido'", () => {
    const t = buildTemplate("resolved", ctx);
    expect(t.whatsappTemplate.params[1]).toBe("resolvido");
  });

  it("WhatsApp params[2] uses note when provided", () => {
    const t = buildTemplate("resolved", { ...ctx, note: "Problema resolvido." });
    expect(t.whatsappTemplate.params[2]).toBe("Problema resolvido.");
  });
});

// ── buildTemplate: rejected ────────────────────────────────────────
describe("buildTemplate — rejected", () => {
  const ctx = { ticketId: "MUL-20260518-IJKL", contactName: "António Lopes", statusLabel: "rejeitado" };

  it("subject contains ticket ID", () => {
    const t = buildTemplate("rejected", ctx);
    expect(t.subject).toContain("MUL-20260518-IJKL");
  });

  it("body contains apology language", () => {
    const t = buildTemplate("rejected", ctx);
    expect(t.body).toContain("Lamentamos");
  });

  it("body contains 'rejeitado'", () => {
    const t = buildTemplate("rejected", ctx);
    expect(t.body).toContain("rejeitado");
  });

  it("body includes rejection reason when note provided", () => {
    const t = buildTemplate("rejected", { ...ctx, note: "Fora da área de competência municipal." });
    expect(t.body).toContain("Fora da área de competência municipal.");
  });

  it("body includes default contact message when no note", () => {
    const t = buildTemplate("rejected", ctx);
    expect(t.body).toContain("Contacte os nossos serviços");
  });

  it("body suggests submitting a new request", () => {
    const t = buildTemplate("rejected", ctx);
    expect(t.body).toContain("novo pedido");
  });

  it("WhatsApp params[1] is 'rejeitado'", () => {
    const t = buildTemplate("rejected", ctx);
    expect(t.whatsappTemplate.params[1]).toBe("rejeitado");
  });
});

// ── buildTemplate: default fallback (triaged / assigned) ──────────
describe("buildTemplate — fallback (triaged/assigned)", () => {
  it("triaged returns a generic template with ticket ID", () => {
    const t = buildTemplate("triaged", { ticketId: "MUL-X", contactName: "Test", statusLabel: "em triagem" });
    expect(t.subject).toContain("MUL-X");
    expect(t.body).toContain("MUL-X");
    expect(t.whatsappTemplate.name).toBe("op1na1_status_update");
  });

  it("assigned returns a generic template with ticket ID", () => {
    const t = buildTemplate("assigned", { ticketId: "MUL-Y", contactName: "Test", statusLabel: "atribuído" });
    expect(t.subject).toContain("MUL-Y");
    expect(t.body).toContain("MUL-Y");
  });
});

// ── buildTemplate: language variants ──────────────────────────────
describe("buildTemplate — language variants", () => {
  const langs: Lang[] = ["pt-AO", "kmb", "umb"];

  for (const lang of langs) {
    it(`resolved template in ${lang} has non-empty subject and body`, () => {
      const t = buildTemplate("resolved", {
        ticketId: "MUL-LANG",
        contactName: "Test",
        statusLabel: getStatusLabel("resolved", lang),
      }, lang);
      expect(t.subject.length).toBeGreaterThan(0);
      expect(t.body.length).toBeGreaterThan(0);
      expect(t.whatsappTemplate.params).toHaveLength(3);
    });
  }
});
