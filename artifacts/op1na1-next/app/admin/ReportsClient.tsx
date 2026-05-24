"use client";

import { useState, useEffect, useCallback } from "react";
import type { AdminReportsData } from "@/lib/demo";

// ─── Design tokens (match admin layout) ──────────────────────────
const T = {
  bg:      "#080c10",
  surface: "#0e1419",
  srf2:    "#111720",
  srf3:    "#141c24",
  bdr:     "rgba(255,255,255,0.07)",
  bdr2:    "rgba(255,255,255,0.12)",
  accent:  "#00c49a",
  accentD: "#009e7c",
  text:    "#e8edf4",
  muted:   "#6b7d96",
  danger:  "#f76f6f",
  warn:    "#f5a623",
  mono:    "'DM Mono', monospace",
  sans:    "'DM Sans', sans-serif",
  display: "'Fraunces', serif",
} as const;

type Period = "7d" | "30d" | "90d";

// ─── Helpers ──────────────────────────────────────────────────────
const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp", portal: "Portal", sms: "SMS",
  messenger: "Messenger", ussd: "USSD",
};
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#f76f6f", high: "#f5a623", normal: "#00c49a", low: "#6b7d96",
};
const CATEGORY_COLORS = ["#00c49a","#3b82f6","#f5a623","#a855f7","#f76f6f","#6b7d96"];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCSV(data: AdminReportsData) {
  const header = ["Data", "Submetidos", "Resolvidos"];
  const rows   = data.trend.map(d => [d.date, d.submitted, d.resolved]);
  const csv    = [header, ...rows].map(r => r.join(",")).join("\n");
  download(`relatorio-op1na1-${data.period}-${data.generatedAt.slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8;");
}

function exportJSON(data: AdminReportsData) {
  download(
    `relatorio-op1na1-${data.period}-${data.generatedAt.slice(0, 10)}.json`,
    JSON.stringify(data, null, 2),
    "application/json",
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = T.accent }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.bdr}`, borderRadius: 10,
      padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: T.display, fontSize: 34, fontWeight: 300, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontFamily: T.sans, fontSize: 11, color: T.muted }}>{sub}</div>}
    </div>
  );
}

// ─── SVG Trend Chart ──────────────────────────────────────────────
function TrendChart({ data }: { data: AdminReportsData["trend"] }) {
  if (!data.length) return null;

  const W = 580, H = 140, PAD = { t: 10, r: 8, b: 24, l: 36 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const maxVal = Math.max(...data.map(d => Math.max(d.submitted, d.resolved)), 1);
  const step   = plotW / Math.max(data.length - 1, 1);

  const xOf = (i: number) => PAD.l + i * step;
  const yOf = (v: number) => PAD.t + plotH - (v / maxVal) * plotH;

  const polyline = (key: "submitted" | "resolved") =>
    data.map((d, i) => `${xOf(i)},${yOf(d[key])}`).join(" ");

  // Y-axis ticks
  const yticks = [0, Math.round(maxVal / 2), maxVal];

  // X-axis labels — show ~6 evenly spaced
  const xLabelStep = Math.max(1, Math.floor(data.length / 6));
  const xLabels = data.filter((_, i) => i % xLabelStep === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} aria-label="Tendência de pedidos por dia">
      {/* Grid lines */}
      {yticks.map(v => (
        <g key={v}>
          <line x1={PAD.l} y1={yOf(v)} x2={W - PAD.r} y2={yOf(v)}
            stroke={T.bdr2} strokeWidth="1" strokeDasharray="3 4" />
          <text x={PAD.l - 5} y={yOf(v) + 4} textAnchor="end"
            fill={T.muted} fontSize="9" fontFamily={T.mono}>{v}</text>
        </g>
      ))}

      {/* Area fill — submitted */}
      <path
        d={`M ${xOf(0)} ${yOf(data[0].submitted)} ${data.slice(1).map((d, i) => `L ${xOf(i + 1)} ${yOf(d.submitted)}`).join(" ")} L ${xOf(data.length - 1)} ${PAD.t + plotH} L ${xOf(0)} ${PAD.t + plotH} Z`}
        fill={T.accent} fillOpacity="0.08"
      />

      {/* Lines */}
      <polyline points={polyline("submitted")} fill="none" stroke={T.accent} strokeWidth="2" strokeLinejoin="round" />
      <polyline points={polyline("resolved")}  fill="none" stroke={T.accentD} strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="5 3" />

      {/* X labels */}
      {xLabels.map(d => {
        const i = data.indexOf(d);
        return (
          <text key={d.date} x={xOf(i)} y={H - 6} textAnchor="middle"
            fill={T.muted} fontSize="9" fontFamily={T.mono}>{fmtDate(d.date)}</text>
        );
      })}
    </svg>
  );
}

