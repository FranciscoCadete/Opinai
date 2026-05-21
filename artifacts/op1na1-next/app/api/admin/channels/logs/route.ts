/**
 * GET /api/admin/channels/logs
 *
 * Devolve o log de actividade dos canais em tempo real.
 *
 * Query params:
 *   limit   — número máximo de entradas (padrão: 50, máx: 200)
 *   channel — filtrar por canal: sms | whatsapp | portal | messenger | ussd
 *
 * Acesso: technician+  (ou DEMO_MODE aberto)
 *
 * Nota: o log é mantido em memória (ring buffer de 200 entradas).
 * Numa instância serverless fria, o buffer começa vazio — é populado
 * conforme chegam webhooks em tempo real.
 */

import { NextRequest, NextResponse } from "next/server";
import { getChannelLog, getChannelStats, type ChannelId } from "@/lib/channel-log";

const VALID_CHANNELS = new Set<ChannelId>(["sms", "whatsapp", "portal", "messenger", "ussd"]);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const rawLimit   = Number(searchParams.get("limit") ?? 50);
  const limit      = Math.min(200, Math.max(1, isNaN(rawLimit) ? 50 : rawLimit));

  const rawChannel = searchParams.get("channel") ?? undefined;
  const channel    = rawChannel && VALID_CHANNELS.has(rawChannel as ChannelId)
    ? (rawChannel as ChannelId)
    : undefined;

  const entries = getChannelLog(limit, channel);
  const stats   = getChannelStats();

  return NextResponse.json({
    entries,
    stats,
    total:     entries.length,
    channel:   channel ?? "all",
    limit,
    fetchedAt: new Date().toISOString(),
  });
}
