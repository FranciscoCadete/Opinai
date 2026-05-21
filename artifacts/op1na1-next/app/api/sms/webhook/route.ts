/**
 * POST /api/sms/webhook
 *
 * Webhook Twilio — Canal 2 (WhatsApp Conversacional Inteligente).
 *
 * Número institucional único: +244 958 746 812
 *
 * Menu principal:
 *   1 — Reportar Problema  → submenu de categorias → descrição → ticket OP###
 *   2 — Consultar Pedido   → pede número do pedido ou estado directo
 *   3 — Falar com Mediador → info de contacto + zonas
 *
 * Configuração Twilio:
 *   Messaging → WhatsApp Sandbox settings → "When a message comes in" → POST:
 *   https://op1na1-next.vercel.app/api/sms/webhook
 */

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

import {
  getSession,
  saveSession,
  resetSession,
  parseMainMenuInput,
  parseCategoryInput,
  WA_MSG,
} from "@/lib/whatsapp-flow";

import { classifyMessage, CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/classifier";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ── Helpers ───────────────────────────────────────────────────────────────────

function genTicketId(): string {
  const n = Math.floor(Math.random() * 900) + 100;
  return `OP${n}`;
}

function twiml(message: string): NextResponse {
  const safe = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Message>${safe}</Message>\n</Response>`;
  return new NextResponse(xml, {
    status:  200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

async function parseForm(req: NextRequest): Promise<Record<string, string>> {
  try {
    const fd = await req.formData();
    const out: Record<string, string> = {};
    fd.forEach((v, k) => { out[k] = String(v); });
    return out;
  } catch { return {}; }
}

function validateSignature(req: NextRequest, params: Record<string, string>): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return true;
  const sig = req.headers.get("x-twilio-signature") ?? "";
  const url = `https://${req.headers.get("host")}${req.nextUrl.pathname}`;
  return twilio.validateRequest(token, sig, url, params);
}

async function lookupStatus(ticketId: string): Promise<string | null> {
  if (DEMO_MODE) return "in_progress";
  try {
    const { db }                   = await import("@workspace/db");
    const { citizenRequestsTable } = await import("@workspace/db/schema");
    const { eq }                   = await import("drizzle-orm");
    const [row] = await db
      .select({ status: citizenRequestsTable.status })
      .from(citizenRequestsTable)
      .where(eq(citizenRequestsTable.ticketId, ticketId))
      .limit(1);
    return row?.status ?? null;
  } catch { return null; }
}

async function saveTicket(
  ticketId:    string,
  phone:       string,
  category:    string,
  description: string,
  priority:    string,
  location:    string | null
): Promise<void> {
  if (DEMO_MODE) return;
  try {
    const { db }                   = await import("@workspace/db");
    const { citizenRequestsTable } = await import("@workspace/db/schema");
    const now = new Date();
    await db.insert(citizenRequestsTable).values({
      ticketId,
      channel:     "whatsapp",
      phoneNumber: phone.replace("whatsapp:", ""),
      description: `[${category}] ${description}${location ? ` — ${location}` : ""}`,
      status:      "received",
      priority,
      createdAt:   now,
      updatedAt:   now,
    });
  } catch (e) {
    console.error("[wa/webhook] DB insert failed:", e);
  }
}

const STATUS_LABELS: Record<string, string> = {
  received:    "✅ Recebido — Em fila de análise",
  in_progress: "🔍 Em análise pela equipa",
  resolved:    "✅ Resolvido",
  closed:      "📁 Encerrado",
};

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const params = await parseForm(req);

  if (!DEMO_MODE && process.env.TWILIO_AUTH_TOKEN) {
    if (!validateSignature(req, params)) {
      console.warn("[wa/webhook] Assinatura inválida");
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const from = params["From"] ?? "";   // whatsapp:+244958746812
  const body = (params["Body"] ?? "").trim();
  if (!from || !body) return new NextResponse("OK", { status: 200 });

  const phone = from.replace("whatsapp:", "");
  const lower = body.toLowerCase();

  // ── Comandos globais (qualquer estado) ────────────────────────────────────

  // Reiniciar
  if (["cancelar", "sair", "menu", "inicio", "início", "voltar", "0"].some(k => lower === k)) {
    resetSession(phone);
    return twiml(WA_MSG.welcome());
  }

  // Consulta directa de ticket: "OP123" / "estado OP123"
  const trackMatch = lower.match(/(?:estado|consultar|ver)?\s*(op\d+)/);
  if (trackMatch) {
    const ticket = trackMatch[1].toUpperCase();
    const status = await lookupStatus(ticket);
    const label  = status ? (STATUS_LABELS[status] ?? status) : null;
    if (label) return twiml(WA_MSG.statusFound(ticket, label));
    return twiml(WA_MSG.statusNotFound(ticket));
  }

  // ── Máquina de estados ────────────────────────────────────────────────────

  const session = getSession(phone);

  // ── Nível 1: menu principal ───────────────────────────────────────────────
  if (session.state === "idle" || session.state === "complete") {
    const action = parseMainMenuInput(body);
    if (action) {
      if (action.action === "track") {
        // Não muda estado — pede o número do pedido
        saveSession({ ...session, state: "idle" });
        return twiml(WA_MSG.trackPrompt());
      }
      if (action.action === "mediator") {
        saveSession({ ...session, state: "idle" });
        return twiml(WA_MSG.mediatorInfo());
      }
      // action.action === "report" → vai para categorias
      saveSession({ ...session, state: "awaiting_category" });
      return twiml(WA_MSG.categoryMenu());
    }
    // Qualquer mensagem que não seja opção → apresenta menu
    saveSession({ ...session, state: "awaiting_action" });
    return twiml(WA_MSG.welcome());
  }

  if (session.state === "awaiting_action") {
    const action = parseMainMenuInput(body);
    if (!action) return twiml(WA_MSG.unrecognisedAction());
    if (action.action === "track") {
      saveSession({ ...session, state: "idle" });
      return twiml(WA_MSG.trackPrompt());
    }
    if (action.action === "mediator") {
      saveSession({ ...session, state: "idle" });
      return twiml(WA_MSG.mediatorInfo());
    }
    saveSession({ ...session, state: "awaiting_category" });
    return twiml(WA_MSG.categoryMenu());
  }

  // ── Nível 2: escolha de categoria ────────────────────────────────────────
  if (session.state === "awaiting_category") {
    const cat = parseCategoryInput(body);
    if (!cat) return twiml(WA_MSG.unrecognisedCategory());
    saveSession({ ...session, state: "awaiting_description", category: cat.label, categoryKey: cat.key });
    return twiml(WA_MSG.askDescription(cat.label));
  }

  // ── Nível 3: descrição + criar ticket ────────────────────────────────────
  if (session.state === "awaiting_description") {
    const clf      = classifyMessage(`${session.category ?? ""} ${body}`);
    const ticketId = genTicketId();
    const catLabel = CATEGORY_LABELS[clf.category] ?? (session.category ?? "Outros");
    const prioLabel = PRIORITY_LABELS[clf.priority];

    await saveTicket(ticketId, phone, session.category ?? clf.category, body, clf.priority, clf.location);

    resetSession(phone); // próxima mensagem reinicia fluxo
    return twiml(WA_MSG.confirmation(ticketId, catLabel, prioLabel));
  }

  // Fallback
  resetSession(phone);
  return twiml(WA_MSG.welcome());
}
