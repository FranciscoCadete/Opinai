/**
 * telcosms.ts — Canal SMS via TelcoSMS (Angola, shortcode 45544).
 *
 * Arquitectura:
 *   Cidadão  ──SMS──▶  Shortcode 45544  ──▶  POST /api/sms/telcosms
 *               ◀──SMS──  TelcoSMS API  ◀──  sendSmsTelco()
 *
 * Fornecedor: TelcoSMS (INACOM autorizado, App OPINAI ID: 4144)
 *   Painel:   https://telcosms.co.ao/aplicacoes/4144
 *   Suporte:  suporte@telcosms.co.ao  |  +244 940 620 227
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * API REST (v1)
 * ─────────────────────────────────────────────────────────────────────────────
 *   POST https://www.telcosms.co.ao/send_message
 *   Body JSON: { message: { api_key_app, phone_number, message_body } }
 *   Resposta de sucesso: { status: "200 - Mensagem enviada com sucesso", mensagem: {...} }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * VARIÁVEIS DE AMBIENTE  (Vercel → Environment Variables)
 * ─────────────────────────────────────────────────────────────────────────────
 *   TELCO_API_KEY   — api_key_app da aplicação OPINAI (começa com "prd...")
 *   TELCO_APP_ID    — ID da aplicação: 4144
 *   TELCO_SANDBOX   — "true" para simular sem enviar (logs extra)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURAR WEBHOOK INBOUND no painel TelcoSMS
 * ─────────────────────────────────────────────────────────────────────────────
 *   https://telcosms.co.ao/aplicacoes/4144
 *   → Callback URL: https://op1na1-next.vercel.app/api/sms/telcosms
 *   → Método: POST
 */

import { INST_NUMBER_DISPLAY, APP_URL } from "@/lib/contact";

const SEND_URL = "https://www.telcosms.co.ao/send_message";
const SANDBOX  = process.env.TELCO_SANDBOX === "true";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TelcoSmsResult {
  ok:         boolean;
  messageId?: string;
  error?:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Send SMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envia um SMS via API REST TelcoSMS.
 *
 * @param to      Destinatário: "940991740" ou "+244940991740"
 * @param message Texto (max ~160 chars para segmento único)
 */
export async function sendSmsTelco(
  to:      string,
  message: string,
): Promise<TelcoSmsResult> {
  const apiKey = process.env.TELCO_API_KEY;

  if (!apiKey) {
    const err = "[telcosms] TELCO_API_KEY não configurado.";
    console.error(err);
    return { ok: false, error: err };
  }

  // Normalizar: remover +244 / 244 — TelcoSMS aceita número local (9xxxxxxxx)
  const phone = to.replace(/^\+244/, "").replace(/^244/, "");

  if (SANDBOX) {
    console.log(`[telcosms][SANDBOX] Simulando envio para ${phone}: ${message}`);
    return { ok: true, messageId: "sandbox" };
  }

  try {
    const res = await fetch(SEND_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          api_key_app:  apiKey,
          phone_number: phone,
          message_body: message,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const data = await res.json() as { status?: string; mensagem?: unknown };

    if (res.ok && typeof data.status === "string" && data.status.startsWith("200")) {
      console.log(`[telcosms] SMS enviado para ${phone} — ${data.status}`);
      return { ok: true };
    }

    const errMsg = data.status ?? `http_${res.status}`;
    console.error(`[telcosms] Falha ao enviar para ${phone}:`, errMsg);
    return { ok: false, error: errMsg };

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[telcosms] Erro de rede:", msg);
    return { ok: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Message templates
// ─────────────────────────────────────────────────────────────────────────────

/** Confirmação após criação de pedido (≤160 chars para segmento único) */
export function buildTelcoConfirmationSms(ticketId: string): string {
  return (
    `OP1NA1 - Mulenvos\n` +
    `Pedido ${ticketId} recebido!\n` +
    `Ver estado: ${APP_URL}/citizen-portal#consultar\n` +
    `Envie "${ticketId}" p/acompanhar.\n` +
    `Tel: ${INST_NUMBER_DISPLAY}`
  );
}

/** Estado do pedido enviado quando cidadão consulta ticket existente */
export function buildTelcoStatusSms(
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

// ─────────────────────────────────────────────────────────────────────────────
// Fire-and-forget wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envia confirmação de forma assíncrona.
 * Nunca lança excepção — falha de SMS não bloqueia criação do pedido.
 */
export async function notifyTelco(
  to:       string | undefined,
  ticketId: string,
): Promise<void> {
  if (!to) return;
  try {
    const result = await sendSmsTelco(to, buildTelcoConfirmationSms(ticketId));
    if (!result.ok) {
      console.warn("[telcosms] Envio falhou (não fatal):", result.error);
    }
  } catch (e) {
    console.warn("[telcosms] Erro inesperado (não fatal):", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Health check helper
// ─────────────────────────────────────────────────────────────────────────────

export function getTelcoStatus() {
  const apiKey = process.env.TELCO_API_KEY;
  return {
    configured: !!apiKey,
    sandbox:    SANDBOX,
    shortcode:  "45544",
    appId:      process.env.TELCO_APP_ID ?? "4144",
    mechanism:  "rest-api",
  };
}
