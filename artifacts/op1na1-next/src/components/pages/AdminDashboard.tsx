"use client";
// Navigation adaptation applied:
//   - removed: import { useLocation } from "wouter"
//   + added:   import { useRouter } from "next/navigation"
//   - removed: const [, navigate] = useLocation()
//   + added:   const router = useRouter()
//   - changed: navigate("/login") → router.push("/login")

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  listAdminRequests,
  type AdminRequestRow,
} from "@/lib/api";
import { useRealtimeEvents } from "@/lib/useRealtimeEvents";
import { useTranslation } from "react-i18next";

// ─── Design tokens (scoped to this page) ────────────────────────
const T = {
  bg:      "#0b0f14",
  surface: "#111720",
  srf2:    "#161e2a",
  srf3:    "#1c2739",
  bdr:     "rgba(255,255,255,0.07)",
  bdr2:    "rgba(255,255,255,0.12)",
  accent:  "#00c49a",
  accent2: "#4fa3f7",
  warn:    "#f7b84f",
  danger:  "#f76f6f",
  text:    "#e8edf4",
  muted:   "#6b7d96",
  muted2:  "#4a5668",
  mono:    "'DM Mono', monospace",
  sans:    "'DM Sans', sans-serif",
  display: "'Fraunces', serif",
} as const;

// ─── Data ───────────────────────────────────────────────────────
const BAIRROS = [
  { name: "Caop C",            val: 92, estrato: "C" },
  { name: "Capalanga",         val: 87, estrato: "C" },
  { name: "Caop A",            val: 76, estrato: "C" },
  { name: "Caop B",            val: 71, estrato: "C" },
  { name: "Baixa de Cassanje", val: 65, estrato: "B" },
  { name: "KM 14-B",           val: 58, estrato: "B" },
  { name: "Boa-Fé",            val: 54, estrato: "B" },
  { name: "Mulenvos de Cima",  val: 48, estrato: "B" },
  { name: "KM 12-B",           val: 38, estrato: "A" },
  { name: "KM 9-B",            val: 31, estrato: "A" },
];
const BAR_MAX = 92;

const BAIRRO_RES = [
  { name: "KM 9-B",            val: 91, estrato: "A" },
  { name: "KM 12-B",           val: 87, estrato: "A" },
  { name: "Mulenvos de Cima",  val: 84, estrato: "B" },
  { name: "Boa-Fé",            val: 79, estrato: "B" },
  { name: "Baixa de Cassanje", val: 74, estrato: "B" },
  { name: "KM 14-B",           val: 68, estrato: "B" },
  { name: "Caop B",            val: 61, estrato: "C" },
  { name: "Caop A",            val: 57, estrato: "C" },
  { name: "Capalanga",         val: 49, estrato: "C" },
  { name: "Caop C",            val: 38, estrato: "C" },
];

const BAIRRO_SLA = [
  { name: "KM 9-B",            val: 95, estrato: "A" },
  { name: "KM 12-B",           val: 91, estrato: "A" },
  { name: "Mulenvos de Cima",  val: 88, estrato: "B" },
  { name: "Boa-Fé",            val: 82, estrato: "B" },
  { name: "Baixa de Cassanje", val: 78, estrato: "B" },
  { name: "KM 14-B",           val: 71, estrato: "B" },
  { name: "Caop B",            val: 64, estrato: "C" },
  { name: "Caop A",            val: 58, estrato: "C" },
  { name: "Capalanga",         val: 52, estrato: "C" },
  { name: "Caop C",            val: 43, estrato: "C" },
];

const ESTRATOS = { A: T.accent, B: T.accent2, C: T.warn };

const FEED_ITEMS = [
  { id: "MUL-20260509-0892", prio: 5, desc: "Falta de água há 5 dias — rua principal Caop C",          cat: "Infraestrutura",  catType: "infra", bairro: "Caop C",           estrato: "C", canal: "WhatsApp", ago: "há 3 min"  },
  { id: "MUL-20260509-0891", prio: 5, desc: "Caso suspeito de cólera — bairro Capalanga Rua 4",        cat: "Saúde Pública",   catType: "saude", bairro: "Capalanga",        estrato: "C", canal: "Mediador", ago: "há 8 min"  },
  { id: "MUL-20260509-0890", prio: 4, desc: "Lixo acumulado há 12 dias na entrada do bairro",          cat: "Ambiente",        catType: "amb",   bairro: "Boa-Fé",           estrato: "B", canal: "SMS",      ago: "há 14 min" },
  { id: "MUL-20260509-0889", prio: 3, desc: "Estrada intransitável após chuvas — KM 14-B",             cat: "Infraestrutura",  catType: "infra", bairro: "KM 14-B",          estrato: "B", canal: "Facebook", ago: "há 21 min" },
  { id: "MUL-20260509-0888", prio: 3, desc: "Iluminação pública avariada — travessa Mulenvos de Cima", cat: "Segurança",       catType: "segur", bairro: "Mulenvos de Cima", estrato: "B", canal: "Portal",   ago: "há 35 min" },
  { id: "MUL-20260509-0887", prio: 2, desc: "Escola sem água corrente — Baixa de Cassanje",            cat: "Infraestrutura",  catType: "infra", bairro: "Baixa Cassanje",   estrato: "B", canal: "WhatsApp", ago: "há 1h"     },
];

