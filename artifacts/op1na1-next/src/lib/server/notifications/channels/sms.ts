/**
 * Canal SMS — Africa's Talking (primário) com fallback para Twilio.
 *
 * Cadeia de envio:
 *   1. Africa's Talking  (AT_API_KEY + AT_USERNAME configurados)
 *   2. Twilio SMS        (TWILIO_ACCOUNT_SID + TWILIO_FROM_NUMBER configurados)
 *   3. Falha silenciosa  (regista warning, nunca lança excepção)
 */

import { sendSmsAT } from "@/lib/africastalking";

interface SmsResult {
  ok:       boolean;
  provider?: "africastalking" | "twilio";
  id?:      string;
  error?:   string;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  // ── 1. Africa's Talking ───────────────────────────────────────────────────
  const atKey      = process.env.AT_API_KEY;
  const atUsername = process.env.AT_USERNAME;

  if (atKey && atUsername) {
    const result = await sendSmsAT(to, body);
    if (result.ok) return { ok: true, provider: "africastalking", id: result.messageId };
    console.warn("[sms] Africa's Talking falhou, a tentar fallback Twilio:", result.error);
  }

  // ── 2. Twilio SMS (fallback) ──────────────────────────────────────────────
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("[sms] Nenhum provider SMS configurado — envio ignorado");
    return { ok: false, error: "not_configured" };
  }

  // SMS hard limit: 160 chars por segmento. Manter abaixo de 320 (2 segmentos).
  const truncated = body.length > 320 ? body.slice(0, 317) + "…" : body;

  const params = new URLSearchParams({
    To:   to,
    From: fromNumber,
    Body: truncated,
  });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    const data = await res.json() as { sid?: string; error_message?: string };

    if (!res.ok || data.error_message) {
      console.error("[sms] Twilio error", data.error_message);
      return { ok: false, error: data.error_message ?? `HTTP ${res.status}` };
    }

    return { ok: true, provider: "twilio", id: data.sid };
  } catch (e) {
    console.error("[sms] network error", e);
    return { ok: false, error: String(e) };
  }
}

// Plain-text version of a template body (strip markdown)
export function toPlainText(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/#+\s+/g, "")
    .trim();
}
