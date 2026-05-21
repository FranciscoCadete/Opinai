/**
 * GET /api/admin/channels/health
 *
 * Testa os canais activos em tempo real e devolve o estado de cada um.
 * Cada verificação tem timeout de 5 s para não bloquear a resposta.
 *
 * Canais verificados:
 *   sms       → SMSMobileAPI /checksession (dispositivo Android)
 *   whatsapp  → Twilio Accounts API (credenciais + conta activa)
 *   portal    → Latência da própria base de dados (SELECT 1)
 *   messenger → Verificação passiva (sem API pública de saúde)
 *   ussd      → Não configurado — sempre "offline"
 *
 * Acesso: technician+  (ou DEMO_MODE aberto)
 */

import { NextResponse } from "next/server";
import { getChannelStats } from "@/lib/channel-log";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ChannelHealth {
  id:          string;
  name:        string;
  status:      "online" | "offline" | "degraded" | "unconfigured";
  latencyMs:   number | null;
  detail:      string;
  lastActivity: string | null;   // ISO timestamp do último evento no log
  eventsOk:    number;
  eventsErr:   number;
}

// ── Verificações reais ────────────────────────────────────────────────────────

async function checkSmsMobile(): Promise<Omit<ChannelHealth, "id" | "name" | "lastActivity" | "eventsOk" | "eventsErr">> {
  const apiKey  = process.env.SMSMOBILE_API_KEY;
  const gateway = process.env.SMSMOBILE_GATEWAY ?? "https://api.smsmobileapi.com";

  if (!apiKey) {
    return { status: "unconfigured", latencyMs: null, detail: "SMSMOBILE_API_KEY não configurada" };
  }

  const t0 = Date.now();
  try {
    const res = await fetch(
      `${gateway}/checksession/?apikey=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(5_000), headers: { Accept: "application/json" } },
    );
    const latencyMs = Date.now() - t0;
    const raw = await res.json().catch(() => ({})) as Record<string, unknown>;

    if (!res.ok) {
      return { status: "offline", latencyMs, detail: `HTTP ${res.status}` };
    }

    // SMSMobileAPI returns: { "status": "connected" } or { "device_status": "online" }
    const connected =
      raw["status"] === "connected" ||
      raw["device_status"] === "online" ||
      raw["result"] === "connected" ||
      raw["success"] === true;

    if (connected) {
      const device = String(raw["device_name"] ?? raw["device"] ?? "Dispositivo Android");
      return { status: "online", latencyMs, detail: `${device} · ${latencyMs} ms` };
    }

    return {
      status:    "degraded",
      latencyMs,
      detail:    `Resposta inesperada: ${JSON.stringify(raw).slice(0, 80)}`,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      status:    "offline",
      latencyMs: Date.now() - t0,
      detail:    msg.includes("abort") ? "Timeout (>5 s)" : msg,
    };
  }
}

async function checkTwilio(): Promise<Omit<ChannelHealth, "id" | "name" | "lastActivity" | "eventsOk" | "eventsErr">> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    return { status: "unconfigured", latencyMs: null, detail: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN não configurados" };
  }

  const t0 = Date.now();
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5_000),
      },
    );
    const latencyMs = Date.now() - t0;
    const raw = await res.json().catch(() => ({})) as Record<string, unknown>;

    if (!res.ok) {
      return { status: "offline", latencyMs, detail: `HTTP ${res.status} — ${raw["message"] ?? "Credenciais inválidas"}` };
    }

    const acctStatus = String(raw["status"] ?? "active");
    if (acctStatus === "active") {
      return { status: "online", latencyMs, detail: `Conta ${sid.slice(0, 8)}… activa · ${latencyMs} ms` };
    }
    return { status: "degraded", latencyMs, detail: `Conta em estado: ${acctStatus}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      status:    "offline",
      latencyMs: Date.now() - t0,
      detail:    msg.includes("abort") ? "Timeout (>5 s)" : msg,
    };
  }
}

async function checkDatabase(): Promise<Omit<ChannelHealth, "id" | "name" | "lastActivity" | "eventsOk" | "eventsErr">> {
  if (DEMO_MODE) {
    return { status: "online", latencyMs: 0, detail: "Modo demo — base de dados em memória" };
  }

  if (!process.env.DATABASE_URL) {
    return { status: "unconfigured", latencyMs: null, detail: "DATABASE_URL não configurada" };
  }

  const t0 = Date.now();
  try {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    const latencyMs = Date.now() - t0;
    return { status: "online", latencyMs, detail: `PostgreSQL · ${latencyMs} ms` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { status: "offline", latencyMs: Date.now() - t0, detail: msg.slice(0, 120) };
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET() {
  // Run all checks in parallel
  const [smsResult, waResult, dbResult] = await Promise.all([
    checkSmsMobile(),
    checkTwilio(),
    checkDatabase(),
  ]);

  const stats = getChannelStats();

  const channels: ChannelHealth[] = [
    {
      id:           "sms",
      name:         "SMS · SMSMobileAPI",
      ...smsResult,
      lastActivity: stats.sms.lastTs,
      eventsOk:     stats.sms.ok,
      eventsErr:    stats.sms.error,
    },
    {
      id:           "whatsapp",
      name:         "WhatsApp · Twilio Sandbox",
      ...waResult,
      lastActivity: stats.whatsapp.lastTs,
      eventsOk:     stats.whatsapp.ok,
      eventsErr:    stats.whatsapp.error,
    },
    {
      id:           "portal",
      name:         "Portal Web · Base de Dados",
      ...dbResult,
      lastActivity: stats.portal.lastTs,
      eventsOk:     stats.portal.ok,
      eventsErr:    stats.portal.error,
    },
    {
      id:           "messenger",
      name:         "Facebook Messenger",
      status:       "unconfigured",
      latencyMs:    null,
      detail:       "Página: facebook.com/luanda.municipiomulenvos — webhook não activo",
      lastActivity: stats.messenger.lastTs,
      eventsOk:     stats.messenger.ok,
      eventsErr:    stats.messenger.error,
    },
    {
      id:           "ussd",
      name:         "USSD *123#",
      status:       "unconfigured",
      latencyMs:    null,
      detail:       "Requer parceria com Unitel/Movicel — não configurado",
      lastActivity: stats.ussd.lastTs,
      eventsOk:     stats.ussd.ok,
      eventsErr:    stats.ussd.error,
    },
  ];

  return NextResponse.json({
    channels,
    checkedAt: new Date().toISOString(),
  });
}