const TICKETS = [
  { id: "MUL-20260509-0892", desc: "Falta de água — Caop C Rua Principal",       bairro: "Caop C",          cat: "Infraestrutura", catType: "infra", canal: "WhatsApp", prio: "P5", prioColor: T.danger, status: "Triagem",      statusCls: "triagem", tecnico: "— não atribuído", data: "09/05 08:12", actions: ["Atribuir","Ver"] },
  { id: "MUL-20260509-0891", desc: "Caso suspeito de cólera — Capalanga",         bairro: "Capalanga",       cat: "Saúde Pública",  catType: "saude", canal: "Mediador", prio: "P5", prioColor: T.danger, status: "Crítico",      statusCls: "critico", tecnico: "Téc. Bernardo",  data: "09/05 08:04", actions: ["Escalar","Ver"]  },
  { id: "MUL-20260508-0874", desc: "Lixo acumulado — Boa-Fé entrada",             bairro: "Boa-Fé",          cat: "Ambiente",       catType: "amb",   canal: "SMS",      prio: "P4", prioColor: T.warn,   status: "Em progresso", statusCls: "progresso", tecnico: "Téc. Amorim",  data: "08/05 15:38", actions: ["Ver"]            },
  { id: "MUL-20260508-0865", desc: "Buraco na estrada — KM 14-B",                 bairro: "KM 14-B",         cat: "Infraestrutura", catType: "infra", canal: "Facebook", prio: "P3", prioColor: T.accent2,status: "Resolvido",     statusCls: "resolvido", tecnico: "Téc. Faria",   data: "08/05 09:00", actions: ["Ver"]            },
  { id: "MUL-20260507-0842", desc: "Iluminação avariada — Mulenvos de Cima",      bairro: "Mulenvos de Cima",cat: "Segurança",      catType: "segur", canal: "Portal",   prio: "P3", prioColor: T.accent2,status: "Em progresso", statusCls: "progresso", tecnico: "Téc. Costa",   data: "07/05 14:22", actions: ["Ver"]            },
];

const MEDIADORES = [
  { initials: "AM", name: "António M.", bairro: "Caop C",    tickets: 14, online: true  },
  { initials: "CM", name: "Clara M.",   bairro: "Capalanga", tickets: 9,  online: true  },
  { initials: "JA", name: "João António", bairro: "Boa-Fé",  tickets: 6,  online: false },
];

// ─── Style helpers ───────────────────────────────────────────────
function card(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: T.surface,
    border: `1px solid ${T.bdr}`,
    borderRadius: 12,
    overflow: "hidden",
    ...extra,
  };
}

function catColor(type: string): React.CSSProperties {
  const map: Record<string,{color:string;bg:string;border:string}> = {
    infra: { color: T.accent,  bg: "rgba(0,196,154,0.06)", border: "rgba(0,196,154,0.2)"   },
    saude: { color: T.danger,  bg: "rgba(247,111,111,0.06)", border: "rgba(247,111,111,0.2)" },
    segur: { color: T.warn,    bg: "rgba(247,184,79,0.06)",  border: "rgba(247,184,79,0.2)"  },
    amb:   { color: T.accent2, bg: "rgba(79,163,247,0.06)",  border: "rgba(79,163,247,0.2)"  },
  };
  const c = map[type] || { color: T.muted, bg: T.srf2, border: T.bdr };
  return { color: c.color, background: c.bg, border: `1px solid ${c.border}`, fontFamily: T.mono, fontSize: 9, padding: "1px 6px", borderRadius: 3 };
}

