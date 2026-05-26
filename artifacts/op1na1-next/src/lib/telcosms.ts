/**
 * telcosms.ts — Canal SMS via TelcoSMS (Angola, shortcode 45544).
 *
 * Arquitectura:
 *   Cidadão  ──SMS──▶  Shortcode 45544  ──▶  POST /api/sms/telcosms
 *               ◀──SMS──  TelcoSMS web   ◀──  sendSmsTelco()
 *
 * Fornecedor: TelcoSMS (INACOM autorizado, App OPINAI ID: 4144)
 *   Painel:   https://telcosms.co.ao/aplicacoes/4144
 *   Suporte:  suporte@telcosms.co.ao  |  +244 940 620 227
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MECANISMO DE ENVIO
 * ─────────────────────────────────────────────────────────────────────────────
 * A TelcoSMS não expõe API REST pública com chave. O envio é feito via
 * sessão web autenticada em 3 passos por cada SMS:
 *   1. GET  /usuarios/sign_in      → extrai CSRF de login
 *   2. POST /usuarios/sign_in      → autentica, obtém cookie de sessão
 *   3. POST /mensagens             → envia SMS com cookie + CSRF da sessão
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * VARIÁVEIS DE AMBIENTE  (Vercel → Environment Variables)
 * ─────────────────────────────────────────────────────────────────────────────
 *   TELCO_LOGIN     — Telemóvel de login: 940991740
 *   TELCO_PASSWORD  — Password da conta TelcoSMS
 *   TELCO_APP_ID    — ID da aplicação OPINAI: 4144
 *   TELCO_SANDBOX   — "true" para logs extra sem envio real
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURAR WEBHOOK INBOUND no painel TelcoSMS
 * ─────────────────────────────────────────────────────────────────────────────
 *   https://telcosms.co.ao/aplicacoes/4144
 *   → Callback URL: https://op1na1-next.vercel.app/api/sms/telcosms
 *   → Método: POST
 */

import { INST_NUMBER_DISPLAY, APP_URL } from "@/lib/contact";

