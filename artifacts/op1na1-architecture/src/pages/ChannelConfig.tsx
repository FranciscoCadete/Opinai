import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Radio, Wifi, WifiOff, AlertTriangle, Settings, Save, Plus,
  X, Eye, EyeOff, Clock, Zap, MessageSquare, Siren, Bell,
  CheckCircle2, ChevronDown, RotateCcw, Copy, Info,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────
type ChannelStatus = "online" | "offline" | "degradado";

interface ChannelCfg {
  apiKey: string;
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  webhookUrl: string;
  greeting: string;
  pageId: string;
  ussdCode: string;
  baseUrl: string;
  fcmKey: string;
}

interface Channel {
  id: string;
  name: string;
  emoji: string;
  enabled: boolean;
  status: ChannelStatus;
  latencyMs: number;
  sent24h: number;
  received24h: number;
  preference: number;   // % TCC study
  prefLabel: string;
  config: ChannelCfg;
}

interface SLARow {
  id: string;
  category: string;
  emoji: string;
  maxHours: number;
  escalateHours: number;
  color: string;
  editing: boolean;
}

interface CrisisConfig {
  enabled: boolean;
  volumeMultiplier: number;
  lookbackDays: number;
  keywords: string[];
  notifyEmail: string;
  notifyWhatsApp: string;
  cooldownMin: number;
}

interface Template {
  event: string;
  label: string;
  icon: string;
  channels: Record<string, string>;
}

