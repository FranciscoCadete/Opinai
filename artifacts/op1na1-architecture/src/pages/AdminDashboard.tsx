import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import {
  AlertTriangle, X, TrendingUp, TrendingDown, Clock, CheckCircle2,
  FileText, Users, RefreshCw, Download, ChevronDown, Map, Filter,
  Activity, Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────
type Status = "Submetido" | "Triagem" | "Em Progresso" | "Resolvido" | "Fechado";
type Category = "Reclamação" | "Sugestão" | "Denúncia" | "Solicitação" | "Elogio";

interface Ticket {
  id: string;
  tipo: Category;
  bairro: string;
  descricao: string;
  status: Status;
  data: string;
  sla: "OK" | "RISCO" | "EXPIRADO";
  assignee: string | null;
}

// ─── Mock data — Municipality / Neighborhood (migration 0008) ───
const MUNICIPALITIES = [{ id: 1, name: "Município dos Mulenvos" }];

const BAIRROS = [
  "Km 9-B", "Km 12-B", "Mulenvos De Cima", "Baixa De Cassanje",
  "Km 14-B", "Boa-Fé", "Caop C", "Caop A", "Caop B", "Capalanga",
];
const CATEGORIES: Category[] = ["Reclamação","Sugestão","Denúncia","Solicitação","Elogio"];
const STATUSES: Status[] = ["Submetido","Triagem","Em Progresso","Resolvido","Fechado"];

const BAIRRO_DATA = [
  { bairro: "Km 9-B",            reports: 194 },
  { bairro: "Mulenvos De Cima",  reports: 167 },
  { bairro: "Baixa De Cassanje", reports: 148 },
  { bairro: "Km 12-B",           reports: 131 },
  { bairro: "Boa-Fé",            reports: 112 },
  { bairro: "Capalanga",         reports: 97  },
  { bairro: "Caop A",            reports: 83  },
  { bairro: "Km 14-B",           reports: 76  },
];

const CATEGORY_DATA = [
  { name: "Reclamação", value: 38, color: "#CC0000" },
  { name: "Solicitação", value: 24, color: "#3b82f6" },
  { name: "Denúncia",   value: 18, color: "#f59e0b" },
  { name: "Sugestão",   value: 13, color: "#22c55e" },
  { name: "Elogio",     value: 7,  color: "#8b5cf6" },
];

function makeTicket(i: number): Ticket {
  const bairro = BAIRROS[i % BAIRROS.length];
  const tipo = CATEGORIES[i % CATEGORIES.length];
  const status = STATUSES[i % STATUSES.length];
  const sla = i % 7 === 0 ? "EXPIRADO" : i % 3 === 0 ? "RISCO" : "OK";
  const days = i + 1;
  const d = new Date(Date.now() - days * 86400000);
  const dateStr = d.toISOString().slice(0, 10);
  return {
    id: `MUL-20250509-${1000 + i}`,
    tipo,
    bairro,
    descricao: [
      "Buraco na via principal sem sinalização",
      "Contentor de lixo a transbordar há 3 dias",
      "Iluminação pública avariada no cruzamento",
      "Pedido de recolha de resíduos volumosos",
      "Sugestão de parque infantil para menores",
      "Água com coloração anormal nas torneiras",
      "Proposta de ciclovia junto à avenida",
      "Vendedor ambulante a bloquear acesso PMR",
    ][i % 8],
    status,
    data: dateStr,
    sla,
    assignee: i % 2 === 0 ? "Eng. Baptista" : null,
  };
}

const MOCK_TICKETS: Ticket[] = Array.from({ length: 40 }, (_, i) => makeTicket(i));

function makeFeedItem(offset = 0) {
  const i = Math.floor(Math.random() * 8);
  return {
    id: `MUL-20250509-${2000 + offset + Math.floor(Math.random() * 999)}`,
    tipo: CATEGORIES[i % CATEGORIES.length],
    bairro: BAIRROS[i % BAIRROS.length],
    desc: [
      "Buraco na Rua Principal",
      "Lixo acumulado no bairro",
      "Luz pública avariada",
      "Pedido de paragem de autocarro",
      "Água com problema de pressão",
    ][i % 5],
    ago: `${Math.floor(Math.random() * 12) + 1}m atrás`,
  };
}

const INITIAL_FEED = Array.from({ length: 8 }, (_, i) => makeFeedItem(i));

// ─── Subcomponents ──────────────────────────────────────────────

function KPICard({
  label, value, sub, trend, icon: Icon, accent,
}: {
  label: string; value: string; sub: string;
  trend?: { dir: "up" | "down"; text: string; positive: boolean };
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", accent)}>
          <Icon size={17} className="text-white" strokeWidth={2} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground dark:text-white tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium",
          trend.positive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
        )}>
          {trend.dir === "up" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          <span>{trend.text}</span>
        </div>
      )}
    </div>
  );
}