// ─── Horizontal bar chart ─────────────────────────────────────────
function HBar({ items, colorFn }: {
  items: { label: string; pct: number; count: number; color?: string }[];
  colorFn?: (i: number) => string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: T.sans, fontSize: 12, color: T.text }}>{item.label}</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.muted }}>{item.count} · {item.pct}%</span>
          </div>
          <div style={{ height: 6, background: T.srf3, borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${item.pct}%`,
              background: item.color ?? (colorFn ? colorFn(i) : T.accent),
              borderRadius: 3,
              transition: "width .5s cubic-bezier(.4,0,.2,1)",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Donut chart ─────────────────────────────────────────────────
function Donut({ segments }: {
  segments: { label: string; pct: number; color: string }[];
}) {
  const cx = 60, cy = 60, r = 44, stroke = 14;
  const circ = 2 * Math.PI * r;

  function polarToCartesian(deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  let cumDeg = 0;
  const arcs = segments.map(seg => {
    const deg  = (seg.pct / 100) * 360;
    const start = cumDeg;
    cumDeg += deg;
    const large = deg > 180 ? 1 : 0;
    const s = polarToCartesian(start);
    const e = polarToCartesian(cumDeg - 0.2); // tiny gap
    const path = `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
    return { ...seg, path };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg viewBox="0 0 120 120" style={{ width: 120, height: 120, flexShrink: 0 }} aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill={T.srf3} />
        {arcs.map(a => (
          <path key={a.label} d={a.path} fill={a.color} fillOpacity="0.9" />
        ))}
        {/* Centre hole */}
        <circle cx={cx} cy={cy} r={r - stroke} fill={T.surface} />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontFamily: T.sans, fontSize: 11, color: T.muted }}>{s.label}</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text, marginLeft: "auto" }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────