function statusPill(cls: string): React.CSSProperties {
  const map: Record<string,{color:string;bg:string;border:string}> = {
    resolvido: { color: T.accent,  bg: "rgba(0,196,154,0.07)",    border: "rgba(0,196,154,0.25)"    },
    progresso: { color: T.accent2, bg: "rgba(79,163,247,0.07)",   border: "rgba(79,163,247,0.25)"   },
    triagem:   { color: T.warn,    bg: "rgba(247,184,79,0.07)",   border: "rgba(247,184,79,0.25)"   },
    aberto:    { color: T.muted,   bg: T.srf2,                    border: T.bdr                     },
    critico:   { color: T.danger,  bg: "rgba(247,111,111,0.07)",  border: "rgba(247,111,111,0.25)"  },
  };
  const c = map[cls] || { color: T.muted, bg: T.srf2, border: T.bdr };
  return {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontFamily: T.mono, fontSize: 9, padding: "2px 8px", borderRadius: 4,
    border: `1px solid ${c.border}`, background: c.bg, color: c.color, whiteSpace: "nowrap",
  };
}

const prioDot: Record<number,{bg:string;shadow?:string}> = {
  5: { bg: T.danger,  shadow: "0 0 5px rgba(247,111,111,0.5)" },
  4: { bg: T.warn    },
  3: { bg: T.accent2 },
  2: { bg: T.accent  },
  1: { bg: T.muted2  },
};

// ─── Subcomponents ───────────────────────────────────────────────

function CardHeader({ title, dot = T.accent, children }: {
  title: string; dot?: string; children?: React.ReactNode
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 20px", borderBottom: `1px solid ${T.bdr}`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: T.text, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, display: "inline-block", flexShrink: 0 }} />
        {title}
      </div>
      {children && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>{children}</div>}
    </div>
  );
}

function CardBtn({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active ?? false}
      style={{
        fontFamily: T.mono, fontSize: 9, color: active ? T.accent : T.muted,
        border: `1px solid ${active ? "rgba(0,196,154,0.3)" : T.bdr}`,
        background: active ? "rgba(0,196,154,0.06)" : "none",
        borderRadius: 5, padding: "4px 10px", cursor: "pointer",
        letterSpacing: "0.06em", textTransform: "uppercase" as const,
      }}
    >
      {children}
    </button>
  );
}

