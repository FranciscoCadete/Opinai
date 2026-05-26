/**
 * telcosms.ts — Canal SMS via TelcoSMS (Angola, shortcode 45544).
 *
 * Arquitectura:
 *   Cidadão  ──SMS──▶  Shortcode 45544  ──▶  POST /api/sms/telcosms
 *               ◀──SMS──  TelcoSMS API   ◀──  sendSmsTelco()
 *
 * Fornecedor: TelcoSMS (INACOM authorizado)
 *   Suporte:  suporte@telcosms.co.ao  |  +244 940 620 227
 *   Painel:   https://telcosms.co.ao/aplicacoes/4144
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * VARIÁVEIS DE AMBIENTE  (Vercel → Environment Variables)
 * ─────────────────────────────────────────────────────────────────────────────
 *   TELCO_API_URL      — Endpoint de envio fornecido pelo suporte TelcoSMS
 *                        (ex.: https://sms.telcosms.co.ao/api/v1/sms)
 *                        ⚠️  Confirmar com suporte@telcosms.co.ao
 *   TELCO_API_KEY      — Chave PRD:  prdf7739ac426b9ccd912c3882c68
 *                        (em QAS usar: qasfb62e7e9257bbe97cd82e20a48)
 *   TELCO_APP_ID       — ID da aplicação OPINAI: 4144
 *   TELCO_SHORTCODE    — Shortcode de envio: 45544
 *   TELCO_SANDBOX      — "true" para usar chave QAS e activar logs extra
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Configurar webhook inbound no painel TelcoSMS:
 *   Callback URL:  https://op1na1-next.vercel.app/api/sms/telcosms
 *   Método:        POST
 *   Formato:       application/x-www-form-urlencoded  ou  application/json
 */

import { INST_NUMBER_DISPLAY, APP_URL } from "@/lib/contact";

const SANDBOX = process.env.TELCO_SANDBOX === "true";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TelcoSmsResult {
  ok:        boolean;
  messageId?: string;
  cost?:     string;
  error?:    string;
  raw?:      unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Send SMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envia um SMS via TelcoSMS (shortcode 45544).
 *
 * O endpoint exacto deve ser confirmado com suporte@telcosms.co.ao.
 * Enquanto não for confirmado, definir TELCO_API_URL na Vercel dashboard.
 *
 * @param to      Destinatário E.164, ex: +244958000001
 * @param message Texto (max ~160 chars)
 */
export async function sendSmsTelco(
  to:      string,
  message: string,
): Promise<TelcoSmsResult> {
  const apiKey    = process.env.TELCO_API_KEY;
  const apiUrl    = process.env.TELCO_API_URL;
  const appId     = process.env.TELCO_APP_ID     ?? "4144";
  const shortcode = process.env.TELCO_SHORTCODE  ?? "45544";

  if (!apiKey) {
    console.warn("[telcosms] TELCO_API_KEY não configurada — SMS ignorado.");
    return { ok: false, error: "api_key_missing" };
  }

  if (!apiUrl) {
    console.warn("[telcosms] TELCO_API_URL não configurada — SMS ignorado.");
    console.warn("[telcosms] Contacte suporte@telcosms.co.ao para obter o endpoint.");
    return { ok: false, error: "api_url_missing" };
  }

  if (SANDBOX) {
    console.log(`[telcosms][SANDBOX] Simulando envio para ${to}: ${message}`);
  }

  const body: Record<string, string | number> = {
    to,
    message,
    from:   shortcode,
    app_id: appId,
  };

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
        "Accept":        "application/json",
      },
      body:   JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    const raw = await res.json().catch(() => res.text()) as Record<string, unknown>;

    if (!res.ok) {
      console.error("[telcosms] HTTP", res.status, raw);
      return { ok: false, error: `http_${res.status}`, raw };
    }

    // Accept common success patterns from SMS providers
    const success =
      raw?.["success"]    === true  ||
      raw?.["status"]     === "success" ||
      raw?.["status"]     === "OK"      ||
      raw?.["result"]     === "OK"      ||
      raw?.["statusCode"] === 200       ||
      (typeof raw?.["id"] === "string" && raw["id"].length > 0);

    return {
      ok:        success,
      messageId: (raw?.["id"] ?? raw?.["messageId"] ?? raw?.["message_id"] ?? "") as string,
      cost:      (raw?.["cost"] ?? "") as string,
      raw,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[telcosms] fetch error:", msg);
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
      console.warn("[telcosms] Envio falhou (não fatal):", result.error, result.raw);
    }
  } catch (e) {
    console.warn("[telcosms] Erro inesperado (não fatal):", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Health check helper
// ─────────────────────────────────────────────────────────────────────────────

export function getTelcoStatus() {
  return {
    configured: !!(process.env.TELCO_API_KEY && process.env.TELCO_API_URL),
    sandbox:    SANDBOX,
    shortcode:  process.env.TELCO_SHORTCODE ?? "45544",
    appId:      process.env.TELCO_APP_ID    ?? "4144",
    apiUrl:     process.env.TELCO_API_URL   ?? "(não configurado — contactar suporte@telcosms.co.ao)",
  };
}
