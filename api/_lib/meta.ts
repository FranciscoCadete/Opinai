import crypto from "node:crypto";
import type { VercelRequest } from "@vercel/node";

const GRAPH_VERSION = "v21.0";

/**
 * Verifica a assinatura X-Hub-Signature-256 que a Meta envia em todos os webhooks.
 * Devolve true se válida, false se inválida.
 *
 * IMPORTANTE: Vercel parses application/json automaticamente, mas para HMAC
 * precisamos do raw body. Usamos req.rawBody quando disponível, senão JSON.stringify
 * (ordem das chaves pode divergir, por isso preferir rawBody).
 */
export function verifyMetaSignature(
  req: VercelRequest,
  appSecret: string,
): boolean {
  const header = req.headers["x-hub-signature-256"];
  if (typeof header !== "string" || !header.startsWith("sha256=")) return false;
  const sig = header.slice(7);

  const raw = (req as VercelRequest & { rawBody?: string | Buffer }).rawBody;
  let body: string;
  if (typeof raw === "string") {
    body = raw;
  } else if (Buffer.isBuffer(raw)) {
    body = raw.toString("utf8");
  } else {
    body = JSON.stringify(req.body ?? {});
  }

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(body, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Verificação de subscrição (GET handshake) usado por WA e Messenger.
 */
export function handleVerifyHandshake(
  req: VercelRequest,
  expectedToken: string,
):
  | { ok: true; challenge: string }
  | { ok: false; status: number; error: string } {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode !== "subscribe") {
    return { ok: false, status: 400, error: "Invalid hub.mode" };
  }
  if (token !== expectedToken) {
    return { ok: false, status: 403, error: "Invalid verify token" };
  }
  if (typeof challenge !== "string") {
    return { ok: false, status: 400, error: "Missing challenge" };
  }
  return { ok: true, challenge };
}

// ─── Outbound: WhatsApp Cloud API ────────────────────────────────────────

export async function sendWhatsAppText(
  to: string,
  text: string,
): Promise<{ messageId: string | null; raw: unknown }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be set",
    );
  }
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text.slice(0, 4096) },
      }),
    },
  );
  const json = (await res.json().catch(() => ({}))) as {
    messages?: { id: string }[];
    error?: unknown;
  };
  if (!res.ok) {
    throw new Error(`WhatsApp send failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return { messageId: json.messages?.[0]?.id ?? null, raw: json };
}

// ─── Outbound: Messenger ─────────────────────────────────────────────────

export async function sendMessengerText(
  recipientId: string,
  text: string,
): Promise<{ messageId: string | null; raw: unknown }> {
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MESSENGER_PAGE_ACCESS_TOKEN must be set");
  }
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/me/messages?access_token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        messaging_type: "RESPONSE",
        message: { text: text.slice(0, 2000) },
      }),
    },
  );
  const json = (await res.json().catch(() => ({}))) as {
    message_id?: string;
    error?: unknown;
  };
  if (!res.ok) {
    throw new Error(`Messenger send failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return { messageId: json.message_id ?? null, raw: json };
}

// ─── Tipos do payload do webhook (subset que usamos) ─────────────────────

export type WhatsAppWebhookEntry = {
  id: string;
  changes?: {
    field?: string;
    value?: {
      messaging_product?: string;
      metadata?: { phone_number_id?: string };
      contacts?: { profile?: { name?: string }; wa_id: string }[];
      messages?: {
        id: string;
        from: string;
        timestamp: string;
        type: string;
        text?: { body: string };
      }[];
      statuses?: unknown[];
    };
  }[];
};

export type MessengerWebhookEntry = {
  id: string;
  time?: number;
  messaging?: {
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: { mid: string; text?: string };
    postback?: { mid?: string; payload: string; title?: string };
  }[];
};
