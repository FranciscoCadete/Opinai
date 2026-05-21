/**
 * POST /api/sms/notify
 *
 * Envia confirmação de pedido ao cidadão após submissão.
 * Suporta dois canais:
 *
 *   sms       → SMSMobileAPI (primário, via dispositivo Android + SIM angolano)
 *               fallback automático para Twilio SMS se SMSMobileAPI não estiver configurado
 *   whatsapp  → Twilio WhatsApp
 *
 * Body: { to: string; ticketId: string; channel?: "sms" | "whatsapp" }
 *
 * Chamado internamente pelo /api/requests.
 * Devolve 202 se o envio falhar — o pedido foi criado na mesma.
 */

import { NextRequest } from "next/server";
import { ok, err }     from "@/lib/server/response";
import { notifySmsMobile }         from "@/lib/smsmobileapi";
import {
  sendSmsConfirmation,
  sendWhatsappConfirmation,
} from "@/lib/twilio";

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

  // Formato E.164 obrigatório
  if (!to.startsWith("+") && !to.startsWith("whatsapp:")) {
    return err(
      "Número em formato E.164 (ex: +244958746812)",
      422
    );
  }

  try {
    if (channel === "whatsapp") {
      // ── WhatsApp → Twilio (única opção actual) ────────────────────────────
      await sendWhatsappConfirmation(to, ticketId);
      return ok({ sent: true, provider: "twilio_whatsapp", channel, ticketId });

    } else {
      // ── SMS → SMSMobileAPI (primário) com fallback para Twilio ────────────
      const smsMobileKey = process.env.SMSMOBILE_API_KEY;

      if (smsMobileKey) {
        await notifySmsMobile(to, ticketId);
        return ok({ sent: true, provider: "smsmobileapi", channel, ticketId });
      }

      // Fallback: Twilio SMS (se TWILIO_FROM_NUMBER configurado)
      await sendSmsConfirmation(to, ticketId);
      return ok({ sent: true, provider: "twilio_sms", channel, ticketId });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sms/notify]", msg);
    // 202 → pedido salvo, mas notificação falhou
    return ok({ sent: false, provider: "none", reason: msg }, 202);
  }
}
