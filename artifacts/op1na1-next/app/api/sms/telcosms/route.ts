/**
 * POST /api/sms/telcosms
 *
 * Webhook receptor de SMS enviados por cidadãos via TelcoSMS (shortcode 45544).
 * TelcoSMS chama este endpoint automaticamente quando um SMS chega ao shortcode.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURAÇÃO NO PAINEL TELCOSMS
 * ─────────────────────────────────────────────────────────────────────────────
 *   https://telcosms.co.ao/aplicacoes/4144
 *   → Configurações → Callback / Webhook URL:
 *       https://op1na1-next.vercel.app/api/sms/telcosms
 *
 *   Método:  POST
 *   Formato: application/x-www-form-urlencoded  ou  application/json
 *
 * Campos esperados no payload (aceita múltiplos nomes por compatibilidade):
 *   from        — número do remetente (+244...)
 *   text        — conteúdo do SMS
 *   to          — shortcode destino (45544)
 *   id / msgid  — ID único da mensagem
 *
 * ⚠️  Confirmar formato exacto com suporte@telcosms.co.ao
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Comandos reconhecidos (case-insensitive):
 *   "OP123"              → estado do pedido OP123
 *   "estado OP123"       → idem
 *   "acompanhar OP123"   → idem
 *   qualquer outra coisa → cria novo pedido, responde com OP###
 */

import { NextRequest, NextResponse } from "next/server";
import { classifyMessage, CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/classifier";
import {
  sendSmsTelco,
  buildTelcoStatusSms,
  getTelcoStatus,
} from "@/lib/telcosms";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ── Helpers ───────────────────────────────────────────────────────────────────

function genTicketId(): string {
  const n = Math.floor(Math.random() * 900) + 100;
  return `OP${n}`;
}

/**
 * Aceita application/x-www-form-urlencoded e application/json.
 * Normaliza os campos para um objecto único.
 */
async function parseBody(req: NextRequest): Promise<{ fields: Record<string, string>; raw: string }> {
  const ct  = req.headers.get("content-type") ?? "";
  const buf = await req.text();

  if (ct.includes("application/json")) {
    try {
      return { fields: JSON.parse(buf) as Record<string, string>, raw: buf };
    } catch {
      return { fields: {}, raw: buf };
    }
  }

  // application/x-www-form-urlencoded (formato padrão de muitos providers)
  const params = new URLSearchParams(buf);
  const fields: Record<string, string> = {};
  params.forEach((v, k) => { fields[k] = v; });
  return { fields, raw: buf };
}

/** Validação opcional de API key recebida no header — protege contra abuso */
function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.TELCO_WEBHOOK_SECRET;
  if (!secret) return true; // sem segredo configurado → aceita tudo (callback URL é o segredo)

  const provided =
    req.headers.get("x-telco-signature") ??
    req.headers.get("x-api-key")         ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  return provided === secret;
}

// ── Lookup de estado na BD ────────────────────────────────────────────────────

async function lookupStatus(ticketId: string): Promise<string> {
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
    return row?.status ?? "not_found";
  } catch (e) {
    console.error("[telcosms/webhook] DB lookup failed:", e);
    return "unknown";
  }
}

// ── Salvar pedido na BD ───────────────────────────────────────────────────────

async function saveTicket(
  ticketId: string,
  phone:    string,
  catLabel: string,
  text:     string,
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
    console.error("[telcosms/webhook] DB insert failed:", e);
    // Continua — responde sempre ao cidadão mesmo que a BD falhe
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { fields } = await parseBody(req);

  // Verificação de segredo (não fatal em DEMO_MODE)
  if (!DEMO_MODE && !isAuthorised(req)) {
    console.warn("[telcosms/webhook] Acesso não autorizado:", req.headers.get("x-forwarded-for"));
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Normalizar campos — TelcoSMS pode usar diferentes nomes de campo
  const from = (
    fields["from"]     ??
    fields["msisdn"]   ??
    fields["sender"]   ??
    fields["numero"]   ??
    fields["originator"] ??
    ""
  ).trim();

  const message = (
    fields["text"]     ??
    fields["message"]  ??
    fields["mensagem"] ??
    fields["body"]     ??
    fields["corpo"]    ??
    ""
  ).trim();

  const msgId = fields["id"] ?? fields["msgid"] ?? fields["message_id"] ?? "";

  if (!from || !message) {
    return NextResponse.json(
      { error: "Campos obrigatórios: from (ou msisdn), text (ou message)" },
      { status: 422 },
    );
  }

  const lower = message.toLowerCase();

  // ── Consulta de estado de pedido existente ────────────────────────────────
  const trackMatch = lower.match(/(?:estado|acompanhar|ver|track)\s+(op\d+)|(op\d+)$/);
  if (trackMatch) {
    const ticket = (trackMatch[1] ?? trackMatch[2]).toUpperCase();
    const status = await lookupStatus(ticket);

    if (status === "not_found") {
      void sendSmsTelco(from,
        `OP1NA1: Pedido ${ticket} nao encontrado.\nEnvie uma mensagem para registar nova ocorrencia.`,
      );
      return NextResponse.json({ action: "not_found", ticket, msgId });
    }

    void sendSmsTelco(from, buildTelcoStatusSms(ticket, status));
    return NextResponse.json({ action: "status_sent", ticket, status, msgId });
  }

  // ── Novo pedido via SMS ───────────────────────────────────────────────────
  const clf       = classifyMessage(message);
  const catLabel  = CATEGORY_LABELS[clf.category];
  const prioLabel = PRIORITY_LABELS[clf.priority];
  const ticketId  = genTicketId();

  await saveTicket(ticketId, from, catLabel, message, clf.priority, clf.location);

  // Resposta automática ao cidadão
  const reply =
    `OP1NA1: Pedido ${ticketId} recebido!\n` +
    `Categoria: ${catLabel}\n` +
    `Prioridade: ${prioLabel}\n` +
    `Envie "${ticketId}" para acompanhar.`;

  void sendSmsTelco(from, reply);

  return NextResponse.json({
    action:   "ticket_created",
    ticketId,
    category: clf.category,
    priority: clf.priority,
    location: clf.location,
    msgId,
  }, { status: 201 });
}

// ── GET — health check ────────────────────────────────────────────────────────

export async function GET() {
  const s = getTelcoStatus();
  return NextResponse.json({
    service:     "OP1NA1 TelcoSMS Webhook",
    status:      "online",
    configured:  s.configured,
    sandbox:     s.sandbox,
    shortcode:   s.shortcode,
    appId:       s.appId,
    mechanism:   s.mechanism,
    callbackUrl: "https://op1na1-next.vercel.app/api/sms/telcosms",
    usage:       "POST {from, text} — TelcoSMS envia ao receber SMS no shortcode 45544",
    setup:       s.configured ? "OK" : "⚠️ TELCO_LOGIN e/ou TELCO_PASSWORD não configuradas.",
  });
}