function Card({ title, children, style }: {
  title: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.bdr}`, borderRadius: 10,
      padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16,
      ...style,
    }}>
      <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>{title}</div>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────
export function ReportsClient() {
  const [period, setPeriod]   = useState<Period>("30d");
  const [data, setData]       = useState<AdminReportsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports?period=${p}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data?: AdminReportsData };
      setData(json.data ?? null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(period); }, [period, load]);

  const PERIODS: { value: Period; label: string }[] = [
    { value: "7d",  label: "7 dias"  },
    { value: "30d", label: "30 dias" },
    { value: "90d", label: "90 dias" },
  ];

  return (
    <>
      {/* Print-only + responsive styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #111 !important; }
        }
        @media (max-width: 767px) {
          .rp-controls { flex-direction: column; align-items: flex-start !important; }
          .rp-bairros-table { overflow-x: auto; display: block; }
        }
      `}</style>

      <div style={{ padding: "clamp(16px, 4vw, 32px) clamp(16px, 4vw, 36px)", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: T.display, fontSize: 26, fontWeight: 300, color: T.text, margin: 0, letterSpacing: "-0.02em" }}>
              Relatórios
            </h1>
            {data && (
              <p style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, margin: "4px 0 0", letterSpacing: "0.08em" }}>
                Gerado em {new Date(data.generatedAt).toLocaleString("pt-AO")}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="no-print rp-controls" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Period selector */}
            <div role="group" aria-label="Período" style={{ display: "flex", background: T.srf2, borderRadius: 8, padding: 3, border: `1px solid ${T.bdr}` }}>
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  aria-pressed={period === p.value}
                  style={{
                    padding: "5px 14px", borderRadius: 5, border: "none", cursor: "pointer",
                    fontFamily: T.mono, fontSize: 11, letterSpacing: "0.04em",
                    background: period === p.value ? T.accent : "transparent",
                    color:      period === p.value ? "#000" : T.muted,
                    transition: "all .14s",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Export */}
            {data && (
              <>
                <button
                  onClick={() => exportCSV(data)}
                  title="Exportar CSV"
                  style={{ padding: "6px 14px", background: T.srf2, border: `1px solid ${T.bdr2}`, borderRadius: 7, cursor: "pointer", color: T.text, fontFamily: T.sans, fontSize: 12 }}
                >
                  CSV
                </button>
                <button
                  onClick={() => exportJSON(data)}
                  title="Exportar JSON"
                  style={{ padding: "6px 14px", background: T.srf2, border: `1px solid ${T.bdr2}`, borderRadius: 7, cursor: "pointer", color: T.text, fontFamily: T.sans, fontSize: 12 }}
                >
                  JSON
                </button>
                <button
                  onClick={() => window.print()}
                  title="Imprimir / guardar PDF"
                  style={{ padding: "6px 14px", background: T.srf2, border: `1px solid ${T.bdr2}`, borderRadius: 7, cursor: "pointer", color: T.text, fontFamily: T.sans, fontSize: 12 }}
                >
                  PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* Loading / error */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: T.muted, fontFamily: T.sans, fontSize: 13 }}>
            A carregar relatório…
          </div>
        )}
        {error && (
          <div role="alert" style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(247,111,111,.1)", border: `1px solid ${T.danger}`, color: T.danger, fontFamily: T.sans, fontSize: 13, marginBottom: 20 }}>
            Erro ao carregar relatório: {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
              <KpiCard label="Total pedidos"   value={data.kpi.total}          sub={`Últimos ${period === "7d" ? "7" : period === "90d" ? "90" : "30"} dias`} />
              <KpiCard label="Resolvidos"      value={data.kpi.resolved}       sub={`${data.kpi.resolutionRate}% taxa de resolução`} color={T.accent} />
              <KpiCard label="Em progresso"    value={data.kpi.inProgress}     sub="Em tratamento"                                   color="#3b82f6" />
              <KpiCard label="Rejeitados"      value={data.kpi.rejected}       sub="Não processados"                                 color={T.danger} />
              <KpiCard label="Tempo médio"     value={`${data.kpi.avgResolutionHours}h`} sub="Resolução média"                      color={T.warn} />
            </div>

            {/* Trend chart */}
            <Card title="Evolução de pedidos" style={{ marginBottom: 20 }}>
              <TrendChart data={data.trend} />
              <div className="no-print" style={{ display: "flex", gap: 16, marginTop: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 20, height: 2, background: T.accent }} />
                  <span style={{ fontFamily: T.sans, fontSize: 11, color: T.muted }}>Submetidos</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 20, height: 0, borderTop: `2px dashed ${T.accentD}` }} />
                  <span style={{ fontFamily: T.sans, fontSize: 11, color: T.muted }}>Resolvidos</span>
                </div>
              </div>
            </Card>

            {/* Category + Channel row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12, marginBottom: 20 }}>
              <Card title="Por categoria">
                <HBar
                  items={data.byCategory.map((c, i) => ({ label: c.label, pct: c.pct, count: c.count, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))}
                />
              </Card>

              <Card title="Por canal">
                <Donut
                  segments={data.byChannel.map((c, i) => ({
                    label: CHANNEL_LABELS[c.channel] ?? c.channel,
                    pct:   c.pct,
                    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                  }))}
                />
              </Card>
            </div>

            {/* Bairros + Priority row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
              <Card title="Top bairros">
                <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }} aria-label="Pedidos por bairro">
                  <thead>
                    <tr>
                      <th style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, textAlign: "left", padding: "0 0 8px", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${T.bdr}` }}>Bairro</th>
                      <th style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, textAlign: "right", padding: "0 0 8px", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${T.bdr}` }}>Pedidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byBairro.map((b, i) => (
                      <tr key={b.name}>
                        <td style={{ fontFamily: T.sans, fontSize: 12, color: T.text, padding: "7px 0", borderBottom: i < data.byBairro.length - 1 ? `1px solid ${T.bdr}` : "none" }}>{b.name}</td>
                        <td style={{ fontFamily: T.mono, fontSize: 12, color: T.accent, textAlign: "right", padding: "7px 0", borderBottom: i < data.byBairro.length - 1 ? `1px solid ${T.bdr}` : "none" }}>{b.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </Card>

              <Card title="Por prioridade">
                <HBar
                  items={data.byPriority.map(p => ({
                    label: p.priority === "urgent" ? "Urgente" : p.priority === "high" ? "Alta" : p.priority === "normal" ? "Normal" : "Baixa",
                    pct:   p.pct,
                    count: p.count,
                    color: PRIORITY_COLORS[p.priority] ?? T.muted,
                  }))}
                />
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}
