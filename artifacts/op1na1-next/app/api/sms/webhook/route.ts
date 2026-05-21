/**
 * POST /api/sms/webhook
 *
 * Webhook Twilio para mensagens WhatsApp recebidas de cidadãos.
 * Implementa o Canal 2 — Fluxo Conversacional Inteligente (WhatsApp).
 *
 * Configuração Twilio:
 *   Messaging → Try it out → WhatsApp Sandbox settings
 *   "When a message comes in" → POST:
 *     https://op1na1-next.vercel.app/api/sms/webhook
 *
 * Fluxo de estados:
 *   IDLE → AWAITING_CATEGORY → AWAITING_DESCRIPTION → COMPLETE
 *
 * Comandos especiais (em qualquer estado):
 *   "OP123" / "estado OP123" → consulta estado do pedido
 *   "cancelar" / "sair"      → reinicia conversa
 */

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

import {
  getSession,
  saveSession,
  resetSession,
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
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<Response>\n  <Message>${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Message>\n</Response>`;
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
  } catch {
    return {};
  }
}

function validateSignature(req: NextRequest, params: Record<string, string>): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return true;
  const sig = req.headers.get("x-twilio-signature") ?? "";
  const url = `https://${req.headers.get("host")}${req.nextUrl.pathname}`;
  return twilio.validateRequest(token, sig, url, params);
}

async function lookupTicketStatus(ticketId: string): Promise<string | null> {
  if (DEMO_MODE) return null;
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
  } catch {
    return null;
  }
}

async function saveTicket(
  ticketId: string,
  phone:    string,
  category: string,
  description: string,
  priority: string,
  location: string | null
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

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const params = await parseForm(req);

  if (!DEMO_MODE && process.env.TWILIO_AUTH_TOKEN) {
    if (!validateSignature(req, params)) {
      console.warn("[wa/webhook] Assinatura Twilio inválida");
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const from = params["From"] ?? "";  // e.g. whatsapp:+244958000001
  const body = (params["Body"] ?? "").trim();
  if (!from || !body) return new NextResponse("OK", { status: 200 });

  const phone = from.replace("whatsapp:", "");
  const lower = body.toLowerCase();

  // ── Comandos globais ────────────────────────────────────────────────────────

  // Reiniciar conversa
  if (["cancelar", "sair", "menu", "inicio", "início", "recomeçar"].some(k => lower === k)) {
    resetSession(phone);
    return twiml(WA_MSG.welcome());
  }

  // Consulta de estado de pedido existente
  const trackMatch = lower.match(/(?:estado|acompanhar|ver)?\s*(op\d+)/);
  if (trackMatch) {
    const ticket = trackMatch[1].toUpperCase();
    const status = await lookupTicketStatus(ticket);

    const statusLabels: Record<string, string> = {
      received:    "✅ Recebido — Em fila de análise",
      in_progress: "🔍 Em análise pela equipa",
      resolved:    "✅ Resolvido",
      closed:      "📁 Encerrado",
    };
    const label = status ? (statusLabels[status] ?? status) : null;

    if (label) {
      return twiml(WA_MSG.statusFound(ticket, label));
    } else if (DEMO_MODE && trackMatch) {
      // Demo: retorna estado simulado
      return twiml(WA_MSG.statusFound(ticket, "🔍 Em análise pela equipa"));
    } else {
      return twiml(WA_MSG.statusNotFound(ticket));
    }
  }

  // ── Máquina de estados ─────────────────────────────────────────────────────

  const session = getSession(phone);

  switch (session.state) {
    // ── Estado 1: IDLE → apresentar menu ─────────────────────────────────────
    case "idle":
    case "complete": {
      saveSession({ ...session, state: "awaiting_category" });
      return twiml(WA_MSG.welcome());
    }

    // ── Estado 2: AWAITING_CATEGORY → processar escolha ──────────────────────
    case "awaiting_category": {
      const cat = parseCategoryInput(body);
      if (!cat) {
        return twiml(WA_MSG.unrecognised());
      }
      saveSession({
        ...session,
        state:       "awaiting_description",
        category:    cat.label,
        categoryNum: cat.num,
      });
      return twiml(WA_MSG.askDescription(cat.label));
    }

    // ── Estado 3: AWAITING_DESCRIPTION → classificar + criar ticket ───────────
    case "awaiting_description": {
      const description = body;
      const clf         = classifyMessage(`${session.category ?? ""} ${description}`);
      const ticketId    = genTicketId();

      const catLabel  = CATEGORY_LABELS[clf.category]  ?? (session.category ?? "Outros");
      const prioLabel = PRIORITY_LABELS[clf.priority];

      await saveTicket(
        ticketId,
        phone,
        session.category ?? clf.category,
        description,
        clf.priority,
        clf.location
      );

      saveSession({ ...session, state: "complete", description });
      resetSession(phone); // próxima mensagem começa novo fluxo

      return twiml(WA_MSG.confirmation(ticketId, catLabel, prioLabel));
    }

    default:
      resetSession(phone);
      return twiml(WA_MSG.welcome());
  }
}
