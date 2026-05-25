/**
 * POST /api/sms/africastalking
 *
 * Webhook receptor de SMS enviados por cidadãos.
 * Africa's Talking chama este endpoint automaticamente quando
 * um SMS chega ao shortcode/número registado.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURAÇÃO NO DASHBOARD AFRICA'S TALKING
 * ─────────────────────────────────────────────────────────────────────────────
 *   dashboard.africastalking.com → Settings → SMS Callback URL:
 *     https://op1na1-next.vercel.app/api/sms/africastalking
 *
 *   Método: POST
 *   Formato: application/x-www-form-urlencoded
 *   Payload:
 *     from        — número do remetente  (+244...)
 *     to          — shortcode destinatário
 *     text        — conteúdo do SMS
 *     id          — ID único da mensagem AT
 *     date        — timestamp ISO
 *     networkCode — código de rede (MCC+MNC)
 *     linkId      — presente apenas em SMS premium
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
import { sendSmsAT, buildAtStatusSms, verifyAtSignature } from "@/lib/africastalking";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ── Helpers ───────────────────────────────────────────────────────────────────

function genTicketId(): string {
  const n = Math.floor(Math.random() * 900) + 100;
  return `OP${n}`;
}

/** Aceita application/x-www-form-urlencoded e application/json */
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

  // application/x-www-form-urlencoded (formato padrão do AT)
  const params = new URLSearchParams(buf);
  const fields: Record<string, string> = {};
  params.forEach((v, k) => { fields[k] = v; });
  return { fields, raw: buf };
}

/** Verifica assinatura X-AT-Signature (apenas SMS Premium — AT não assina SMS regulares) */
async function isAuthorised(req: NextRequest, rawBody: string): Promise<boolean> {
  const apiKey = process.env.AT_API_KEY;
  const sig    = req.headers.get("x-at-signature");

  // AT só envia X-AT-Signature em SMS Premium; SMS regulares não têm assinatura.
  // Se o header estiver presente, validamos. Se ausente, aceitamos (callback URL é o segredo).
  if (!sig) return true;
  if (!apiKey) return true;

  return verifyAtSignature(rawBody, sig, apiKey);
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
    console.error("[at/webhook] DB lookup failed:", e);
    return "unknown";
  }
}

// ── Salvar pedido na BD ───────────────────────────────────────────────────────

async function saveTicket(
  ticketId:    string,
  phone:       string,
  catLabel:    string,
  text:        string,
  priority:    string,
  location:    string | null,
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
    console.error("[at/webhook] DB insert failed:", e);
    // Continua — responde sempre ao cidadão mesmo que a BD falhe
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { fields, raw } = await parseBody(req);

  // Verificação de assinatura (não fatal em DEMO_MODE)
  if (!DEMO_MODE) {
    const authorised = await isAuthorised(req, raw);
    if (!authorised) {
      console.warn("[at/webhook] Assinatura inválida:", req.headers.get("x-forwarded-for"));
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // Campos do payload Africa's Talking
  const from    = fields["from"]     ?? fields["originator"] ?? "";
  const message = fields["text"]     ?? fields["message"]    ?? fields["body"] ?? "";
  const msgId   = fields["id"]       ?? "";
  const network = fields["networkCode"] ?? "";

  if (!from || !message) {
    return NextResponse.json(
      { error: "Campos obrigatórios: from, text" },
      { status: 422 },
    );
  }

  const text  = message.trim();
  const lower = text.toLowerCase();

  // ── Consulta de estado de pedido existente ────────────────────────────────
  const trackMatch = lower.match(/(?:estado|acompanhar|ver|track)\s+(op\d+)|(op\d+)$/);
  if (trackMatch) {
    const ticket = (trackMatch[1] ?? trackMatch[2]).toUpperCase();
    const status = await lookupStatus(ticket);

    if (status === "not_found") {
      void sendSmsAT(from,
        `OP1NA1: Pedido ${ticket} nao encontrado.\nEnvie uma mensagem para registar nova ocorrencia.`,
      );
      return NextResponse.json({ action: "not_found", ticket, msgId });
    }

    void sendSmsAT(from, buildAtStatusSms(ticket, status));
    return NextResponse.json({ action: "status_sent", ticket, status, msgId });
  }

  // ── Novo pedido via SMS ───────────────────────────────────────────────────
  const clf       = classifyMessage(text);
  const catLabel  = CATEGORY_LABELS[clf.category];
  const prioLabel = PRIORITY_LABELS[clf.priority];
  const ticketId  = genTicketId();

  await saveTicket(ticketId, from, catLabel, text, clf.priority, clf.location);

  // Resposta automática ao cidadão
  const reply =
    `OP1NA1: Pedido ${ticketId} recebido!\n` +
    `Categoria: ${catLabel}\n` +
    `Prioridade: ${prioLabel}\n` +
    `Envie "${ticketId}" para acompanhar.`;

  void sendSmsAT(from, reply);

  return NextResponse.json({
    action:   "ticket_created",
    ticketId,
    category: clf.category,
    priority: clf.priority,
    location: clf.location,
    network,
    msgId,
  }, { status: 201 });
}

// ── GET — health check ────────────────────────────────────────────────────────

export async function GET() {
  const configured = !!(process.env.AT_API_KEY && process.env.AT_USERNAME);
  return NextResponse.json({
    service:     "OP1NA1 Africa's Talking Webhook",
    status:      "online",
    configured,
    sandbox:     process.env.AT_SANDBOX === "true",
    callbackUrl: "https://op1na1-next.vercel.app/api/sms/africastalking",
    usage:       "POST {from, text} — Africa's Talking envia automaticamente ao receber SMS",
  });
}
