/**
 * POST /api/sms/notify
 *
 * Envia confirmação de pedido ao cidadão após submissão.
 *
 * Cadeia de providers:
 *   sms       → Africa's Talking (primário, AT_API_KEY + AT_USERNAME)
 *               fallback → Twilio SMS (TWILIO_FROM_NUMBER)
 *   whatsapp  → Twilio WhatsApp (TWILIO_WHATSAPP_FROM)
 *
 * Body: { to: string; ticketId: string; channel?: "sms" | "whatsapp" }
 *
 * Chamado internamente pelo /api/requests.
 * Devolve 202 se o envio falhar — o pedido foi criado na mesma.
 */

import { NextRequest }                          from "next/server";
import { ok, err }                              from "@/lib/server/response";
import { sendSmsAT, buildAtConfirmationSms }    from "@/lib/africastalking";
import { sendSmsConfirmation, sendWhatsappConfirmation } from "@/lib/twilio";

interface NotifyBody {
  to:       string;
  ticketId: string;
  channel?: "sms" | "whatsapp";
}

export async function POST(req: NextRequest) {
  let body: NotifyBody;
  try {
    body = (await req.json()) as NotifyBody;
  } catch {
    return err("Corpo JSON inválido", 400);
  }

  const { to, ticketId, channel = "sms" } = body;

  if (!to || !ticketId) {
    return err("Campos obrigatórios: to, ticketId", 422);
  }

  if (!to.startsWith("+") && !to.startsWith("whatsapp:")) {
    return err("Número em formato E.164 (ex: +244958746812)", 422);
  }

  try {
    if (channel === "whatsapp") {
      // ── WhatsApp → Twilio ────────────────────────────────────────────────
      await sendWhatsappConfirmation(to, ticketId);
      return ok({ sent: true, provider: "twilio_whatsapp", channel, ticketId });
    }

    // ── SMS: Africa's Talking (primário) ─────────────────────────────────────
    if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
      const result = await sendSmsAT(to, buildAtConfirmationSms(ticketId));
      if (result.ok) {
        return ok({ sent: true, provider: "africastalking", channel, ticketId, messageId: result.messageId });
      }
      console.warn("[sms/notify] Africa's Talking falhou:", result.error);
    }

    // ── SMS: Twilio fallback ──────────────────────────────────────────────────
    await sendSmsConfirmation(to, ticketId);
    return ok({ sent: true, provider: "twilio_sms", channel, ticketId });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sms/notify]", msg);
    // 202 — pedido salvo, notificação falhou (não bloqueia)
    return ok({ sent: false, provider: "none", reason: msg }, 202);
  }
}
