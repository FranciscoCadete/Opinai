/**
 * POST /api/sms/smsmobile
 *
 * Webhook receptor de mensagens SMS enviadas por cidadãos.
 * A app Android SMSMobileAPI, ao receber um SMS no dispositivo registado,
 * chama este endpoint automaticamente com os dados da mensagem.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURAÇÃO NA APP ANDROID SMSMobileAPI
 * ─────────────────────────────────────────────────────────────────────────────
 * Na app → Configurações → Webhook URL (incoming):
 *   https://op1na1-next.vercel.app/api/sms/smsmobile
 *
 * Método: POST
 * Formato: JSON  {"waphone":"…","message":"…","date_received":"…"}
 *          ou Form  waphone=…&message=…&date_received=…
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Comandos reconhecidos (case-insensitive):
 *   "OP123"              → estado do pedido OP123
 *   "estado OP123"       → idem
 *   "acompanhar OP123"   → idem
 *   qualquer outra coisa → cria novo pedido e responde com número OP###
 */

import { NextRequest, NextResponse } from "next/server";
import { classifyMessage, CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/classifier";
import {
  sendSmsMobile,
  buildConfirmationSms,
  buildStatusSms,
} from "@/lib/smsmobileapi";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ── Helpers ───────────────────────────────────────────────────────────────────

function genTicketId(): string {
  const n = Math.floor(Math.random() * 900) + 100;
  return `OP${n}`;
}

/** Parse both JSON and form-urlencoded bodies from SMSMobileAPI */
async function parseBody(req: NextRequest): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("application/json")) {
    try {
      return (await req.json()) as Record<string, string>;
    } catch {
      return {};
    }
  }

  // form-urlencoded (fallback)
  try {
    const fd = await req.formData();
    const out: Record<string, string> = {};
    fd.forEach((v, k) => { out[k] = String(v); });
    return out;
  } catch {
    return {};
  }
}

/**
 * Lightweight request validator: checks the API key is present in the request
 * so random HTTP crawlers can't inject fake messages.
 * SMSMobileAPI can be configured to send the key as a header or query param.
 */
function isAuthorised(req: NextRequest): boolean {
  const apiKey = process.env.SMSMOBILE_API_KEY;
  if (!apiKey) return true; // not configured → open (warn only in dev)

  // Accept key as: ?apikey=… header X-Api-Key: … or Authorization: Bearer …
  const fromQuery  = req.nextUrl.searchParams.get("apikey");
  const fromHeader = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");

  return fromQuery === apiKey || fromHeader === apiKey;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    console.warn("[smsmobile/webhook] Pedido não autorizado:", req.headers.get("x-forwarded-for"));
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await parseBody(req);

  // SMSMobileAPI field names (accepts both "waphone" and "phone")
  const from    = body["waphone"] ?? body["phone"] ?? body["from"] ?? "";
  const message = body["message"] ?? body["body"]  ?? body["text"] ?? "";

  if (!from || !message) {
    return NextResponse.json({ error: "Campos obrigatórios: waphone, message" }, { status: 422 });
  }

  const text  = message.trim();
  const lower = text.toLowerCase();

  // ── Consulta de estado de pedido existente ──────────────────────────────────
  const trackMatch = lower.match(/(?:estado|acompanhar|ver|track)\s+(op\d+)|(op\d+)$/);
  if (trackMatch) {
    const ticket = (trackMatch[1] ?? trackMatch[2]).toUpperCase();

    let status   = "received";
    let previsao = "48h";

    if (!DEMO_MODE) {
      try {
        const { db }                   = await import("@workspace/db");
        const { citizenRequestsTable } = await import("@workspace/db/schema");
        const { eq }                   = await import("drizzle-orm");
        const [row] = await db
          .select({ status: citizenRequestsTable.status })
          .from(citizenRequestsTable)
          .where(eq(citizenRequestsTable.ticketId, ticket))
          .limit(1);
        if (row) status = row.status;
      } catch (e) {
        console.error("[smsmobile/webhook] DB lookup failed:", e);
      }
    }

    void sendSmsMobile(from, buildStatusSms(ticket, status, previsao));
    return NextResponse.json({ action: "status_sent", ticket });
  }

  // ── Classificação automática da mensagem ─────────────────────────────────────
  const clf      = classifyMessage(text);
  const catLabel = CATEGORY_LABELS[clf.category];
  const prioLabel = PRIORITY_LABELS[clf.priority];

  // ── Novo pedido via SMS ─────────────────────────────────────────────────────
  const ticketId = genTicketId();

  if (!DEMO_MODE) {
    try {
      const { db }                   = await import("@workspace/db");
      const { citizenRequestsTable } = await import("@workspace/db/schema");
      const now = new Date();
      await db.insert(citizenRequestsTable).values({
        ticketId,
        channel:     "sms",
        phoneNumber: from,
        description: clf.location
          ? `[${catLabel}] ${text} — ${clf.location}`
          : `[${catLabel}] ${text}`,
        status:      "received",
        priority:    clf.priority,
        createdAt:   now,
        updatedAt:   now,
      });
    } catch (e) {
      console.error("[smsmobile/webhook] DB insert failed:", e);
      // Continua — responde sempre ao cidadão
    }
  }

  // Resposta automática com categoria detectada
  const reply =
    `OP1NA1: Pedido ${ticketId} recebido ✅\n` +
    `Categoria: ${catLabel}\n` +
    `Prioridade: ${prioLabel}\n` +
    `Envie "${ticketId}" para acompanhar.`;

  void sendSmsMobile(from, reply);

  return NextResponse.json({
    action: "ticket_created",
    ticketId,
    category: clf.category,
    priority: clf.priority,
    location: clf.location,
  }, { status: 201 });
}

// ── GET — health check (útil para testar o webhook manualmente) ───────────────
export async function GET() {
  return NextResponse.json({
    service: "OP1NA1 SMSMobileAPI Webhook",
    status:  "online",
    usage:   "POST com {waphone, message} para processar SMS recebido",
  });
}