function AnimatedBar({ estrato, val, maxVal, mounted, label }: { estrato: string; val: number; maxVal: number; mounted: boolean; label?: string }) {
  const pct = (val / maxVal) * 100;
  const color = ESTRATOS[estrato as keyof typeof ESTRATOS] || T.muted;
  return (
    <div
      role="progressbar"
      aria-valuenow={val}
      aria-valuemin={0}
      aria-valuemax={maxVal}
      aria-label={label}
      style={{ flex: 1, height: 6, background: T.srf2, borderRadius: 10, overflow: "hidden" }}
    >
      <div style={{
        height: "100%", borderRadius: 10, background: color,
        width: mounted ? `${pct}%` : "0%",
        transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
      }} />
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────
type LiveTicket = {
  id: string;
  desc: string;
  bairro: string;
  cat: string;
  catType: string;
  canal: string;
  prio: string;
  prioColor: string;
  status: string;
  statusCls: string;
  tecnico: string;
  data: string;
  actions: string[];
};

const PRIORITY_LABEL: Record<AdminRequestRow["priority"], { label: string; color: string }> = {
  urgent: { label: "P5", color: T.danger },
  high:   { label: "P4", color: T.warn },
  normal: { label: "P3", color: T.accent2 },
  low:    { label: "P2", color: T.muted },
};

const STATUS_LABEL: Record<
  AdminRequestRow["status"],
  { label: string; cls: string }
> = {
  received:    { label: "Recebido",     cls: "triagem" },
  triaged:     { label: "Triagem",      cls: "triagem" },
  assigned:    { label: "Atribuído",    cls: "progresso" },
  in_progress: { label: "Em progresso", cls: "progresso" },
  resolved:    { label: "Resolvido",    cls: "resolvido" },
  rejected:    { label: "Rejeitado",    cls: "critico" },
};

const TYPE_TO_CAT: Record<string, { cat: string; catType: string }> = {
  reclamacao:  { cat: "Reclamação",   catType: "infra" },
  sugestao:    { cat: "Sugestão",     catType: "amb"   },
  denuncia:    { cat: "Denúncia",     catType: "segur" },
  solicitacao: { cat: "Solicitação",  catType: "infra" },
  elogio:      { cat: "Elogio",       catType: "amb"   },
  urgente:     { cat: "Urgente",      catType: "saude" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function mapToLiveTicket(r: AdminRequestRow): LiveTicket {
  const prio = PRIORITY_LABEL[r.priority];
  const status = STATUS_LABEL[r.status];
  const cat = TYPE_TO_CAT[r.type] ?? { cat: r.category, catType: "infra" };
  return {
    id: r.ticketId,
    desc: r.description.length > 70 ? r.description.slice(0, 67) + "…" : r.description,
    bairro: r.bairroName ?? "—",
    cat: cat.cat,
    catType: cat.catType,
    canal: r.channel,
    prio: prio.label,
    prioColor: prio.color,
    status: status.label,
    statusCls: status.cls,
    tecnico: r.assignedToName ?? "— não atribuído",
    data: formatDate(r.createdAt),
    actions: r.status === "resolved" ? ["Ver"] : ["Atribuir", "Ver"],
  };
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const auth = useAuth();
  const [crisisVisible, setCrisisVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [bairroMode, setBairroMode] = useState<"volume"|"resolucao"|"sla">("volume");
  const [ticketFilter, setTicketFilter] = useState<"todos"|"criticos"|"pendentes">("todos");
  const [lastUpdate, setLastUpdate] = useState(() => new Date());
  const [slaBarMounted, setSlaBarMounted] = useState(false);
  const [liveTickets, setLiveTickets] = useState<LiveTicket[]>([]);
  const [liveFeed, setLiveFeed] = useState<typeof FEED_ITEMS>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const refreshTickets = useCallback(async () => {
    try {
      const [criticalRes, recentRes] = await Promise.all([
        listAdminRequests({ priority: "urgent", pageSize: 8 }),
        listAdminRequests({ pageSize: 12 }),
      ]);
      const tickets = recentRes.items.map(mapToLiveTicket);
      setLiveTickets(tickets);
      const feed = criticalRes.items.slice(0, 6).map((r) => {
        const cat = TYPE_TO_CAT[r.type] ?? { cat: r.category, catType: "infra" };
        return {
          id: r.ticketId,
          prio: r.priority === "urgent" ? 5 : r.priority === "high" ? 4 : 3,
          desc: r.description.length > 80 ? r.description.slice(0, 77) + "…" : r.description,
          cat: cat.cat,
          catType: cat.catType,
          bairro: r.bairroName ?? "—",
          estrato: "B" as const,
          canal: r.channel,
          ago: timeAgo(r.createdAt),
        };
      });
      setLiveFeed(feed);
      setLoadError(null);
      setUsingFallback(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro a carregar dados";
      setLoadError(msg);
      if (liveTickets.length === 0) {
        setLiveTickets(TICKETS as LiveTicket[]);
        setLiveFeed(FEED_ITEMS);
        setUsingFallback(true);
      }
    }
  }, [liveTickets.length]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 120);
    const t2 = setTimeout(() => setSlaBarMounted(true), 300);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  // SSE real-time updates — replaces 30s polling
  const { status: sseStatus, lastEventAt } = useRealtimeEvents(
    {
      onNewRequest: (row) => {
        setLiveTickets(prev => [mapToLiveTicket(row), ...prev.slice(0, 19)]);
        setLastUpdate(new Date());
        refreshTickets();
      },
      onUpdatedRequest: (row) => {
        setLiveTickets(prev =>
          prev.map(t => t.id === row.ticketId ? mapToLiveTicket(row) : t),
        );
        setLastUpdate(new Date());
      },
    },
    !!auth.user,
  );

  // Safety-net full refresh every 60s
  useEffect(() => {
    const id = setInterval(() => {
      refreshTickets();
      setLastUpdate(new Date());
    }, 60_000);
    return () => clearInterval(id);
  }, [refreshTickets]);

  async function handleLogout() {
    await auth.logout();
    router.push("/login");
  }

  const bairroData = bairroMode === "volume" ? BAIRROS : bairroMode === "resolucao" ? BAIRRO_RES : BAIRRO_SLA;
  const bairroMax  = Math.max(...bairroData.map(b => b.val));

  const ticketsSource = liveTickets.length > 0 ? liveTickets : (TICKETS as LiveTicket[]);
  const feedSource = liveFeed.length > 0 ? liveFeed : FEED_ITEMS;
  const filteredTickets = ticketsSource.filter(t => {
    if (ticketFilter === "criticos")  return t.prio === "P5";
    if (ticketFilter === "pendentes") return t.status !== "Resolvido";
    return true;
  });

  const fadeStyle = (delay: number): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
  });

  return (
    <main id="main-content" style={{ fontFamily: T.sans, color: T.text, fontSize: 14, lineHeight: 1.5 }}>

      {/* ── Session bar (logged-in user + logout) ───────────── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 24px", borderBottom: `1px solid ${T.bdr}`,
        background: T.surface, gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: T.mono, fontSize: 11, color: T.muted, letterSpacing: "0.04em" }}>
          {auth.user ? (
            <>
              <span style={{ color: T.text, fontWeight: 500 }}>{auth.user.name}</span>
              <span style={{ padding: "2px 8px", borderRadius: 10, background: "rgba(0,196,154,0.08)", color: T.accent, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {auth.user.role}
              </span>
              <span style={{ color: T.muted2 }}>{auth.user.email}</span>
            </>
          ) : (
            <span>sem sessão (modo demonstração)</span>
          )}
          {usingFallback && (
            <span style={{ padding: "2px 8px", borderRadius: 10, background: "rgba(247,184,79,0.08)", color: T.warn, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              dados demo
            </span>
          )}
          {loadError && !usingFallback && (
            <span style={{ padding: "2px 8px", borderRadius: 10, background: "rgba(247,111,111,0.08)", color: T.danger, fontSize: 9, letterSpacing: "0.04em" }}>
              {loadError}
            </span>
          )}
        </div>
        {auth.user && (
          <button
            onClick={handleLogout}
            aria-label="Terminar sessão"
            style={{
              fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: "0.06em",
              padding: "6px 14px", borderRadius: 6,
              border: `1px solid ${T.bdr2}`, background: "transparent", cursor: "pointer",
            }}
          >
            Terminar sessão
          </button>
        )}
      </header>

      {/* ── Global style injection ──────────────────────────── */}
      <style>{`
        @keyframes db-pulse-border {
          0%,100% { border-color: rgba(247,111,111,0.25); }
          50%      { border-color: rgba(247,111,111,0.55); }
        }
        @keyframes db-pulse-dot {
          0%   { box-shadow: 0 0 0 0 rgba(247,111,111,0.5); }
          70%  { box-shadow: 0 0 0 6px rgba(247,111,111,0); }
          100% { box-shadow: 0 0 0 0 rgba(247,111,111,0); }
        }
        @keyframes db-pulse-green {
          0%   { box-shadow: 0 0 0 0 rgba(0,196,154,0.5); }
          70%  { box-shadow: 0 0 0 5px rgba(0,196,154,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,196,154,0); }
        }
        .db-pill-dot::before {
          content: '';
          display: inline-block;
          width: 4px; height: 4px;
          border-radius: 50%;
          background: currentColor;
          margin-right: 4px;
          vertical-align: middle;
        }
        .db-feed-item:hover { background: ${T.srf2} !important; }
        .db-med-row:hover   { border-color: ${T.bdr2} !important; }
        .db-kpi-card:hover  { border-color: ${T.bdr2} !important; transform: translateY(-1px); }
        .db-tbody-tr:hover  { background: ${T.srf2} !important; }
        .db-action-btn:hover { color: ${T.text} !important; border-color: ${T.bdr2} !important; }
        .db-card-btn:hover   { color: ${T.text} !important; border-color: ${T.bdr2} !important; }
        .db-dismiss:hover    { color: ${T.text} !important; border-color: ${T.bdr2} !important; }
        .db-icon-btn:hover   { background: ${T.srf3} !important; color: ${T.text} !important; }

        /* ── Responsive layout ───────────────────────────────── */
        .db-content-wrap { padding: 12px; }
        .db-kpi-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; margin-bottom: 26px; }
        .db-row-2col { display: grid; grid-template-columns: 1fr;           gap: 16px; margin-bottom: 16px; }
        .db-row-11   { display: grid; grid-template-columns: 1fr;           gap: 16px; margin-bottom: 16px; }
        @media (min-width: 640px) {
          .db-kpi-grid { grid-template-columns: repeat(3,1fr); }
        }
        @media (min-width: 1024px) {
          .db-content-wrap { padding: 24px; }
          .db-kpi-grid { grid-template-columns: repeat(5,1fr); }
          .db-row-2col { grid-template-columns: 2fr 1fr; }
          .db-row-11   { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="db-content-wrap">
      {/* ── Crisis banner ──────────────────────────────────── */}
      {crisisVisible && (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "rgba(247,111,111,0.08)", borderRadius: 10,
            padding: "12px 16px", marginBottom: 24,
            border: "1px solid rgba(247,111,111,0.25)",
            animation: "db-pulse-border 2s ease-in-out infinite",
            ...fadeStyle(0.05),
          }}
        >
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: T.danger, flexShrink: 0,
            animation: "db-pulse-dot 1.5s ease-in-out infinite",
          }} />
          <div style={{ flex: 1, fontSize: 12.5, color: T.danger }}>
            <strong style={{ fontWeight: 500 }}>Alerta de crise activo:</strong>{" "}
            Caop C registou 47 ocorrências nas últimas 2h — 3,8× acima da média semanal. Categoria dominante: Saúde Pública.
          </div>
          <button
            className="db-dismiss"
            onClick={() => setCrisisVisible(false)}
            aria-label="Dispensar alerta de crise"
            style={{
              fontFamily: T.mono, fontSize: 10, color: T.muted, cursor: "pointer",
              padding: "4px 8px", borderRadius: 4, border: `1px solid ${T.bdr}`,
              background: "none", transition: "all 0.14s",
            }}
          >
            Dispensar
          </button>
        </div>
      )}

      {/* ── KPI grid ───────────────────────────────────────── */}
      <div className="db-kpi-grid" style={{ ...fadeStyle(0.12) }}>
        {[
          { label: "Total do mês",         value: "1 247", delta: "↑ 18% vs mês anterior",   deltaUp: true,  strip: T.accent  },
          { label: "Resolvidas",            value: "714",   delta: "↑ 57,3% resolução",        deltaUp: true,  strip: T.accent2 },
          { label: "Em aberto",             value: "389",   delta: "↑ 24 acima do SLA",        deltaUp: false, strip: T.warn    },
          { label: "Críticas P5",           value: "144",   delta: "↑ 12 novas hoje",           deltaUp: false, strip: T.danger  },
          { label: "Tempo médio resolução", value: "38h",   delta: "— Meta: 48h",               deltaUp: null,  strip: T.muted   },
        ].map((k) => (
          <div
            key={k.label}
            className="db-kpi-card"
            style={{
              ...card({ position: "relative", padding: "18px 20px", cursor: "default",
                transition: "border-color 0.15s, transform 0.15s" }),
            }}
          >
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              borderRadius: "12px 12px 0 0", background: k.strip, opacity: 0.6,
            }} />
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              {k.label}
            </div>
            <div style={{ fontFamily: T.display, fontSize: 32, fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 8, color: k.strip === T.muted ? T.text : k.strip }}>
              {k.value}
            </div>
            <div style={{
              fontFamily: T.mono, fontSize: 10, display: "flex", alignItems: "center", gap: 4,
              color: k.deltaUp === true ? T.accent : k.deltaUp === false ? T.danger : T.muted,
            }}>
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Bairros (3) + Status donut (1) ─────────── */}
      <div className="db-row-2col" style={{ ...fadeStyle(0.19) }}>

        {/* Bairro chart */}
        <div style={card()}>
          <CardHeader title="Ocorrências por bairro" dot={T.accent}>
            <CardBtn active={bairroMode==="volume"}    onClick={() => setBairroMode("volume")}>Volume</CardBtn>
            <CardBtn active={bairroMode==="resolucao"} onClick={() => setBairroMode("resolucao")}>Resolução</CardBtn>
            <CardBtn active={bairroMode==="sla"}       onClick={() => setBairroMode("sla")}>SLA</CardBtn>
          </CardHeader>
          <div style={{ display: "flex", gap: 14, padding: "0 20px 14px" }}>
            {([["A", T.accent, "Estrato A — Consolidado"], ["B", T.accent2, "Estrato B — Em consolidação"], ["C", T.warn, "Estrato C — Crítico"]] as [string,string,string][]).map(([s,c,l]) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: T.mono, fontSize: 9, color: T.muted }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block", flexShrink: 0 }} />
                {l}
              </div>
            ))}
          </div>
          <div style={{ padding: "0 20px 16px" }}>
            {bairroData.map((b) => (
              <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, width: 110, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {b.name}
                </div>
                <AnimatedBar estrato={b.estrato} val={b.val} maxVal={bairroMax} mounted={mounted} label={b.name} />
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, width: 28, textAlign: "right", flexShrink: 0 }}>
                  {b.val}{bairroMode === "sla" || bairroMode === "resolucao" ? "%" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status donut */}
        <div style={card()}>
          <CardHeader title="Estado geral" dot={T.accent2} />
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <div
                role="img"
                aria-label="Gráfico circular: 57% resolvido, 12,4% em progresso, 18,8% em triagem, 11,5% críticas P5"
                style={{
                  width: 110, height: 110, borderRadius: "50%",
                  background: `conic-gradient(${T.accent} 0deg 207deg, ${T.accent2} 207deg 261deg, ${T.warn} 261deg 316deg, ${T.danger} 316deg 360deg)`,
                  display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                }}
              >
                <div style={{
                  position: "absolute", width: 68, height: 68, background: T.surface, borderRadius: "50%",
                }} />
                <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
                  <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 300, color: T.accent, lineHeight: 1 }}>57%</div>
                  <div style={{ fontFamily: T.mono, fontSize: 8, color: T.muted, letterSpacing: "0.06em", marginTop: 2 }}>resolvido</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Resolvidas",  n: 714, pct: "57.3%", color: T.accent  },
                { label: "Em progresso",n: 155, pct: "12.4%", color: T.accent2 },
                { label: "Triagem IA",  n: 234, pct: "18.8%", color: T.warn    },
                { label: "Críticas P5", n: 144, pct: "11.5%", color: T.danger  },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, color: T.muted }}>{s.label}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 11, color: T.text }}>{s.n}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted2, width: 36, textAlign: "right" }}>{s.pct}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Feed (1) + [SLA + Mediadores] (1) ─────── */}
      <div className="db-row-11" style={{ ...fadeStyle(0.26) }}>

        {/* Real-time feed */}
        <div style={card()}>
          <CardHeader title="Feed em tempo real" dot={T.warn}>
            <span
              role="status"
              aria-live="polite"
              style={{ fontFamily: T.mono, fontSize: 9, color: sseStatus === "open" ? T.accent : T.muted2 }}
            >
              {sseStatus === "open" ? "● em directo" : sseStatus === "connecting" ? "○ a ligar…" : "○ desligado"}
            </span>
          </CardHeader>
          <div>
            {feedSource.map((f) => {
              const dot = prioDot[f.prio];
              return (
                <div
                  key={f.id}
                  className="db-feed-item"
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "13px 20px", borderBottom: `1px solid ${T.bdr}`,
                    transition: "background 0.12s", cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%", marginTop: 6, flexShrink: 0,
                    background: dot.bg, boxShadow: dot.shadow,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, marginBottom: 2 }}>{f.id}</div>
                    <div style={{ fontSize: 12, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.desc}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <span style={catColor(f.catType)}>{f.cat}</span>
                      <span style={{ fontFamily: T.mono, fontSize: 9, padding: "1px 6px", borderRadius: 3, border: `1px solid ${T.bdr}`, color: T.muted }}>
                        {f.bairro} · Est. {f.estrato}
                      </span>
                      <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2 }}>{f.canal}</span>
                      <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2, marginLeft: "auto" }}>{f.ago}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLA + Mediadores stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* SLA card */}
          <div style={card()}>
            <CardHeader title="Cumprimento SLA" dot={T.accent} />
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: T.display, fontSize: 48, fontWeight: 300, color: T.accent, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 4 }}>
                78%
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
                SLA global este mês
              </div>
              <div
                role="progressbar"
                aria-valuenow={78}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="SLA global: 78%"
                style={{ height: 4, background: T.srf3, borderRadius: 10, marginBottom: 20, overflow: "hidden" }}
              >
                <div style={{
                  height: "100%",
                  background: `linear-gradient(90deg, ${T.accent}, ${T.accent2})`,
                  borderRadius: 10,
                  width: slaBarMounted ? "78%" : "0%",
                  transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
                }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { cat: "Infraestrutura", sla: "72h", pct: "82% OK", ok: true  },
                  { cat: "Saúde Pública",  sla: "24h", pct: "61% OK", ok: false },
                  { cat: "Segurança",      sla: "12h", pct: "89% OK", ok: true  },
                  { cat: "Ambiente",       sla: "96h", pct: "91% OK", ok: true  },
                ].map((r) => (
                  <div key={r.cat} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                    <div style={{ flex: 1, color: T.muted }}>{r.cat}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 10, color: T.text }}>{r.sla}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: r.ok ? T.accent : T.danger }}>{r.pct}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mediadores card */}
          <div style={card()}>
            <CardHeader title="Mediadores activos" dot={T.accent2}>
              <CardBtn>Ver todos</CardBtn>
            </CardHeader>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {MEDIADORES.map((m) => (
                <div
                  key={m.name}
                  className="db-med-row"
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", background: T.srf2, borderRadius: 8,
                    border: `1px solid ${T.bdr}`, transition: "border-color 0.14s", cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "rgba(79,163,247,0.12)", border: "1px solid rgba(79,163,247,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: T.mono, fontSize: 10, color: T.accent2, flexShrink: 0,
                  }}>
                    {m.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{m.name}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, marginTop: 1 }}>{m.bairro}</div>
                  </div>
                  <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, textAlign: "right" }}>
                    <span style={{ display: "block", fontSize: 13, color: T.text, fontWeight: 500 }}>{m.tickets}</span>
                    tickets
                  </div>
                  <div style={{
                    fontFamily: T.mono, fontSize: 9, padding: "2px 7px", borderRadius: 4,
                    background: m.online ? "rgba(0,196,154,0.1)" : T.srf3,
                    color: m.online ? T.accent : T.muted2,
                    border: `1px solid ${m.online ? "rgba(0,196,154,0.25)" : T.bdr}`,
                  }}>
                    {m.online ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent, display: "inline-block", animation: "db-pulse-green 2s ease-in-out infinite" }} />
                        online
                      </span>
                    ) : "offline"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tickets table ──────────────────────────────────── */}
      <div style={{ ...card(), marginBottom: 16, ...fadeStyle(0.33) }}>
        <CardHeader title="Tickets recentes — todos os bairros" dot={T.muted}>
          <CardBtn active={ticketFilter==="todos"}     onClick={() => setTicketFilter("todos")}>Todos</CardBtn>
          <CardBtn active={ticketFilter==="criticos"}  onClick={() => setTicketFilter("criticos")}>Críticos</CardBtn>
          <CardBtn active={ticketFilter==="pendentes"} onClick={() => setTicketFilter("pendentes")}>Pendentes</CardBtn>
          <CardBtn>Exportar CSV</CardBtn>
        </CardHeader>
        <div style={{ overflowX: "auto" }}>
          <table aria-label="Tickets recentes — todos os bairros" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["ID","Descrição","Bairro","Categoria","Canal","Prio","Estado","Técnico","Criado","Acções"].map(h => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left", fontFamily: T.mono, fontSize: 9,
                    color: T.muted2, letterSpacing: "0.1em", textTransform: "uppercase",
                    borderBottom: `1px solid ${T.bdr}`, fontWeight: 400, whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t) => (
                <tr key={t.id} className="db-tbody-tr" style={{ borderBottom: `1px solid ${T.bdr}`, transition: "background 0.12s", cursor: "pointer" }}>
                  <td style={{ padding: "11px 16px", fontFamily: T.mono, fontSize: 10, color: T.muted }}>{t.id}</td>
                  <td style={{ padding: "11px 16px", color: T.text, maxWidth: 220 }}>{t.desc}</td>
                  <td style={{ padding: "11px 16px", color: T.text }}>{t.bairro}</td>
                  <td style={{ padding: "11px 16px" }}><span style={catColor(t.catType)}>{t.cat}</span></td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, background: T.srf2, padding: "2px 7px", borderRadius: 4, border: `1px solid ${T.bdr}` }}>
                      {t.canal}
                    </span>
                  </td>
                  <td style={{ padding: "11px 16px", fontFamily: T.mono, fontSize: 11, color: t.prioColor, fontWeight: 600 }}>{t.prio}</td>
                  <td style={{ padding: "11px 16px" }}>
                    <span className="db-pill-dot" style={statusPill(t.statusCls)}>{t.status}</span>
                  </td>
                  <td style={{ padding: "11px 16px", color: t.tecnico.startsWith("—") ? T.muted2 : T.text, fontSize: 11 }}>{t.tecnico}</td>
                  <td style={{ padding: "11px 16px", fontFamily: T.mono, fontSize: 10, color: T.muted }}>{t.data}</td>
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ display: "flex", gap: 5 }}>
                      {t.actions.map(a => (
                        <button
                          key={a}
                          className="db-action-btn"
                          style={{
                            fontFamily: T.mono, fontSize: 9, padding: "3px 8px", borderRadius: 4,
                            border: `1px solid ${T.bdr}`, background: "none", color: T.muted,
                            cursor: "pointer", transition: "all 0.14s", letterSpacing: "0.04em",
                          }}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Refresh bar ────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: T.mono, fontSize: 9, color: T.muted2,
        padding: "10px 0", borderTop: `1px solid ${T.bdr}`,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%", background: T.accent,
          animation: "db-pulse-green 2s ease-in-out infinite",
          flexShrink: 0,
        }} />
        <span>
          Sistema operacional · Última actualização:{" "}
          {(lastEventAt ?? lastUpdate).toLocaleString("pt-AO")} · SSE {sseStatus === "open" ? "✓ em directo" : "a reconectar…"}
        </span>
        <span style={{ marginLeft: "auto" }}>n=390 · 10 bairros · 3 estratos · Mulenvos</span>
      </div>
      </div>{/* /db-content-wrap */}
    </main>
  );
}