const STATUS_COLOR: Record<Status, string> = {
  "Submetido":   "bg-blue-100  text-blue-700  dark:bg-blue-900/40  dark:text-blue-300",
  "Triagem":     "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Em Progresso":"bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "Resolvido":   "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "Fechado":     "bg-zinc-100  text-zinc-600  dark:bg-zinc-800     dark:text-zinc-400",
};

const TIPO_COLOR: Record<Category, string> = {
  "Reclamação": "text-red-600   bg-red-50   dark:bg-red-900/20   dark:text-red-400",
  "Denúncia":   "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400",
  "Solicitação":"text-blue-600  bg-blue-50  dark:bg-blue-900/20  dark:text-blue-400",
  "Sugestão":   "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
  "Elogio":     "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400",
};

const SLA_COLOR: Record<string, string> = {
  "OK":       "text-green-600 dark:text-green-400",
  "RISCO":    "text-amber-500 dark:text-amber-400",
  "EXPIRADO": "text-red-600   dark:text-red-400",
};

// ─── SVG Gauge ─────────────────────────────────────────────────
function SLAGauge({ value, target = 85 }: { value: number; target?: number }) {
  const r = 56;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * 0.75;
  const offset = arc * (1 - value / 100);
  const color = value >= target ? "#22c55e" : value >= 70 ? "#f59e0b" : "#CC0000";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="160" height="120" viewBox="0 0 160 120" aria-label={`SLA: ${value}%`}>
        {/* Background arc */}
        <circle
          cx="80" cy="90" r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeDasharray={`${arc} ${circumference}`}
          strokeDashoffset="0"
          strokeLinecap="round"
          transform="rotate(-225 80 90)"
          className="dark:stroke-zinc-700"
        />
        {/* Progress arc */}
        <circle
          cx="80" cy="90" r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${arc} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-225 80 90)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        {/* Value */}
        <text x="80" y="82" textAnchor="middle" fontSize="22" fontWeight="800" fill="currentColor" className="text-foreground dark:fill-white">
          {value}%
        </text>
        <text x="80" y="98" textAnchor="middle" fontSize="10" fill="#6b7280">
          SLA Cumprimento
        </text>
      </svg>
      <p className="text-xs text-muted-foreground">
        Target: <span className="font-semibold">{target}%</span>
        {" · "}
        <span className={cn("font-semibold", value >= target ? "text-green-600" : "text-amber-500")}>
          {value >= target ? "✓ Atingido" : `${(target - value).toFixed(1)}pp abaixo`}
        </span>
      </p>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────
