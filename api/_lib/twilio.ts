import crypto from "node:crypto";
import type { VercelRequest } from "@vercel/node";

/**
 * Verifica a assinatura X-Twilio-Signature.
 * Ver: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * Algoritmo:
 *   sig = base64( HMAC_SHA1( authToken, fullUrl + sortedFormParamsConcatenated ) )
 *
 * Para Vercel, fullUrl = `https://${host}${req.url}`. O Twilio envia o webhook
 * a uma URL pública conhecida (a configurada no console). Em ambientes com
 * proxy, considerar req.headers["x-forwarded-proto"] e ["x-forwarded-host"].
 */
export function verifyTwilioSignature(
  req: VercelRequest,
  authToken: string,
  fullUrl: string,
): boolean {
  const header = req.headers["x-twilio-signature"];
  if (typeof header !== "string") return false;

  const body = (req.body ?? {}) as Record<string, unknown>;
  const params = Object.keys(body)
    .sort()
    .map((k) => k + String(body[k]))
    .join("");
  const data = fullUrl + params;

  const expected = crypto
    .createHmac("sha1", authToken)
    .update(data, "utf8")
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(header, "base64"),
      Buffer.from(expected, "base64"),
    );
  } catch {
    return false;
  }
}

export function buildPublicUrl(req: VercelRequest): string {
  const proto =
    (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() ??
    "https";
  const host =
    (req.headers["x-forwarded-host"] as string) ??
    (req.headers.host as string) ??
    "";
  const path = req.url ?? "/";
  return `${proto}://${host}${path}`;
}

export type TwilioInboundSms = {
  messageSid: string;
  from: string;
  body: string;
  numMedia: number;
};

export function parseTwilioInboundSms(
  body: Record<string, unknown> | undefined,
): TwilioInboundSms | null {
  if (!body || typeof body !== "object") return null;
  const messageSid = body.MessageSid;
  const from = body.From;
  const text = body.Body;
  if (typeof messageSid !== "string" || typeof from !== "string") return null;
  return {
    messageSid,
    from,
    body: typeof text === "string" ? text : "",
    numMedia: Number(body.NumMedia ?? 0) || 0,
  };
}

/**
 * Envia SMS via Twilio REST API.
 */
export async function sendTwilioSms(
  to: string,
  body: string,
): Promise<{ messageSid: string | null; raw: unknown }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    throw new Error(
      "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER must be set",
    );
  }

  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: body.slice(0, 1600),
  });

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );
  const json = (await res.json().catch(() => ({}))) as {
    sid?: string;
    error_message?: string;
  };
  if (!res.ok) {
    throw new Error(
      `Twilio send failed (${res.status}): ${json.error_message ?? JSON.stringify(json)}`,
    );
  }
  return { messageSid: json.sid ?? null, raw: json };
}

/**
 * Resposta TwiML vazia (200 OK com XML mínimo). Usar quando enviamos
 * a resposta via REST API e queremos ACK rápido.
 */
export function emptyTwiml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Response/>';
}

/**
 * Resposta TwiML com mensagem inline. Alternativa a chamar a REST API
 * — Twilio envia a SMS por nós a partir desta resposta.
 */
export function twimlMessage(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped.slice(0, 1600)}</Message></Response>`;
}
