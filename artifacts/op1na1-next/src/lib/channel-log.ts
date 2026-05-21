/**
 * channel-log.ts — Ring buffer de actividade dos canais OP1NA1
 *
 * Regista todos os eventos de entrada/saída em tempo real.
 * Tamanho máximo: 200 entradas (FIFO).
 *
 * Partilhado dentro do mesmo processo Node.js (serverless: por instância).
 * Para produção multi-instância: substituir o Map por Redis LPUSH/LTRIM.
 */

export type ChannelId = "sms" | "whatsapp" | "portal" | "messenger" | "ussd";
export type Direction = "in" | "out";
export type LogStatus = "ok" | "error" | "warn";

export interface ChannelLogEntry {
  /** Identificador único — timestamp + sequência */
  id:          string;
  /** ISO 8601 timestamp */
  ts:          string;
  channel:     ChannelId;
  direction:   Direction;
  status:      LogStatus;
  /** Número do ticket criado ou consultado (ex: "OP247") */
  ticketId?:   string;
  /** Últimos 4 dígitos do número do remetente — protecção de dados */
  phoneTail?:  string;
  /** Acção efectuada */
  action?:     string;
  /** Duração em milissegundos */
  durationMs:  number;
  /** Mensagem de erro, se aplicável */
  error?:      string;
}

// ── Store ─────────────────────────────────────────────────────────────────────

const MAX_ENTRIES = 200;
const _log: ChannelLogEntry[] = [];
let   _seq = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extrai os últimos 4 dígitos de um número de telefone */
export function maskPhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `•••${digits.slice(-4)}` : undefined;
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Regista um evento de canal no buffer circular.
 * Nunca lança excepção — falha silenciosa para não bloquear o fluxo principal.
 */
export function logChannelEvent(
  entry: Omit<ChannelLogEntry, "id" | "ts">,
): ChannelLogEntry {
  try {
    const e: ChannelLogEntry = {
      id: `${Date.now()}-${(++_seq).toString(36)}`,
      ts: new Date().toISOString(),
      ...entry,
    };
    _log.push(e);
    if (_log.length > MAX_ENTRIES) _log.shift();
    return e;
  } catch {
    // falha silenciosa
    return { id: "err", ts: new Date().toISOString(), channel: entry.channel, direction: entry.direction, status: "error", durationMs: 0 };
  }
}

/**
 * Devolve as últimas `limit` entradas, das mais recentes para as mais antigas.
 * Filtra por canal se fornecido.
 */
export function getChannelLog(
  limit = 50,
  channel?: ChannelId,
): ChannelLogEntry[] {
  const filtered = channel
    ? _log.filter(e => e.channel === channel)
    : [..._log];
  return filtered.slice(-limit).reverse();
}

export interface ChannelStats {
  ok:      number;
  error:   number;
  warn:    number;
  total:   number;
  lastTs:  string | null;
}

/**
 * Estatísticas agregadas por canal (últimas 200 entradas do buffer).
 */
export function getChannelStats(): Record<ChannelId, ChannelStats> {
  const base = (): ChannelStats => ({ ok: 0, error: 0, warn: 0, total: 0, lastTs: null });
  const stats: Record<ChannelId, ChannelStats> = {
    sms:       base(),
    whatsapp:  base(),
    portal:    base(),
    messenger: base(),
    ussd:      base(),
  };

  for (const e of _log) {
    const s = stats[e.channel];
    if (!s) continue;
    s.total++;
    if (e.status === "ok")    s.ok++;
    if (e.status === "error") s.error++;
    if (e.status === "warn")  s.warn++;
    if (!s.lastTs || e.ts > s.lastTs) s.lastTs = e.ts;
  }

  return stats;
}

/**
 * Limpa todo o log (útil em testes).
 */
export function clearChannelLog(): void {
  _log.splice(0);
  _seq = 0;
}
