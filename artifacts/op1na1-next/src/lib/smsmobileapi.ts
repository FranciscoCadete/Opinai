/**
 * SMSMobileAPI — gateway SMS via dispositivo Android autenticado.
 *
 * Arquitectura:
 *   Cidadão  ──SMS──▶  SIM (958 746 812)  ──▶  App Android (SMSMobileAPI)
 *               ◀──SMS──  App Android        ◀──  POST /api/sms/smsmobile (webhook)
 *
 * Documentação: https://smsmobileapi.com
 *
 * Variáveis de ambiente necessárias (Vercel → Environment Variables):
 *   SMSMOBILE_API_KEY   – chave de autenticação (device-bound, única por conta)
 *   SMSMOBILE_GATEWAY   – URL base do endpoint (padrão: https://api.smsmobileapi.com)
 *
 * A API Key NÃO é armazenada em código — vem exclusivamente de env vars.
 */

import { INST_NUMBER_DISPLAY, APP_URL as CONTACT_APP_URL } from "@/lib/contact";

const GATEWAY =
  process.env.SMSMOBILE_GATEWAY ?? "https://api.smsmobileapi.com";

const APP_URL = CONTACT_APP_URL;

// ── Send SMS ──────────────────────────────────────────────────────────────────

export interface SmsSendResult {
  ok:      boolean;
  raw?:    unknown;
  error?:  string;
}

/**
 * Sends a single SMS via the SMSMobileAPI Android gateway.
 *
 * @param to      Recipient in E.164 format, e.g. +244958000001
 * @param message Text to send (max ~160 chars for a single SMS)
 */
export async function sendSmsMobile(
  to: string,
  message: string
): Promise<SmsSendResult> {
  const apiKey = process.env.SMSMOBILE_API_KEY;
  if (!apiKey) {
    console.warn("[smsmobileapi] SMSMOBILE_API_KEY não configurada — SMS ignorado.");
    return { ok: false, error: "api_key_missing" };
  }

  const params = new URLSearchParams({
    apikey:   apiKey,
    waphone:  to,
    message,
  });

  try {
    const res = await fetch(`${GATEWAY}/sendsms/?${params.toString()}`, {
      method:  "GET",
      headers: { "Accept": "application/json" },
      // 10 s timeout (Node 18+ fetch supports signal)
      signal: AbortSignal.timeout(10_000),
    });

    const raw = await res.json().catch(() => res.text());

    if (!res.ok) {
      console.error("[smsmobileapi] HTTP", res.status, raw);
      return { ok: false, error: `http_${res.status}`, raw };
    }

    // SMSMobileAPI returns { "status": "success" } or { "result": "OK" } variants
    const r = raw as Record<string, unknown>;
    const success =
      r["status"] === "success" ||
      r["result"] === "OK"      ||
      r["success"] === true;

    return { ok: success, raw };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[smsmobileapi] fetch error:", msg);
    return { ok: false, error: msg };
  }
}

// ── Message templates ─────────────────────────────────────────────────────────

/**
 * Mensagem de confirmação enviada ao cidadão após criação do pedido.
 * Texto único reutilizado em SMS e WhatsApp.
 */
export function buildConfirmationSms(ticketId: string): string {
  return (
    `OP1NA1 – Mulenvos\n` +
    `Pedido ${ticketId} recebido! ✅\n` +
    `Acompanhe em: ${APP_URL}/citizen-portal#consultar\n` +
    `Envie "${ticketId}" para saber o estado.\n` +
    `Contacto: ${INST_NUMBER_DISPLAY}`
  );
}

/**
 * Mensagem de estado enviada quando o cidadão consulta um ticket existente.
 */
export function buildStatusSms(ticketId: string, status: string, previsao = "48h"): string {
  const labels: Record<string, string> = {
    received:    "Recebido ⏳",
    in_progress: "Em análise 🔍",
    resolved:    "Resolvido ✅",
    closed:      "Encerrado 📁",
  };
  const label = labels[status] ?? status;
  return (
    `OP1NA1 – ${ticketId}\n` +
    `Estado: ${label}\n` +
    `Previsão: ${previsao}\n` +
    `Detalhes: ${APP_URL}/citizen-portal#consultar`
  );
}

// ── Convenience wrapper with fire-and-forget ──────────────────────────────────

/**
 * Envia confirmação SMS de forma assíncrona (não bloqueia a resposta HTTP).
 * Nunca lança excepção.
 */
export async function notifySmsMobile(
  to: string | undefined,
  ticketId: string
): Promise<void> {
  if (!to) return;
  try {
    const result = await sendSmsMobile(to, buildConfirmationSms(ticketId));
    if (!result.ok) {
      console.warn("[smsmobileapi] Envio falhou (não fatal):", result.error, result.raw);
    }
  } catch (e) {
    console.warn("[smsmobileapi] Erro inesperado (não fatal):", e);
  }
}
