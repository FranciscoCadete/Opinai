/**
 * africastalking.ts — Canal 1: SMS via Africa's Talking.
 *
 * Arquitectura:
 *   Cidadão  ──SMS──▶  Shortcode AT (Angola)  ──▶  POST /api/sms/africastalking
 *               ◀──SMS──  Africa's Talking API  ◀──  sendSmsAT()
 *
 * Documentação: https://developers.africastalking.com/docs/sms
 *
 * Variáveis de ambiente (Vercel → Environment Variables):
 *   AT_API_KEY    — chave de API (Settings → API Key no dashboard AT)
 *   AT_USERNAME   — username da aplicação (ex: "op1na1"; "sandbox" para testes)
 *   AT_SENDER_ID  — shortcode ou alfanumérico registado (opcional; omitir → default)
 *   AT_SANDBOX    — "true" para usar o endpoint sandbox
 *
 * Endpoint de envio:
 *   Produção:  https://api.africastalking.com/version1/messaging
 *   Sandbox:   https://api.sandbox.africastalking.com/version1/messaging
 *
 * Autenticação: header  apiKey: <AT_API_KEY>
 * Corpo: application/x-www-form-urlencoded
 * Resposta: JSON  { SMSMessageData: { Message, Recipients: [{ statusCode, status, cost, messageId }] } }
 * statusCode 101 = Success
 */

import { INST_NUMBER_DISPLAY, APP_URL } from "@/lib/contact";

const SANDBOX  = process.env.AT_SANDBOX === "true";
const BASE_URL = SANDBOX
  ? "https://api.sandbox.africastalking.com/version1/messaging"
  : "https://api.africastalking.com/version1/messaging";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AtSmsResult {
  ok:         boolean;
  messageId?: string;
  cost?:      string;
  error?:     string;
  raw?:       unknown;
}

interface AtRecipient {
  statusCode?: number;
  number?:     string;
  status?:     string;
  cost?:       string;
  messageId?:  string;
}

interface AtResponse {
  SMSMessageData?: {
    Message?:     string;
    Recipients?:  AtRecipient[];
  };
}

// ── Send SMS ──────────────────────────────────────────────────────────────────

/**
 * Envia um SMS via Africa's Talking.
 *
 * @param to      Destinatário em formato E.164, ex: +244958000001
 *                (aceita múltiplos separados por vírgula)
 * @param message Texto (máx ~160 chars para segmento único)
 */
export async function sendSmsAT(
  to:      string,
  message: string,
): Promise<AtSmsResult> {
  const apiKey   = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;

  if (!apiKey || !username) {
    console.warn("[africastalking] AT_API_KEY ou AT_USERNAME não configurados — SMS ignorado.");
    return { ok: false, error: "not_configured" };
  }

  const from = process.env.AT_SENDER_ID;

  const params = new URLSearchParams({ username, to, message });
  if (from) params.set("from", from);

  try {
    const res = await fetch(BASE_URL, {
      method:  "POST",
      headers: {
        "apiKey":        apiKey,           // AT usa este header não-standard
        "Content-Type":  "application/x-www-form-urlencoded",
        "Accept":        "application/json",
      },
      body:   params.toString(),
      signal: AbortSignal.timeout(15_000),
    });

    const raw = await res.json().catch(() => res.text()) as AtResponse;

    if (!res.ok) {
      console.error("[africastalking] HTTP", res.status, raw);
      return { ok: false, error: `http_${res.status}`, raw };
    }

    const recipient = raw?.SMSMessageData?.Recipients?.[0];
    const success   =
      recipient?.statusCode === 101 ||
      recipient?.status === "Success";

    return {
      ok:        success ?? false,
      messageId: recipient?.messageId,
      cost:      recipient?.cost,
      raw,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[africastalking] fetch error:", msg);
    return { ok: false, error: msg };
  }
}

// ── Message templates ─────────────────────────────────────────────────────────

/**
 * Confirmação enviada ao cidadão após criação do pedido.
 * Mantém-se abaixo de 160 chars para evitar segmentação.
 */
export function buildAtConfirmationSms(ticketId: string): string {
  return (
    `OP1NA1-Mulenvos\n` +
    `Pedido ${ticketId} recebido!\n` +
    `Ver estado: ${APP_URL}/citizen-portal#consultar\n` +
    `Envie "${ticketId}" p/acompanhar.\n` +
    `Tel: ${INST_NUMBER_DISPLAY}`
  );
}

/**
 * Estado do pedido enviado quando cidadão consulta ticket existente.
 */
export function buildAtStatusSms(
  ticketId: string,
  status:   string,
  previsao  = "48h",
): string {
  const labels: Record<string, string> = {
    received:    "Recebido",
    in_progress: "Em analise",
    resolved:    "Resolvido",
    closed:      "Encerrado",
  };
  const label = labels[status] ?? status;
  return (
    `OP1NA1 - ${ticketId}\n` +
    `Estado: ${label}\n` +
    `Previsao: ${previsao}\n` +
    `${APP_URL}/citizen-portal#consultar`
  );
}

// ── Fire-and-forget wrapper ───────────────────────────────────────────────────

/**
 * Envia confirmação de forma assíncrona.
 * Nunca lança excepção — falha de SMS não bloqueia criação do pedido.
 */
export async function notifyAT(
  to:       string | undefined,
  ticketId: string,
): Promise<void> {
  if (!to) return;
  try {
    const result = await sendSmsAT(to, buildAtConfirmationSms(ticketId));
    if (!result.ok) {
      console.warn("[africastalking] Envio falhou (não fatal):", result.error, result.raw);
    }
  } catch (e) {
    console.warn("[africastalking] Erro inesperado (não fatal):", e);
  }
}

// ── Webhook signature verification (opcional) ─────────────────────────────────

/**
 * Verifica assinatura HMAC-SHA256 enviada por Africa's Talking no header
 * X-AT-Signature.  Chamar apenas se AT_API_KEY estiver configurado.
 *
 * @param rawBody   Body cru da request (Buffer ou string)
 * @param signature Valor do header X-AT-Signature
 * @param apiKey    AT_API_KEY
 */
export async function verifyAtSignature(
  rawBody:   string,
  signature: string,
  apiKey:    string,
): Promise<boolean> {
  try {
    const enc     = new TextEncoder();
    const keyData = enc.encode(apiKey);
    const msgData = enc.encode(rawBody);

    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
    );

    const sigBytes = Uint8Array.from(
      atob(signature), c => c.charCodeAt(0),
    );

    return await crypto.subtle.verify("HMAC", cryptoKey, sigBytes, msgData);
  } catch {
    return false;
  }
}