// ─── Initial data ─────────────────────────────────────────────────
const CHANNELS_INIT: Channel[] = [
  {
    id: "whatsapp", name: "WhatsApp Business API", emoji: "💬",
    enabled: true,  status: "online", latencyMs: 142, sent24h: 1843, received24h: 947,
    preference: 29.4, prefLabel: "29,4% — líder (TCC, n=390)",
    config: {
      apiKey: "EAABxxxxxxxxxxxxxxxxxxxxx",
      accountSid: "", authToken: "", phoneNumber: "+244923000000",
      webhookUrl: "https://mulenvos.gv.ao/webhook/whatsapp",
      greeting: "Olá! Bem-vindo ao OP1NA1 — Mulenvos. Escreva o número da opção:\n1. Submeter ocorrência\n2. Consultar estado do meu pedido\n3. Falar com atendimento",
      pageId: "", ussdCode: "", baseUrl: "", fcmKey: "",
    },
  },
  {
    id: "sms", name: "SMS via Twilio", emoji: "📱",
    enabled: true, status: "online", latencyMs: 310, sent24h: 612, received24h: 0,
    preference: 15.0, prefLabel: "15,0% — 2.º canal preferido",
    config: {
      apiKey: "", accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      authToken: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      phoneNumber: "+12025551234",
      webhookUrl: "https://mulenvos.gv.ao/webhook/sms",
      greeting: "OP1NA1 Mulenvos: O seu pedido {{ticket_id}} foi registado. Responda ESTADO para consultar.",
      pageId: "", ussdCode: "", baseUrl: "", fcmKey: "",
    },
  },
  {
    id: "facebook", name: "Facebook Messenger", emoji: "🔵",
    enabled: false, status: "offline", latencyMs: 0, sent24h: 0, received24h: 0,
    preference: 12.0, prefLabel: "12,0% — 3.º canal",
    config: {
      apiKey: "", accountSid: "", authToken: "",
      phoneNumber: "", webhookUrl: "https://mulenvos.gv.ao/webhook/messenger",
      greeting: "Bem-vindo à página oficial do Município dos Mulenvos. Como podemos ajudar?",
      pageId: "100000000000000", ussdCode: "", baseUrl: "", fcmKey: "",
    },
  },
  {
    id: "portal", name: "Portal Web", emoji: "🌐",
    enabled: true, status: "online", latencyMs: 45, sent24h: 2301, received24h: 1102,
    preference: 20.0, prefLabel: "20,0% — acesso directo",
    config: {
      apiKey: "", accountSid: "", authToken: "", phoneNumber: "",
      webhookUrl: "",
      greeting: "Bem-vindo ao Portal de Participação Cidadã do Município dos Mulenvos.",
      pageId: "", ussdCode: "",
      baseUrl: "https://mulenvos.gv.ao", fcmKey: "",
    },
  },
  {
    id: "mobile", name: "App Móvel (Android/iOS)", emoji: "📲",
    enabled: true, status: "degradado", latencyMs: 890, sent24h: 421, received24h: 203,
    preference: 15.6, prefLabel: "15,6% — crescimento rápido",
    config: {
      apiKey: "", accountSid: "", authToken: "", phoneNumber: "", webhookUrl: "",
      greeting: "Notificação OP1NA1",
      pageId: "", ussdCode: "", baseUrl: "",
      fcmKey: "AAAA:APA91b_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    },
  },
  {
    id: "ussd", name: "USSD", emoji: "📟",
    enabled: false, status: "offline", latencyMs: 0, sent24h: 0, received24h: 0,
    preference: 8.0, prefLabel: "8,0% — zonas sem internet",
    config: {
      apiKey: "", accountSid: "", authToken: "", phoneNumber: "",
      webhookUrl: "https://mulenvos.gv.ao/webhook/ussd",
      greeting: "CON OP1NA1 Mulenvos\n1. Submeter ocorrência\n2. Consultar pedido\n0. Sair",
      pageId: "", ussdCode: "*384#", baseUrl: "", fcmKey: "",
    },
  },
];

const SLA_INIT: SLARow[] = [
  { id:"seg",  category:"Segurança",      emoji:"🚨", maxHours:2,  escalateHours:1,  color:"red",    editing:false },
  { id:"sau",  category:"Saúde Pública",  emoji:"🏥", maxHours:4,  escalateHours:2,  color:"orange", editing:false },
  { id:"amb",  category:"Ambiente",       emoji:"🌿", maxHours:24, escalateHours:12, color:"green",  editing:false },
  { id:"inf",  category:"Infraestrutura", emoji:"🏗️", maxHours:48, escalateHours:24, color:"blue",   editing:false },
  { id:"edu",  category:"Educação",       emoji:"📚", maxHours:72, escalateHours:48, color:"purple", editing:false },
];

const CRISIS_INIT: CrisisConfig = {
  enabled: true,
  volumeMultiplier: 3,
  lookbackDays: 7,
  keywords: ["inundação","cólera","violência","incêndio","epidemia","seca","acidente grave","explosão","colapso"],
  notifyEmail: "admin@mulenvos.gv.ao",
  notifyWhatsApp: "+244923000001",
  cooldownMin: 30,
};

const TEMPLATES_INIT: Template[] = [
  {
    event: "ticket_aberto", label: "Ticket Aberto", icon: "📬",
    channels: {
      whatsapp: "Olá {{nome}}! ✅ O seu relatório *{{ticket_id}}* foi registado com sucesso.\n📍 Bairro: {{bairro}}\n🏷️ Categoria: {{categoria}}\n\nAcompanhe o estado em: {{link_tracking}}\n\n_Município dos Mulenvos — OP1NA1_",
      sms:      "OP1NA1: Pedido {{ticket_id}} registado ({{categoria}}, {{bairro}}). Acompanhe: {{link_tracking}}",
      portal:   "O seu pedido {{ticket_id}} foi registado. Categoria: {{categoria}}. Bairro: {{bairro}}. Prazo SLA: {{sla_deadline}}.",
      mobile:   "📬 Pedido {{ticket_id}} recebido! Toque para acompanhar.",
      facebook: "Olá {{nome}}, o seu pedido {{ticket_id}} foi recebido com sucesso! Responderemos em {{sla_horas}}h.",
      ussd:     "END Pedido {{ticket_id}} registado. SLA: {{sla_horas}}h. Obrigado.",
    },
  },
  {
    event: "ticket_atribuido", label: "Ticket Atribuído", icon: "👤",
    channels: {
      whatsapp: "Olá {{nome}}! 👤 O seu pedido *{{ticket_id}}* foi atribuído ao técnico *{{tecnico}}*.\n\nPrazo de resolução: *{{sla_deadline}}*\n\n_Qualquer dúvida, responda a esta mensagem._",
      sms:      "OP1NA1: Pedido {{ticket_id}} atribuído a {{tecnico}}. Prazo: {{sla_deadline}}.",
      portal:   "O seu pedido foi atribuído ao técnico {{tecnico}}. Prazo: {{sla_deadline}}.",
      mobile:   "👤 Pedido {{ticket_id}} atribuído a {{tecnico}}.",
      facebook: "O seu pedido {{ticket_id}} está agora com o técnico {{tecnico}}. Prazo: {{sla_deadline}}.",
      ussd:     "END Pedido {{ticket_id}} atribuido. Tecnico: {{tecnico}}.",
    },
  },
  {
    event: "ticket_resolvido", label: "Ticket Resolvido", icon: "✅",
    channels: {
      whatsapp: "Olá {{nome}}! ✅ O seu pedido *{{ticket_id}}* foi *resolvido*.\n\n📝 Resolução: {{descricao_resolucao}}\n\nPor favor avalie o nosso serviço respondendo com um número de 1 a 5 ⭐\n\n_Obrigado por contribuir para uma Mulenvos melhor!_",
      sms:      "OP1NA1: Pedido {{ticket_id}} resolvido. Avalie (1-5): {{link_avaliacao}}",
      portal:   "O seu pedido {{ticket_id}} foi resolvido em {{data_resolucao}}. Obrigado pela participação!",
      mobile:   "✅ Pedido {{ticket_id}} resolvido! Avalie o serviço.",
      facebook: "Boas notícias, {{nome}}! O seu pedido {{ticket_id}} foi resolvido. Obrigado!",
      ussd:     "END Pedido {{ticket_id}} resolvido. Obrigado.",
    },
  },
  {
    event: "ticket_escalado", label: "Ticket Escalado", icon: "⚡",
    channels: {
      whatsapp: "Atenção {{nome}} ⚡ O pedido *{{ticket_id}}* foi *escalado* para resolução prioritária.\n\n⏰ SLA expirado em: {{sla_expiry}}\n👤 Escalado para: {{supervisor}}\n\nVai ser resolvido com a máxima urgência.",
      sms:      "OP1NA1 URGENTE: Pedido {{ticket_id}} escalado. Supervisor: {{supervisor}}.",
      portal:   "ALERTA: O pedido {{ticket_id}} excedeu o SLA e foi escalado para {{supervisor}}.",
      mobile:   "⚡ Pedido {{ticket_id}} escalado para resolução urgente.",
      facebook: "Pedido {{ticket_id}} escalado para resolução urgente. Supervisor notificado.",
      ussd:     "END Pedido {{ticket_id}} escalado. Contacte: {{telefone_suporte}}.",
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────
const STATUS_DOT: Record<ChannelStatus, string> = {
  online:   "bg-green-500",
  offline:  "bg-zinc-400",
  degradado:"bg-amber-400",
};
const STATUS_LABEL: Record<ChannelStatus, string> = {
  online:   "Online",
  offline:  "Offline",
  degradado:"Degradado",
};
const SLA_COLOR: Record<string, string> = {
  red:    "text-red-600 dark:text-red-400    bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-800",
  orange: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  green:  "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  blue:   "text-blue-600 dark:text-blue-400  bg-blue-50   dark:bg-blue-900/20   border-blue-200   dark:border-blue-800",
  purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
};

const CHANNEL_NAMES: Record<string, string> = {
  whatsapp:"WhatsApp", sms:"SMS", portal:"Portal Web",
  mobile:"App Móvel", facebook:"Facebook", ussd:"USSD",
};

const VARS = ["{{nome}}", "{{ticket_id}}", "{{bairro}}", "{{categoria}}", "{{tecnico}}", "{{supervisor}}", "{{sla_deadline}}", "{{sla_horas}}", "{{link_tracking}}", "{{descricao_resolucao}}", "{{data_resolucao}}"];

function Dot({ status }: { status: ChannelStatus }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === "online" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />}
      {status === "degradado" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />}
      <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", STATUS_DOT[status])} />
    </span>
  );
}

// ════════════════════════════════════════════════════════════════
export default function ChannelConfig() {
  const [tab,       setTab]       = useState<"canais"|"sla"|"crise"|"templates">("canais");
  const [channels,  setChannels]  = useState<Channel[]>(CHANNELS_INIT);
  const [sla,       setSla]       = useState<SLARow[]>(SLA_INIT);
  const [crisis,    setCrisis]    = useState<CrisisConfig>(CRISIS_INIT);
  const [templates, setTemplates] = useState<Template[]>(TEMPLATES_INIT);

  // Channel config modal
  const [editCh,    setEditCh]    = useState<Channel | null>(null);
  const [tmpCfg,    setTmpCfg]    = useState<ChannelCfg | null>(null);
  const [showKeys,  setShowKeys]  = useState<Record<string, boolean>>({});

  // Crisis
  const [newKw,     setNewKw]     = useState("");

  // Templates
  const [selEvent,  setSelEvent]  = useState("ticket_aberto");
  const [selCh,     setSelCh]     = useState("whatsapp");

  // Saved toast
  const [saved,     setSaved]     = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // Simulate random status fluctuation every 30s
  useEffect(() => {
    const t = setInterval(() => {
      setChannels(prev => prev.map(ch => {
        if (!ch.enabled) return ch;
        // Small random latency drift
        const drift = Math.floor((Math.random() - 0.5) * 40);
        return { ...ch, latencyMs: Math.max(30, ch.latencyMs + drift) };
      }));
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  function flashSaved() {
    setSaved(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSaved(false), 2500);
  }

  // ── Channel handlers ─────────────────────────────────────────────
  function toggleChannel(id: string) {
    setChannels(prev => prev.map(ch => {
      if (ch.id !== id) return ch;
      const enabled = !ch.enabled;
      return { ...ch, enabled, status: enabled ? "online" : "offline", latencyMs: enabled ? 200 : 0 };
    }));
  }

  function openConfig(ch: Channel) {
    setEditCh(ch);
    setTmpCfg({ ...ch.config });
  }

  function saveConfig() {
    if (!editCh || !tmpCfg) return;
    setChannels(prev => prev.map(ch => ch.id === editCh.id ? { ...ch, config: tmpCfg } : ch));
    setEditCh(null);
    setTmpCfg(null);
    flashSaved();
  }

  function toggleKey(field: string) {
    setShowKeys(prev => ({ ...prev, [field]: !prev[field] }));
  }

  // ── SLA handlers ─────────────────────────────────────────────────
  function startEdit(id: string) {
    setSla(prev => prev.map(r => ({ ...r, editing: r.id === id })));
  }
  function updateSLA(id: string, field: "maxHours" | "escalateHours", val: number) {
    setSla(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  }
  function saveSLA(id: string) {
    setSla(prev => prev.map(r => ({ ...r, editing: false })));
    flashSaved();
  }

  // ── Crisis handlers ──────────────────────────────────────────────
  function addKeyword() {
    const kw = newKw.trim().toLowerCase();
    if (!kw || crisis.keywords.includes(kw)) return;
    setCrisis(prev => ({ ...prev, keywords: [...prev.keywords, kw] }));
    setNewKw("");
  }
  function removeKeyword(kw: string) {
    setCrisis(prev => ({ ...prev, keywords: prev.keywords.filter(k => k !== kw) }));
  }
  function saveCrisis() { flashSaved(); }

  // ── Template handlers ────────────────────────────────────────────
  function updateTemplate(event: string, channel: string, text: string) {
    setTemplates(prev => prev.map(t =>
      t.event === event ? { ...t, channels: { ...t.channels, [channel]: text } } : t
    ));
  }
  function insertVar(v: string) {
    const tpl = templates.find(t => t.event === selEvent);
    if (!tpl) return;
    const current = tpl.channels[selCh] || "";
    updateTemplate(selEvent, selCh, current + v);
  }
  const currentTemplate = templates.find(t => t.event === selEvent);

  // ─────────────────────────────────────────────────────────────────
  const TABS = [
    { id: "canais",    label: "Canais Activos",        icon: Radio },
    { id: "sla",       label: "SLA por Categoria",     icon: Clock },
    { id: "crise",     label: "Alertas de Crise",      icon: Siren },
    { id: "templates", label: "Templates PT-AO",       icon: MessageSquare },
  ] as const;

  return (
    <div className="flex flex-col gap-4 min-h-0">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio size={20} className="text-primary" />
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Canais & Configuração SLA</h1>
            <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">ADMIN</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Gestão de canais de comunicação · SLA por categoria · Alertas de crise · Templates PT-AO
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium px-3 py-1.5 rounded-lg">
            <CheckCircle2 size={14} /> Guardado com sucesso
          </div>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-secondary/60 dark:bg-zinc-800/60 p-1 rounded-xl border border-border dark:border-zinc-700 w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-card dark:bg-zinc-900 text-foreground shadow-sm border border-border dark:border-zinc-700"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon size={13} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1 — CANAIS ACTIVOS
      ══════════════════════════════════════════════════════════ */}
      {tab === "canais" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {channels.map(ch => (
            <div key={ch.id} className={cn(
              "bg-card dark:bg-zinc-900 border rounded-2xl p-5 flex flex-col gap-3 shadow-sm transition-opacity",
              !ch.enabled && "opacity-60",
              ch.status === "degradado" ? "border-amber-300 dark:border-amber-700" :
              ch.enabled ? "border-border dark:border-zinc-700" : "border-border dark:border-zinc-800",
            )}>
              {/* Channel header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{ch.emoji}</span>
                  <div>
                    <p className="font-bold text-sm text-foreground leading-tight">{ch.name}</p>
                    <p className="text-[10px] text-muted-foreground">{ch.prefLabel}</p>
                  </div>
                </div>
                {/* Toggle */}
                <button onClick={() => toggleChannel(ch.id)}
                  className={cn(
                    "relative w-10 h-6 rounded-full transition-colors flex items-center px-1 flex-shrink-0",
                    ch.enabled ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-600"
                  )}>
                  <span className={cn(
                    "absolute w-4 h-4 bg-white rounded-full shadow transition-transform",
                    ch.enabled ? "translate-x-4" : "translate-x-0"
                  )} />
                </button>
              </div>

              {/* Status row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Dot status={ch.status} />
                  <span className={cn("text-xs font-semibold",
                    ch.status === "online"   ? "text-green-600 dark:text-green-400" :
                    ch.status === "degradado"? "text-amber-600 dark:text-amber-400" : "text-zinc-500"
                  )}>{STATUS_LABEL[ch.status]}</span>
                </div>
                {ch.enabled && ch.latencyMs > 0 && (
                  <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                    ch.latencyMs < 200 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                    ch.latencyMs < 600 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                                         "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  )}>{ch.latencyMs}ms</span>
                )}
              </div>

              {/* Stats */}
              {ch.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-secondary/50 dark:bg-zinc-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Enviados 24h</p>
                    <p className="text-sm font-bold text-foreground">{ch.sent24h.toLocaleString("pt")}</p>
                  </div>
                  <div className="bg-secondary/50 dark:bg-zinc-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Recebidos 24h</p>
                    <p className="text-sm font-bold text-foreground">{ch.received24h.toLocaleString("pt")}</p>
                  </div>
                </div>
              )}

              {/* Preference bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">Preferência cidadãos (TCC)</span>
                  <span className="text-[10px] font-bold text-foreground">{ch.preference}%</span>
                </div>
                <div className="h-1.5 bg-secondary dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(ch.preference / 30) * 100}%` }} />
                </div>
              </div>

              {/* Config button */}
              <button onClick={() => openConfig(ch)}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-border dark:border-zinc-700 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <Settings size={12} /> Configurar canal
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2 — SLA POR CATEGORIA
      ══════════════════════════════════════════════════════════ */}
      {tab === "sla" && (
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>Os prazos SLA são calculados em <strong>horas úteis</strong>. Ao exceder o prazo de escalada, o sistema notifica automaticamente o supervisor via WhatsApp e email.</span>
          </div>

          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 dark:bg-zinc-800/60">
                  {["Categoria","Tempo Máximo (h)","Escalada em (h)","Tempo restante visível",""].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-zinc-800">
                {sla.map(row => (
                  <tr key={row.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{row.emoji}</span>
                        <span className="font-semibold text-foreground">{row.category}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {row.editing ? (
                        <input type="number" min={1} max={720} value={row.maxHours}
                          onChange={e => updateSLA(row.id, "maxHours", Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded-lg border border-primary bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      ) : (
                        <span className={cn("text-sm font-bold px-2.5 py-1 rounded-lg border", SLA_COLOR[row.color])}>
                          {row.maxHours}h
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {row.editing ? (
                        <input type="number" min={1} max={row.maxHours - 1} value={row.escalateHours}
                          onChange={e => updateSLA(row.id, "escalateHours", Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded-lg border border-primary bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      ) : (
                        <span className="text-sm text-muted-foreground font-medium">{row.escalateHours}h</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-secondary dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", {
                            "bg-red-500":row.color==="red", "bg-orange-500":row.color==="orange",
                            "bg-green-500":row.color==="green","bg-blue-500":row.color==="blue","bg-purple-500":row.color==="purple",
                          })} style={{ width: `${Math.round((row.escalateHours / row.maxHours) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{Math.round((row.escalateHours / row.maxHours) * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {row.editing ? (
                        <button onClick={() => saveSLA(row.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors">
                          <Save size={11} /> Guardar
                        </button>
                      ) : (
                        <button onClick={() => startEdit(row.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                          <Settings size={11} /> Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SLA summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {sla.map(row => (
              <div key={row.id} className={cn("border rounded-xl p-3 text-center", SLA_COLOR[row.color])}>
                <span className="text-xl">{row.emoji}</span>
                <p className="text-xs font-semibold mt-1">{row.category}</p>
                <p className="text-2xl font-extrabold mt-0.5">{row.maxHours}h</p>
                <p className="text-[10px] opacity-70">max. resposta</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3 — ALERTAS DE CRISE
      ══════════════════════════════════════════════════════════ */}
      {tab === "crise" && (
        <div className="space-y-4">
          {/* Enable toggle */}
          <div className={cn(
            "border rounded-2xl p-5 flex items-start justify-between gap-4",
            crisis.enabled
              ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
              : "bg-card dark:bg-zinc-900 border-border dark:border-zinc-700"
          )}>
            <div className="flex items-center gap-3">
              <Siren size={22} className={crisis.enabled ? "text-red-600 dark:text-red-400" : "text-muted-foreground"} />
              <div>
                <p className="font-bold text-foreground">Sistema de Detecção de Crises</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Monitora volume de ocorrências por bairro e palavras-chave críticas em tempo real.
                </p>
              </div>
            </div>
            <button onClick={() => setCrisis(p => ({ ...p, enabled: !p.enabled }))}
              className={cn("relative w-12 h-6 rounded-full transition-colors flex items-center px-1 flex-shrink-0",
                crisis.enabled ? "bg-red-500" : "bg-zinc-300 dark:bg-zinc-600")}>
              <span className={cn("absolute w-4 h-4 bg-white rounded-full shadow transition-transform",
                crisis.enabled ? "translate-x-6" : "translate-x-0")} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Volume threshold */}
            <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Zap size={15} className="text-amber-500" /> Threshold de Volume Anormal
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Multiplicador (× média histórica)
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={1.5} max={10} step={0.5} value={crisis.volumeMultiplier}
                      onChange={e => setCrisis(p => ({ ...p, volumeMultiplier: Number(e.target.value) }))}
                      className="flex-1 accent-primary" />
                    <span className="text-xl font-extrabold text-primary w-12 text-center">
                      {crisis.volumeMultiplier}×
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Crise activada quando volume do bairro excede {crisis.volumeMultiplier}× a média dos últimos {crisis.lookbackDays} dias.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Janela de referência (dias)
                  </label>
                  <div className="flex items-center gap-2">
                    {[3, 7, 14, 30].map(d => (
                      <button key={d} onClick={() => setCrisis(p => ({ ...p, lookbackDays: d }))}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors",
                          crisis.lookbackDays === d
                            ? "bg-primary text-white border-primary"
                            : "border-border text-muted-foreground hover:bg-secondary"
                        )}>{d}d</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Cooldown entre alertas (min)
                  </label>
                  <input type="number" min={5} max={240} value={crisis.cooldownMin}
                    onChange={e => setCrisis(p => ({ ...p, cooldownMin: Number(e.target.value) }))}
                    className="w-24 px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Bell size={15} className="text-blue-500" /> Contactos de Alerta
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Email de notificação</label>
                  <input value={crisis.notifyEmail}
                    onChange={e => setCrisis(p => ({ ...p, notifyEmail: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">WhatsApp de alerta</label>
                  <input value={crisis.notifyWhatsApp}
                    onChange={e => setCrisis(p => ({ ...p, notifyWhatsApp: e.target.value }))}
                    placeholder="+244 9XX XXX XXX"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <button onClick={saveCrisis}
                  className="flex items-center gap-1.5 w-full justify-center py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
                  <Save size={13} /> Guardar Contactos
                </button>
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-500" />
                Palavras-Chave Críticas
                <span className="text-xs bg-secondary dark:bg-zinc-700 text-muted-foreground px-2 py-0.5 rounded-full font-medium ml-1">
                  {crisis.keywords.length} activas
                </span>
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Qualquer ocorrência contendo estas palavras dispara alerta imediato ao supervisor, independentemente do volume.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {crisis.keywords.map(kw => (
                <span key={kw} className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {kw}
                  <button onClick={() => removeKeyword(kw)} className="hover:opacity-70">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input value={newKw} onChange={e => setNewKw(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addKeyword()}
                placeholder="Adicionar palavra-chave…"
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button onClick={addKeyword}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
                <Plus size={13} /> Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4 — TEMPLATES PT-AO
      ══════════════════════════════════════════════════════════ */}
      {tab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Left: event + channel selector */}
          <div className="space-y-3">
            {/* Events */}
            <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl overflow-hidden">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-2">Evento</p>
              {templates.map(t => (
                <button key={t.event} onClick={() => setSelEvent(t.event)}
                  className={cn("flex items-center gap-2.5 w-full px-4 py-3 text-sm font-medium transition-colors border-b border-border/50 dark:border-zinc-800/50 last:border-0",
                    selEvent === t.event ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}>
                  <span className="text-base">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Channels */}
            <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl overflow-hidden">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-2">Canal</p>
              {Object.keys(CHANNEL_NAMES).map(cid => {
                const ch = channels.find(c => c.id === cid);
                return (
                  <button key={cid} onClick={() => setSelCh(cid)}
                    className={cn("flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium transition-colors border-b border-border/50 dark:border-zinc-800/50 last:border-0",
                      selCh === cid ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}>
                    <span>{CHANNEL_NAMES[cid]}</span>
                    {ch && <Dot status={ch.status} />}
                  </button>
                );
              })}
            </div>

            {/* Variables */}
            <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Variáveis disponíveis</p>
              <div className="flex flex-wrap gap-1.5">
                {VARS.map(v => (
                  <button key={v} onClick={() => insertVar(v)}
                    className="text-[10px] font-mono bg-secondary dark:bg-zinc-700 hover:bg-primary/10 hover:text-primary text-muted-foreground px-2 py-1 rounded font-medium transition-colors">
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Clique para inserir no template activo.</p>
            </div>
          </div>

          {/* Right: template editor */}
          <div className="md:col-span-2">
            {currentTemplate && (
              <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl p-5 h-full flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground">
                      {currentTemplate.icon} {currentTemplate.label} — {CHANNEL_NAMES[selCh]}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Template enviado via <strong>{CHANNEL_NAMES[selCh]}</strong> quando este evento ocorre.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      navigator.clipboard?.writeText(currentTemplate.channels[selCh] || "");
                    }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                      <Copy size={11} /> Copiar
                    </button>
                    <button onClick={() => {
                      // Reset to original
                      const original = TEMPLATES_INIT.find(t => t.event === selEvent);
                      if (original) updateTemplate(selEvent, selCh, original.channels[selCh] || "");
                    }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                      <RotateCcw size={11} /> Repor
                    </button>
                    <button onClick={flashSaved}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors">
                      <Save size={11} /> Guardar
                    </button>
                  </div>
                </div>

                {/* Character count hint by channel */}
                <div className="text-xs text-muted-foreground bg-secondary/40 dark:bg-zinc-800/40 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Info size={12} className="flex-shrink-0" />
                  {selCh === "sms"  && "SMS: máximo 160 caracteres por mensagem (concatenar se necessário)"}
                  {selCh === "ussd" && "USSD: máximo 182 caracteres. Inicie com CON (continua) ou END (termina sessão)."}
                  {selCh === "whatsapp" && "WhatsApp: suporta *negrito*, _itálico_ e emojis. Máximo 4.096 caracteres."}
                  {selCh === "mobile" && "Push notification: título ≤ 50 chars, corpo ≤ 100 chars."}
                  {selCh === "portal" && "Portal web: texto plano ou HTML. Aparece no banner de notificação."}
                  {selCh === "facebook" && "Messenger: texto simples, máximo 2.000 caracteres."}
                </div>

                {/* Textarea editor */}
                <textarea
                  value={currentTemplate.channels[selCh] || ""}
                  onChange={e => updateTemplate(selEvent, selCh, e.target.value)}
                  rows={10}
                  className="flex-1 w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />

                {/* Character count */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {(currentTemplate.channels[selCh] || "").length} caracteres
                    {selCh === "sms" && (currentTemplate.channels[selCh] || "").length > 160 && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">
                        · {Math.ceil((currentTemplate.channels[selCh] || "").length / 153)} segmentos SMS
                      </span>
                    )}
                  </span>
                  <span className="font-mono">
                    {VARS.filter(v => (currentTemplate.channels[selCh] || "").includes(v)).length} variável(is) inserida(s)
                  </span>
                </div>

                {/* Preview (replace vars with examples) */}
                <div className="border border-border dark:border-zinc-700 rounded-xl p-4 bg-secondary/20 dark:bg-zinc-800/30">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Pré-visualização com dados de exemplo</p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {(currentTemplate.channels[selCh] || "")
                      .replace(/\{\{nome\}\}/g,              "João Mendes")
                      .replace(/\{\{ticket_id\}\}/g,         "OP1-A3F2B9")
                      .replace(/\{\{bairro\}\}/g,            "KM 9-B")
                      .replace(/\{\{categoria\}\}/g,         "Infraestrutura")
                      .replace(/\{\{tecnico\}\}/g,           "Filomena Paulo")
                      .replace(/\{\{supervisor\}\}/g,        "Maria Lopes")
                      .replace(/\{\{sla_deadline\}\}/g,      "09/05/2025 18:00")
                      .replace(/\{\{sla_horas\}\}/g,         "48")
                      .replace(/\{\{sla_expiry\}\}/g,        "08/05/2025 14:00")
                      .replace(/\{\{link_tracking\}\}/g,     "mulenvos.gv.ao/track/OP1-A3F2B9")
                      .replace(/\{\{link_avaliacao\}\}/g,    "mulenvos.gv.ao/rate/OP1-A3F2B9")
                      .replace(/\{\{descricao_resolucao\}\}/g,"Buraco tapado pela brigada de obras.")
                      .replace(/\{\{data_resolucao\}\}/g,    "09/05/2025")
                      .replace(/\{\{telefone_suporte\}\}/g,  "+244 222 000 001")
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          CHANNEL CONFIG MODAL
      ══════════════════════════════════════════════════════════ */}
      {editCh && tmpCfg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditCh(null)} />
          <div className="relative bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-zinc-700 sticky top-0 bg-card dark:bg-zinc-900 z-10">
              <div className="flex items-center gap-2">
                <span className="text-xl">{editCh.emoji}</span>
                <div>
                  <h3 className="font-bold text-foreground">Configurar — {editCh.name}</h3>
                  <p className="text-xs text-muted-foreground">Credenciais e parâmetros do canal</p>
                </div>
              </div>
              <button onClick={() => setEditCh(null)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><X size={15} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* WhatsApp specific */}
              {editCh.id === "whatsapp" && (
                <>
                  <Field label="API Token (WhatsApp Business)" value={tmpCfg.apiKey} masked field="apiKey"
                    showKeys={showKeys} toggleKey={toggleKey}
                    onChange={v => setTmpCfg(p => p ? {...p, apiKey: v} : p)} />
                  <Field label="Phone Number ID" value={tmpCfg.phoneNumber}
                    onChange={v => setTmpCfg(p => p ? {...p, phoneNumber: v} : p)} />
                </>
              )}
              {/* SMS Twilio */}
              {editCh.id === "sms" && (
                <>
                  <Field label="Account SID" value={tmpCfg.accountSid} masked field="accountSid"
                    showKeys={showKeys} toggleKey={toggleKey}
                    onChange={v => setTmpCfg(p => p ? {...p, accountSid: v} : p)} />
                  <Field label="Auth Token" value={tmpCfg.authToken} masked field="authToken"
                    showKeys={showKeys} toggleKey={toggleKey}
                    onChange={v => setTmpCfg(p => p ? {...p, authToken: v} : p)} />
                  <Field label="Número Twilio (From)" value={tmpCfg.phoneNumber}
                    onChange={v => setTmpCfg(p => p ? {...p, phoneNumber: v} : p)} />
                </>
              )}
              {/* Facebook */}
              {editCh.id === "facebook" && (
                <>
                  <Field label="Page Access Token" value={tmpCfg.apiKey} masked field="fbToken"
                    showKeys={showKeys} toggleKey={toggleKey}
                    onChange={v => setTmpCfg(p => p ? {...p, apiKey: v} : p)} />
                  <Field label="Page ID" value={tmpCfg.pageId}
                    onChange={v => setTmpCfg(p => p ? {...p, pageId: v} : p)} />
                </>
              )}
              {/* App Móvel */}
              {editCh.id === "mobile" && (
                <Field label="FCM Server Key" value={tmpCfg.fcmKey} masked field="fcmKey"
                  showKeys={showKeys} toggleKey={toggleKey}
                  onChange={v => setTmpCfg(p => p ? {...p, fcmKey: v} : p)} />
              )}
              {/* Portal */}
              {editCh.id === "portal" && (
                <Field label="Base URL" value={tmpCfg.baseUrl}
                  onChange={v => setTmpCfg(p => p ? {...p, baseUrl: v} : p)} />
              )}
              {/* USSD */}
              {editCh.id === "ussd" && (
                <Field label="Código USSD" value={tmpCfg.ussdCode}
                  onChange={v => setTmpCfg(p => p ? {...p, ussdCode: v} : p)} />
              )}

              {/* Webhook (shared) */}
              {tmpCfg.webhookUrl !== undefined && editCh.id !== "portal" && (
                <Field label="Webhook URL" value={tmpCfg.webhookUrl}
                  onChange={v => setTmpCfg(p => p ? {...p, webhookUrl: v} : p)} />
              )}

              {/* Greeting */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Mensagem de Saudação (PT-AO)
                </label>
                <textarea rows={4} value={tmpCfg.greeting}
                  onChange={e => setTmpCfg(p => p ? {...p, greeting: e.target.value} : p)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border dark:border-zinc-700 sticky bottom-0 bg-card dark:bg-zinc-900">
              <button onClick={() => setEditCh(null)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={saveConfig}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
                <Save size={13} /> Guardar Configuração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Field component ──────────────────────────────────────────────
function Field({
  label, value, onChange, masked = false, field = "", showKeys = {}, toggleKey,
}: {
  label: string; value: string; onChange: (v: string) => void;
  masked?: boolean; field?: string; showKeys?: Record<string, boolean>;
  toggleKey?: (f: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={masked && !showKeys[field] ? "password" : "text"}
          value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 pr-9"
        />
        {masked && toggleKey && (
          <button onClick={() => toggleKey(field)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showKeys[field] ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}
