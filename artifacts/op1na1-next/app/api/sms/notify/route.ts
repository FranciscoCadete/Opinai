/**
 * POST /api/sms/notify
 *
 * Send a confirmation message to a citizen after their request is created.
 * Supports SMS and WhatsApp channels.
 *
 * Body: { to: string; ticketId: string; channel?: "sms" | "whatsapp" }
 *
 * Called internally (from /api/requests or from CitizenPortal form submit).
 * Not publicly documented — guarded by an internal secret if needed.
 */

import { NextRequest } from "next/server";
import { ok, err } from "@/lib/server/response";
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

  // Basic E.164 guard — must start with +
  if (!to.startsWith("+") && !to.startsWith("whatsapp:")) {
    return err(
      "Número de telefone deve estar em formato E.164 (ex: +244958746812)",
      422
    );
  }

  try {
    if (channel === "whatsapp") {
      await sendWhatsappConfirmation(to, ticketId);
    } else {
      await sendSmsConfirmation(to, ticketId);
    }

    return ok({ sent: true, channel, ticketId }, 200);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sms/notify]", msg);
    // Return 202 — the request was saved even if SMS failed
    return ok({ sent: false, reason: msg }, 202);
  }
}