export default function AdminDashboard() {
  const [showCrisis, setShowCrisis] = useState(true);
  const [feed, setFeed] = useState(INITIAL_FEED);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filterMuni,     setFilterMuni]     = useState<string>("all");
  const [filterStatus,   setFilterStatus]   = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterBairro,   setFilterBairro]   = useState<string>("all");
  const [filterSLA,      setFilterSLA]      = useState<string>("all");
  const [selected,       setSelected]       = useState<Set<string>>(new Set());

  // 30s real-time polling simulation
  const simulateRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setFeed(prev => [makeFeedItem(prev.length), ...prev.slice(0, 9)]);
      setLastRefresh(new Date());
      setRefreshing(false);
    }, 600);
  }, []);

  useEffect(() => {
    const interval = setInterval(simulateRefresh, 30000);
    return () => clearInterval(interval);
  }, [simulateRefresh]);

  // Filtered tickets (municipality filter = global for now — all tickets are Mulenvos)
  const filteredTickets = useMemo(() => MOCK_TICKETS.filter(t => {
    if (filterStatus   !== "all" && t.status !== filterStatus)   return false;
    if (filterCategory !== "all" && t.tipo   !== filterCategory) return false;
    if (filterBairro   !== "all" && t.bairro !== filterBairro)   return false;
    if (filterSLA      !== "all" && t.sla    !== filterSLA)      return false;
    return true;
  }), [filterMuni, filterStatus, filterCategory, filterBairro, filterSLA]);

  // CSV export
  function exportCSV() {
    const headers = ["Ticket ID","Tipo","Bairro","Descrição","Estado","SLA","Data","Responsável"];
    const rows = filteredTickets.map(t => [
      t.id, t.tipo, t.bairro, `"${t.descricao}"`, t.status, t.sla, t.data, t.assignee ?? "Não atribuído"
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "relatorios-mulenvos.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  // Bulk assign
  function bulkAssign() {
    alert(`Atribuir ${selected.size} ticket(s) a responsável…\n(Funcionalidade a integrar com backend)`);
    setSelected(new Set());
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleAll() {
    if (selected.size === filteredTickets.length) setSelected(new Set());
    else setSelected(new Set(filteredTickets.map(t => t.id)));
  }

  // Time formatting
  const timeAgo = (d: string) => {
    const ms = Date.now() - new Date(d).getTime();
    const h = Math.floor(ms / 3600000);
    if (h < 24) return `${h}h atrás`;
    return `${Math.floor(h / 24)}d atrás`;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">

      {/* ── Page title ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">Dashboard Administrativo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Município dos Mulenvos · Luanda, Angola</p>
        </div>
        <button
          onClick={simulateRefresh}
          className={cn(
            "flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-border dark:border-zinc-700",
            "bg-card dark:bg-zinc-900 text-muted-foreground hover:text-foreground transition-colors"
          )}
        >
          <RefreshCw size={13} className={cn(refreshing && "animate-spin")} />
          {refreshing ? "A actualizar…" : "Actualizar"}
        </button>
      </div>

      {/* ── Crisis banner ──────────────────────────────────── */}
      {showCrisis && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-red-700 dark:text-red-300">CRISE ACTIVA — Bairro Rangel</span>
              <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">LIVE</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400">
              23 relatórios em 1 hora (10.9× a baseline) · Sinais: VOLUME_ANOMALY + KEYWORD_CLUSTER + GEO_HOTSPOT · Confiança 89.1%
            </p>
          </div>
          <button
            onClick={() => setShowCrisis(false)}
            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
            aria-label="Dispensar alerta"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── KPI row ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Relatórios" value="1.248" sub="Últimos 30 dias"
          trend={{ dir: "up", text: "+12% vs mês anterior", positive: true }}
          icon={FileText} accent="bg-blue-500"
        />
        <KPICard
          label="Resolvidos" value="847" sub="67.9% taxa de resolução"
          trend={{ dir: "up", text: "+4.2% esta semana", positive: true }}
          icon={CheckCircle2} accent="bg-green-500"
        />
        <KPICard
          label="Pendentes" value="401" sub="32.1% a aguardar"
          trend={{ dir: "up", text: "+8 desde ontem", positive: false }}
          icon={Clock} accent="bg-amber-500"
        />
        <KPICard
          label="Resolução Média" value="2.4d" sub="Tempo médio de resolução"
          trend={{ dir: "down", text: "−0.3d melhoria", positive: true }}
          icon={TrendingUp} accent="bg-purple-500"
        />
      </div>

      {/* ── Charts row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Bar chart — reports per bairro */}
        <div className="lg:col-span-3 bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-foreground dark:text-white">Relatórios por Bairro</p>
              <p className="text-xs text-muted-foreground mt-0.5">Últimos 30 dias</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={BAIRRO_DATA} barSize={22} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
              <XAxis
                dataKey="bairro"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={false} tickLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,.05)" }}
                contentStyle={{
                  background: "var(--color-card,#fff)", border: "1px solid var(--color-border,#e5e7eb)",
                  borderRadius: 10, fontSize: 12,
                }}
                formatter={(v: number) => [v, "Relatórios"]}
              />
              <Bar dataKey="reports" radius={[5, 5, 0, 0]}>
                {BAIRRO_DATA.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#CC0000" : "#1e2d4a"} opacity={i === 0 ? 1 : 0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart — categories */}
        <div className="lg:col-span-2 bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-bold text-foreground dark:text-white mb-1">Distribuição por Categoria</p>
          <p className="text-xs text-muted-foreground mb-3">Total: 1.248 relatórios</p>
          <ResponsiveContainer width="100%" height={185}>
            <PieChart>
              <Pie
                data={CATEGORY_DATA} dataKey="value" cx="50%" cy="50%"
                innerRadius={50} outerRadius={78} paddingAngle={3}
                label={({ name, value }) => `${value}%`}
                labelLine={false}
              >
                {CATEGORY_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`, "Percentagem"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {CATEGORY_DATA.map(c => (
              <div key={c.name} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                <span className="text-[10px] text-muted-foreground">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SLA + Heatmap + Feed row ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* SLA Gauge */}
        <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center">
          <p className="text-sm font-bold text-foreground dark:text-white mb-3">Cumprimento SLA</p>
          <SLAGauge value={78.3} target={85} />
          <div className="mt-4 grid grid-cols-3 w-full gap-2 text-center">
            {[
              { label: "< 2 dias",  val: "52%", color: "text-green-600" },
              { label: "2–5 dias", val: "26%", color: "text-amber-500" },
              { label: "> 5 dias", val: "22%", color: "text-red-500"   },
            ].map(s => (
              <div key={s.label} className="bg-secondary dark:bg-zinc-800 rounded-lg p-2">
                <p className={cn("text-sm font-bold", s.color)}>{s.val}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap placeholder */}
        <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-foreground dark:text-white">Mapa de Densidade</p>
            <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">Leaflet-ready</span>
          </div>
          <div
            id="map-container"
            data-leaflet-center="-8.8370,13.2343"
            data-leaflet-zoom="13"
            className="flex-1 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-700 border border-dashed border-slate-300 dark:border-zinc-600 flex flex-col items-center justify-center gap-3 min-h-[180px] relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10">
              {/* Simulated heatmap dots */}
              {[
                [25,35,40],[55,45,30],[40,65,50],[70,40,35],[30,70,25],
                [60,25,20],[45,55,45],[80,60,15],[20,50,30],[65,75,20],
              ].map(([x,y,s],i) => (
                <div key={i} className="absolute rounded-full bg-red-500"
                  style={{ left:`${x}%`,top:`${y}%`,width:s,height:s,transform:"translate(-50%,-50%)" }} />
              ))}
            </div>
            <Map size={28} className="text-muted-foreground/60 relative z-10" />
            <div className="text-center relative z-10 px-4">
              <p className="text-xs font-semibold text-muted-foreground">Mapa Luanda · Mulenvos</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Integrar Leaflet.js com API <code className="bg-secondary px-1 rounded">/api/reports/heatmap</code>
              </p>
            </div>
          </div>
        </div>

        {/* Real-time feed */}
        <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-foreground dark:text-white">Feed em Tempo Real</p>
            <div className="flex items-center gap-1.5">
              <Wifi size={11} className="text-green-500" />
              <span className="text-[10px] text-muted-foreground">
                {lastRefresh.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] pr-1">
            {feed.map((item, i) => (
              <div key={`${item.id}-${i}`}
                className={cn(
                  "flex gap-2.5 p-2.5 rounded-lg border border-transparent",
                  i === 0 && "border-primary/20 bg-primary/5 dark:bg-primary/10"
                )}>
                <div className={cn("w-1.5 rounded-full flex-shrink-0 self-stretch min-h-[32px]", TIPO_COLOR[item.tipo as Category].split(" ")[1] || "bg-gray-200")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", TIPO_COLOR[item.tipo as Category])}>
                      {item.tipo}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.bairro}</span>
                  </div>
                  <p className="text-xs text-foreground dark:text-zinc-300 mt-0.5 truncate">{item.desc}</p>
                  <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{item.id} · {item.ago}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2 pt-2 border-t border-border dark:border-zinc-800">
            Actualização automática a cada 30 segundos
          </p>
        </div>
      </div>

      {/* ── Ticket table ────────────────────────────────────── */}
      <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">

        {/* Table header */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border dark:border-zinc-800">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Activity size={15} className="text-primary flex-shrink-0" />
            <p className="text-sm font-bold text-foreground dark:text-white">
              Gestão de Tickets
            </p>
            <span className="text-xs text-muted-foreground">({filteredTickets.length} de {MOCK_TICKETS.length})</span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Município", state: filterMuni,     set: setFilterMuni,     opts: MUNICIPALITIES.map(m => m.name) },
              { label: "Estado",   state: filterStatus,   set: setFilterStatus,   opts: STATUSES },
              { label: "Categoria",state: filterCategory, set: setFilterCategory, opts: CATEGORIES },
              { label: "Bairro",   state: filterBairro,   set: setFilterBairro,   opts: BAIRROS },
              { label: "SLA",      state: filterSLA,      set: setFilterSLA,      opts: ["OK","RISCO","EXPIRADO"] },
            ].map(f => (
              <div key={f.label} className="relative">
                <select
                  value={f.state}
                  onChange={e => f.set(e.target.value)}
                  className={cn(
                    "appearance-none text-xs font-medium pl-2.5 pr-7 py-1.5 rounded-lg border",
                    "border-border dark:border-zinc-700 bg-secondary dark:bg-zinc-800",
                    "text-foreground dark:text-zinc-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
                  )}
                  aria-label={`Filtrar por ${f.label}`}
                >
                  <option value="all">{f.label}</option>
                  {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            ))}

            {selected.size > 0 && (
              <button
                onClick={bulkAssign}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-1.5"
              >
                <Users size={12} />
                Atribuir {selected.size}
              </button>
            )}

            <button
              onClick={exportCSV}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border",
                "border-border dark:border-zinc-700 bg-secondary dark:bg-zinc-800",
                "text-foreground dark:text-zinc-200 hover:bg-secondary/80 transition-colors"
              )}
              aria-label="Exportar para CSV"
            >
              <Download size={13} />
              CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs" role="table" aria-label="Tabela de tickets">
            <thead>
              <tr className="border-b border-border dark:border-zinc-800 bg-secondary/50 dark:bg-zinc-800/50">
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={selected.size === filteredTickets.length && filteredTickets.length > 0}
                    onChange={toggleAll}
                    className="rounded border-border"
                    aria-label="Seleccionar todos"
                  />
                </th>
                {["Ticket ID","Tipo","Bairro","Descrição","Estado","SLA","Data","Responsável"].map(h => (
                  <th key={h} className="p-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTickets.slice(0, 15).map((t, i) => (
                <tr
                  key={t.id}
                  className={cn(
                    "border-b border-border/50 dark:border-zinc-800/60 hover:bg-secondary/30 dark:hover:bg-zinc-800/40 transition-colors",
                    selected.has(t.id) && "bg-primary/5 dark:bg-primary/10"
                  )}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="rounded border-border"
                      aria-label={`Seleccionar ticket ${t.id}`}
                    />
                  </td>
                  <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">{t.id}</td>
                  <td className="p-3">
                    <span className={cn("px-2 py-0.5 rounded-full font-semibold text-[10px]", TIPO_COLOR[t.tipo])}>
                      {t.tipo}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{t.bairro}</td>
                  <td className="p-3 max-w-[180px]">
                    <p className="truncate text-foreground dark:text-zinc-300">{t.descricao}</p>
                  </td>
                  <td className="p-3">
                    <span className={cn("px-2 py-0.5 rounded-full font-medium text-[10px]", STATUS_COLOR[t.status])}>
                      {t.status}
                    </span>
                  </td>
                  <td className={cn("p-3 font-bold whitespace-nowrap", SLA_COLOR[t.sla])}>
                    {t.sla}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{timeAgo(t.data)}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {t.assignee ?? <span className="italic opacity-50">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTickets.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Nenhum ticket encontrado com os filtros seleccionados.
          </div>
        )}

        {filteredTickets.length > 15 && (
          <div className="p-4 text-center text-xs text-muted-foreground border-t border-border dark:border-zinc-800">
            A mostrar 15 de {filteredTickets.length} tickets · Paginação a integrar com backend
          </div>
        )}
      </div>
    </div>
  );
}
