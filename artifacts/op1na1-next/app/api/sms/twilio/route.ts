/**
 * POST /api/sms/twilio
 *
 * Webhook para SMS regulares recebidos no número Twilio +1 878 209 9415.
 * (Diferente do /api/sms/webhook que trata o fluxo WhatsApp conversacional)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURAÇÃO NO TWILIO CONSOLE
 * ─────────────────────────────────────────────────────────────────────────────
 *   console.twilio.com → Phone Numbers → +1 878 209 9415
 *   → Messaging → Webhook (POST):
 *     https://op1na1-next.vercel.app/api/sms/twilio
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Fluxo:
 *   SMS cidadão → Twilio → POST aqui → classifica → ticket OP### → TwiML reply
 *
 * Comandos reconhecidos:
 *   "OP123"        → estado do pedido
 *   qualquer texto → novo pedido classificado automaticamente
 */

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { classifyMessage, CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/classifier";
import { APP_URL } from "@/lib/contact";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ── Helpers ───────────────────────────────────────────────────────────────────

function genTicketId(): string {
  const n = Math.floor(Math.random() * 900) + 100;
  return `OP${n}`;
}

/** Resposta TwiML — formato que Twilio espera para SMS */
function twimlReply(message: string): NextResponse {
  const safe = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<Response>\n  <Message>${safe}</Message>\n</Response>`;
  return new NextResponse(xml, {
    status: 200,
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

/** Valida assinatura Twilio para prevenir chamadas não autorizadas */
function validateSignature(req: NextRequest, params: Record<string, string>): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return true; // sem token → aceitar (modo dev)
  const sig = req.headers.get("x-twilio-signature") ?? "";
  const url = `https://${req.headers.get("host")}${req.nextUrl.pathname}`;
  return twilio.validateRequest(token, sig, url, params);
}

async function lookupStatus(ticketId: string): Promise<string | null> {
  if (DEMO_MODE) return "received";
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
  ticketId: string,
  phone: string,
  catLabel: string,
  text: string,
  priority: string,
  location: string | null,
): Promise<void> {
  if (DEMO_MODE) return;
  try {
    const { db }                   = await import("@workspace/db");
    const { citizenRequestsTable } = await import("@workspace/db/schema");
    const now = new Date();
    await db.insert(citizenRequestsTable).values({
      ticketId,
      channel:     "sms",
      phoneNumber: phone,
      description: location
        ? `[${catLabel}] ${text} — ${location}`
        : `[${catLabel}] ${text}`,
      status:      "received",
      priority,
      createdAt:   now,
      updatedAt:   now,
    });
  } catch (e) {
    console.error("[twilio/sms] DB insert failed:", e);
  }
}

const STATUS_LABELS: Record<string, string> = {
  received:    "Recebido - Em fila",
  in_progress: "Em analise",
  resolved:    "Resolvido",
  closed:      "Encerrado",
};

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const params = await parseForm(req);

  // Validação de assinatura Twilio
  if (!DEMO_MODE && process.env.TWILIO_AUTH_TOKEN) {
    if (!validateSignature(req, params)) {
      console.warn("[twilio/sms] Assinatura inválida");
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const from = params["From"] ?? "";  // ex: +244911000001
  const body = (params["Body"] ?? "").trim();

  if (!from || !body) return new NextResponse("OK", { status: 200 });

  const lower = body.toLowerCase();

  // ── Consulta de pedido existente ──────────────────────────────────────────
  const trackMatch = lower.match(/(?:estado|ver|acompanhar)?\s*(op\d+)/);
  if (trackMatch) {
    const ticket = trackMatch[1].toUpperCase();
    const status = await lookupStatus(ticket);
    if (status) {
      const label = STATUS_LABELS[status] ?? status;
      return twimlReply(
        `OP1NA1 - ${ticket}\nEstado: ${label}\nDetalhes: ${APP_URL}/citizen-portal#consultar`,
      );
    }
    return twimlReply(
      `Pedido ${ticket} nao encontrado.\nEnvie uma descricao para criar novo pedido.`,
    );
  }

  // ── Novo pedido via SMS ───────────────────────────────────────────────────
  const clf       = classifyMessage(body);
  const catLabel  = CATEGORY_LABELS[clf.category];
  const prioLabel = PRIORITY_LABELS[clf.priority];
  const ticketId  = genTicketId();

  await saveTicket(ticketId, from, catLabel, body, clf.priority, clf.location);

  return twimlReply(
    `OP1NA1: Pedido ${ticketId} recebido!\n` +
    `Categoria: ${catLabel}\n` +
    `Prioridade: ${prioLabel}\n` +
    `Envie "${ticketId}" para acompanhar.\n` +
    `${APP_URL}/citizen-portal#consultar`,
  );
}

// ── GET — health check ────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    service:     "OP1NA1 Twilio SMS Webhook",
    number:      "+18782099415",
    status:      "online",
    callbackUrl: "https://op1na1-next.vercel.app/api/sms/twilio",
    usage:       "POST — Twilio envia automaticamente ao receber SMS no número",
  });
}
