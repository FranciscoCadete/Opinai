/**
 * POST /api/sms/webhook
 *
 * Twilio webhook for inbound SMS and WhatsApp messages from citizens.
 *
 * Configure this URL in the Twilio console:
 *   → Phone Numbers → Manage → Active numbers → [your number]
 *     → Messaging → "A message comes in" → Webhook → POST
 *     → https://op1na1-next.vercel.app/api/sms/webhook
 *
 * Also configure the same URL for the WhatsApp Sandbox:
 *   → Messaging → Try it out → Send a WhatsApp message
 *     → Sandbox settings → "When a message comes in" field
 *
 * Twilio sends x-www-form-urlencoded, not JSON.
 *
 * Message commands understood:
 *   "OP123"           → state of ticket OP123
 *   "estado OP123"    → same
 *   "acompanhar OP123"→ same
 *   anything else     → create new request, reply with ticket ID
 */

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ── Helpers ───────────────────────────────────────────────────────────────────

function genTicketId(): string {
  const n = Math.floor(Math.random() * 900) + 100;
  return `OP${n}`;
}

function twimlResponse(message: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Message>${escapeXml(message)}</Message>\n</Response>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── Signature validation ──────────────────────────────────────────────────────

function validateTwilioSignature(
  req: NextRequest,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false; // skip if not configured

  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url       = `https://${req.headers.get("host")}${req.nextUrl.pathname}`;

  return twilio.validateRequest(authToken, signature, url, params);
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Parse form body that Twilio sends
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  const from    = params["From"]  ?? "";
  const msgBody = params["Body"]  ?? "";

  // ── Signature validation (production only) ──────────────────────────────────
  if (!DEMO_MODE && process.env.TWILIO_AUTH_TOKEN) {
    if (!validateTwilioSignature(req, params)) {
      console.warn("[sms/webhook] Invalid Twilio signature from", from);
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const isWhatsApp = from.startsWith("whatsapp:");
  const channel    = isWhatsApp ? "whatsapp" : "sms";
  const phone      = from.replace("whatsapp:", "");
  const text       = msgBody.trim();
  const lower      = text.toLowerCase();

  // ── Track existing ticket ─────────────────────────────────────────────────
  const trackMatch = lower.match(
    /(?:estado|acompanhar|track|ver)\s+(op\d+)|(op\d+)/i
  );
  if (trackMatch) {
    const ticket = (trackMatch[1] ?? trackMatch[2]).toUpperCase();
    // In real mode, look up DB; in demo, return mock state
    const estado = "Em análise";
    const previsao = "48h";
    return twimlResponse(
      `OP1NA1 — Pedido ${ticket}\n` +
      `Estado: ${estado}\n` +
      `Previsão de resposta: ${previsao}\n` +
      `Detalhes: op1na1-next.vercel.app/citizen-portal#consultar`
    );
  }

  // ── Create new request ────────────────────────────────────────────────────
  const ticketId = genTicketId();

  if (!DEMO_MODE) {
    try {
      const { db }                   = await import("@workspace/db");
      const { citizenRequestsTable } = await import("@workspace/db/schema");
      const now = new Date();
      await db.insert(citizenRequestsTable).values({
        ticketId,
        channel,
        phoneNumber: phone,
        description: text || "(sem descrição — via " + channel.toUpperCase() + ")",
        status:      "received",
        priority:    "normal",
        createdAt:   now,
        updatedAt:   now,
      });
    } catch (e) {
      console.error("[sms/webhook] DB insert failed:", e);
      // Still reply to the citizen — don't leave them hanging
    }
  }

  return twimlResponse(
    `OP1NA1: Pedido recebido! 📋\n` +
    `Referência: ${ticketId}\n` +
    `Guarde este número. Para verificar o estado envie: "${ticketId}"\n` +
    `Tempo médio de resposta: 48h.`
  );
}
