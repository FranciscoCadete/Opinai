// WhatsApp Business Cloud API — proactive template messages
// Template must be pre-approved by Meta with name "op1na1_status_update"
// Category: UTILITY | Language: pt_PT
//
// Template body (register at business.facebook.com):
//   "Olá! O estado do seu pedido *{{1}}* foi actualizado para *{{2}}*. {{3}}"

interface WhatsAppTemplateMessage {
  to: string;          // E.164 format: +244XXXXXXXXX
  templateName: string;
  params: string[];    // ordered, match template placeholders
}

interface WhatsAppResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsAppTemplate(
  msg: WhatsAppTemplateMessage,
): Promise<WhatsAppResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn("[whatsapp] WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN not set — skipping");
    return { ok: false, error: "not_configured" };
  }

  const to = normalisePhone(msg.to);
  if (!to) {
    return { ok: false, error: "invalid_phone" };
  }

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: msg.templateName,
      language: { code: "pt_PT" },
      components: [
        {
          type: "body",
          parameters: msg.params.map(p => ({ type: "text", text: p.slice(0, 1024) })),
        },
      ],
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const data = await res.json() as { messages?: { id: string }[]; error?: { message: string } };

    if (!res.ok) {
      console.error("[whatsapp] API error", data.error);
      return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` };
    }

    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (e) {
    console.error("[whatsapp] network error", e);
    return { ok: false, error: String(e) };
  }
}

// Ensure phone is E.164. Angolan numbers: +244 followed by 9 digits.
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("244") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("9") && digits.length === 9) return `+244${digits}`;
  if (digits.length >= 10) return `+${digits}`;
  return null;
}
