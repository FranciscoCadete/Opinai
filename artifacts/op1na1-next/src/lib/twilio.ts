/**
 * Twilio client singleton — server-side only.
 *
 * Credentials come exclusively from environment variables.
 * They are NEVER hard-coded here.
 *
 * Required env vars (set in Vercel dashboard or .env.local):
 *   TWILIO_ACCOUNT_SID      – Account SID  (ACxxx…)
 *   TWILIO_AUTH_TOKEN       – Auth token
 *   TWILIO_FROM_NUMBER      – Twilio E.164 number used for SMS  (+12015550123)
 *   TWILIO_WHATSAPP_FROM    – WhatsApp sender  (whatsapp:+14155238886)
 *   NEXT_PUBLIC_APP_URL     – Public base URL for tracking links
 */

import twilio from "twilio";

// ── Singleton client ──────────────────────────────────────────────────────────

let _client: ReturnType<typeof twilio> | null = null;

export function getTwilioClient(): ReturnType<typeof twilio> | null {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    console.warn("[twilio] TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN não configurados — SMS/WhatsApp desactivado.");
    return null;
  }

  if (!_client) {
    _client = twilio(sid, token);
  }
  return _client;
}

// ── Sender addresses ──────────────────────────────────────────────────────────

/** E.164 number (or alphanumeric sender ID) used for outbound SMS */
export const FROM_SMS: string =
  process.env.TWILIO_FROM_NUMBER ?? "";

/** WhatsApp-prefixed sender for Twilio WhatsApp messages */
export const FROM_WHATSAPP: string =
  process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";

// ── Helpers ───────────────────────────────────────────────────────────────────

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://op1na1-next.vercel.app";

/**
 * Returns the citizen-facing confirmation message body.
 * Kept in one place so any copy change propagates to all channels.
 */
export function buildConfirmationMessage(ticketId: string): string {
  return (
    `OP1NA1: Pedido ${ticketId} recebido com sucesso! ✅\n` +
    `Acompanhe o estado em: ${APP_URL}/citizen-portal#consultar\n` +
    `Ou envie "${ticketId}" a qualquer momento para saber o estado.`
  );
}

/**
 * Sends a confirmation SMS to a citizen.
 * Silently skips if Twilio is not configured (DEMO / CI).
 */
export async function sendSmsConfirmation(
  to: string,
  ticketId: string
): Promise<void> {
  if (!FROM_SMS) {
    console.warn("[twilio] TWILIO_FROM_NUMBER não configurado — SMS ignorado.");
    return;
  }
  const client = getTwilioClient();
  if (!client) return;

  await client.messages.create({
    body: buildConfirmationMessage(ticketId),
    from: FROM_SMS,
    to,
  });
}

/**
 * Sends a WhatsApp confirmation to a citizen.
 * Silently skips if Twilio is not configured.
 */
export async function sendWhatsappConfirmation(
  to: string,
  ticketId: string
): Promise<void> {
  const client = getTwilioClient();
  if (!client) return;

  await client.messages.create({
    body: buildConfirmationMessage(ticketId),
    from: FROM_WHATSAPP,
    to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
  });
}