const BASE    = "https://telcosms.co.ao";
const SANDBOX = process.env.TELCO_SANDBOX === "true";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TelcoSmsResult {
  ok:         boolean;
  messageId?: string;
  error?:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extrai o CSRF token do meta tag csrf-token de uma página HTML. */
function extractMetaCsrf(html: string): string {
  return html.match(/csrf-token" content="([^"]+)"/)?.[1] ?? "";
}

/** Extrai o CSRF do input hidden de um form HTML (usa o token mais longo = mais recente). */
function extractFormCsrf(html: string): string {
  const all = [...html.matchAll(/name="authenticity_token" value="([^"]{40,})"/g)];
  // O último token é o do formulário de nova mensagem
  return all[all.length - 1]?.[1] ?? "";
}

/** Extrai cookies Set-Cookie relevantes da resposta fetch. */
function extractCookies(res: Response): string {
  const raw = res.headers.getSetCookie?.() ?? [];
  return raw
    .map(c => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

/**
 * Autentica na conta TelcoSMS e devolve cookie de sessão + CSRF da página mensagens.
 * Flow: GET sign_in → POST sign_in → GET mensagens → { cookie, csrf }
 */
async function loginAndGetCsrf(): Promise<{ cookie: string; csrf: string }> {
  const login    = process.env.TELCO_LOGIN;
  const password = process.env.TELCO_PASSWORD;

  if (!login || !password) {
    throw new Error("[telcosms] TELCO_LOGIN ou TELCO_PASSWORD não configurados.");
  }

  // ── Passo 1: GET /usuarios/sign_in — obter CSRF de login ─────────────────
  const loginPage = await fetch(`${BASE}/usuarios/sign_in`, {
    signal: AbortSignal.timeout(10_000),
  });
  const loginHtml  = await loginPage.text();
  const loginCsrf  = extractMetaCsrf(loginHtml);
  const loginCookies = extractCookies(loginPage);

  if (!loginCsrf) {
    throw new Error("[telcosms] Não foi possível obter o CSRF token da página de login.");
  }

  // ── Passo 2: POST /usuarios/sign_in — autenticar ─────────────────────────
  const body = new URLSearchParams({
    "authenticity_token":    loginCsrf,
    "usuario[login]":        login,
    "usuario[password]":     password,
  });

  const authRes = await fetch(`${BASE}/usuarios/sign_in`, {
    method:   "POST",
    headers:  {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie":       loginCookies,
    },
    body:     body.toString(),
    redirect: "manual",
    signal:   AbortSignal.timeout(10_000),
  });

  // Após login bem-sucedido Rails devolve 302 + Set-Cookie com a sessão
  if (authRes.status !== 302) {
    throw new Error(`[telcosms] Login falhou — HTTP ${authRes.status}`);
  }

  const sessionCookie = extractCookies(authRes);
  if (!sessionCookie.includes("_telcosms_session")) {
    throw new Error("[telcosms] Cookie de sessão não recebido — credenciais inválidas?");
  }

  // ── Passo 3: GET /mensagens — obter CSRF do formulário de envio ───────────
  const msgPage = await fetch(`${BASE}/mensagens`, {
    headers: { "Cookie": sessionCookie },
    signal:  AbortSignal.timeout(10_000),
  });
  const msgHtml = await msgPage.text();
  const formCsrf = extractFormCsrf(msgHtml);

  if (!formCsrf) {
    throw new Error("[telcosms] Não foi possível obter o CSRF token do formulário de mensagens.");
  }

  return { cookie: sessionCookie, csrf: formCsrf };
}

// ─────────────────────────────────────────────────────────────────────────────
// Send SMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envia um SMS via TelcoSMS usando sessão web autenticada.
 *
 * @param to      Destinatário em formato angolano: "940991740" ou "+244940991740"
 * @param message Texto (max ~160 chars para segmento único)
 */
export async function sendSmsTelco(
  to:      string,
  message: string,
): Promise<TelcoSmsResult> {
  const appId = process.env.TELCO_APP_ID ?? "4144";

  // Normalizar destinatário: remover +244 se presente (TelcoSMS usa formato local)
  const destinatario = to.replace(/^\+244/, "").replace(/^244/, "");

  if (SANDBOX) {
    console.log(`[telcosms][SANDBOX] Simulando envio para ${destinatario}: ${message}`);
    return { ok: true, messageId: "sandbox" };
  }

  try {
    const { cookie, csrf } = await loginAndGetCsrf();

    // ── Passo 4: POST /mensagens — enviar SMS ─────────────────────────────
    const formBody = new URLSearchParams({
      "authenticity_token":    csrf,
      "mensagem[aplicacao_id]": appId,
      "mensagem[destinatario]": destinatario,
      "mensagem[corpo_sms]":    message,
    });

    const sendRes = await fetch(`${BASE}/mensagens`, {
      method:  "POST",
      headers: {
        "Content-Type":   "application/x-www-form-urlencoded",
        "Cookie":         cookie,
        "Accept":         "text/html,application/xhtml+xml",
      },
      body:     formBody.toString(),
      redirect: "manual",
      signal:   AbortSignal.timeout(15_000),
    });

    // Sucesso: Rails redireciona para /mensagens/:id
    if (sendRes.status === 302) {
      const location = sendRes.headers.get("location") ?? "";
      // Extrai o ID da mensagem do redirect: /mensagens/4677163
      const msgId = location.match(/mensagens\/(\d+)/)?.[1] ?? "";
      console.log(`[telcosms] SMS enviado para ${destinatario} — ID: ${msgId || "desconhecido"}`);
      return { ok: true, messageId: msgId };
    }

    console.error("[telcosms] Resposta inesperada:", sendRes.status);
    return { ok: false, error: `http_${sendRes.status}` };

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[telcosms] Erro ao enviar SMS:", msg);
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
  const login    = process.env.TELCO_LOGIN;
  const password = process.env.TELCO_PASSWORD;
  return {
    configured: !!(login && password),
    sandbox:    SANDBOX,
    shortcode:  "45544",
    appId:      process.env.TELCO_APP_ID ?? "4144",
    mechanism:  "session-web",
  };
}
