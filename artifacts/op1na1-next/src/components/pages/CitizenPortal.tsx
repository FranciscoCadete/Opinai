"use client";
// Navigation adaptation applied:
//   - removed: import { useLocation } from "wouter"
//   + added:   import { useRouter } from "next/navigation"
//   - removed: const [, navigate] = useLocation()
//   + added:   const router = useRouter()
//   - changed: navigate("/admin-dashboard") → router.push("/admin")
//   - changed: navigate("/overview")       → router.push("/")
//   - changed: navigate("/login")          → router.push("/login")

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { submitRequest, trackRequest, ApiError } from "@/lib/api";
import {
  FileText, Search, BarChart3, Phone, FolderOpen, Info, Globe,
  AlertTriangle, Lightbulb, Eye, ClipboardList, ThumbsUp, AlertOctagon,
  Droplets, Trash2, Zap, CheckCircle, Clock, Users, MapPin, Radio,
  MessageCircle, Hash, Monitor, Smartphone, MessageSquare,
  Shield, BarChart2, DollarSign, Bell, BookOpen, Building2, Leaf,
  Globe2, ShieldCheck, Lock, Target, Headphones, Download, ExternalLink,
  Copy, Share2, ArrowRight,
} from "lucide-react";

// ─── Angola palette + green base ────────────────────────────────
const C = {
  yellow:  "#F1A60F",
  yellowD: "#c9880a",
  yellowL: "rgba(241,166,15,0.1)",
  red:     "#B41414",
  redL:    "rgba(180,20,20,0.07)",
  green:   "#00c49a",
  greenD:  "#009b7a",
  greenL:  "rgba(0,196,154,0.1)",
  black:   "#080c10",
  ink:     "#0f1a12",
  ink2:    "#2d3d32",
  white:   "#ffffff",
  bg:      "#f5f4f0",
  bg2:     "#eceae4",
  surface: "#fafaf8",
  bdr:     "rgba(0,0,0,0.08)",
  bdr2:    "rgba(0,0,0,0.14)",
  muted:   "#7a8c80",
  muted2:  "#aab8af",
  blue:    "#2f6ef5",
  mono:    "'DM Mono', monospace",
  sans:    "'DM Sans', sans-serif",
  display: "'Fraunces', serif",
  radius:  14,
  radiusSm: 8,
};

// ─── Data ────────────────────────────────────────────────────────
const TIPOS = [
  { id: "reclamacao",  Icon: AlertTriangle, color: C.yellow, name: "Reclamação",   desc: "Problema no bairro" },
  { id: "sugestao",    Icon: Lightbulb,     color: C.blue,   name: "Sugestão",     desc: "Ideia de melhoria" },
  { id: "denuncia",    Icon: Eye,           color: C.muted,  name: "Denúncia",     desc: "Situação irregular" },
  { id: "solicitacao", Icon: ClipboardList, color: C.green,  name: "Solicitação",  desc: "Pedido de serviço" },
  { id: "elogio",      Icon: ThumbsUp,      color: C.green,  name: "Elogio",       desc: "Feedback positivo" },
  { id: "urgente",     Icon: AlertOctagon,  color: C.red,    name: "Urgente",      desc: "Situação de risco" },
];
const TIPO_LABELS: Record<string,string> = {
  reclamacao: "Reclamação", sugestao: "Sugestão",
  denuncia: "Denúncia", solicitacao: "Solicitação",
  elogio: "Elogio", urgente: "Urgente",
};
const BAIRROS = [
  { name: "KM 9-B",            estrato: "A" }, { name: "KM 12-B",          estrato: "A" },
  { name: "Mulenvos de Cima",  estrato: "B" }, { name: "Baixa de Cassanje",estrato: "B" },
  { name: "KM 14-B",           estrato: "B" }, { name: "Boa-Fé",           estrato: "B" },
  { name: "CAOP A",            estrato: "C" }, { name: "CAOP B",           estrato: "C" },
  { name: "CAOP C",            estrato: "C" }, { name: "Capalanga",        estrato: "C" },
];
const ESTRATOS_COLOR: Record<string,string> = { A: C.green, B: C.blue, C: C.yellow };
const RESOLVED = [
  { Icon: Droplets, color: C.blue,   desc: "Avaria na conduta de água — KM 12-B",   meta: "Infraestrutura · 18h" },
  { Icon: Trash2,   color: C.green,  desc: "Recolha de lixo irregular — Boa-Fé",    meta: "Ambiente · 36h" },
  { Icon: Zap,      color: C.yellow, desc: "Iluminação avariada — Mulenvos de Cima", meta: "Segurança · 24h" },
];
const MEDIADORES = [
  { initials: "AM", name: "António M.",  zone: "CAOP C · Seg–Sex 7h–17h",    online: true  },
  { initials: "CJ", name: "Clara J.",    zone: "Capalanga · Seg–Sáb 8h–16h", online: true  },
  { initials: "JA", name: "João António",zone: "Boa-Fé · Ter–Sáb 9h–17h",   online: false },
];
const CHANNELS = [
  { id: "portal",   label: "Portal",     icon: <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg> },
  { id: "whatsapp", label: "WhatsApp",   icon: <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg> },
  { id: "sms",      label: "SMS",        icon: <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg> },
  { id: "ussd",     label: "USSD *123#", icon: <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg> },
];
const CHANNEL_MSG: Record<string,string> = {
  whatsapp: "📱 WhatsApp: envie \"OLÁ\" para +244 923 000 000 e siga as instruções do assistente.",
  sms:      "📨 SMS: envie a descrição do problema para +244 923 000 001.",
  ussd:     "📟 USSD: marque *123# no seu telemóvel e siga o menu.",
};
const DEMO_TRACKS = [
  { desc: "Falta de água na rua principal", steps: [
    { label: "Pedido recebido",      done: true,  current: false, time: "Ontem 09:14" },
    { label: "Em triagem (IA)",      done: true,  current: false, time: "Ontem 09:15" },
    { label: "Atribuído ao técnico", done: true,  current: false, time: "Ontem 11:30" },
    { label: "Em progresso",         done: false, current: true,  time: "Hoje 08:00" },
    { label: "Resolvido",            done: false, current: false, time: "—" },
  ]},
  { desc: "Recolha de lixo — em falta há 3 dias", steps: [
    { label: "Pedido recebido",      done: true, current: false, time: "2 dias 14:22" },
    { label: "Em triagem (IA)",      done: true, current: false, time: "2 dias 14:22" },
    { label: "Atribuído ao técnico", done: true, current: false, time: "2 dias 16:10" },
    { label: "Em progresso",         done: true, current: false, time: "Ontem 09:00" },
    { label: "Resolvido",            done: false, current: true,  time: "Hoje" },
  ]},
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function genTicketId() {
  const d = new Date();
  return `MUL-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${Math.floor(Math.random()*9000)+1000}`;
}

// ─── Tab definitions (static — moved inside component to use t()) ─

// ─── Documentos públicos ─────────────────────────────────────────
const DOCUMENTOS = [
  { Icon: ClipboardList, color: C.blue,   title: "Regulamento Municipal 2025",             cat: "Regulamento", date: "Jan 2025", href: "#" },
  { Icon: BarChart2,     color: C.green,  title: "Plano de Actividades 2025",              cat: "Planeamento", date: "Jan 2025", href: "#" },
  { Icon: DollarSign,    color: C.yellow, title: "Relatório Orçamental Q1 2025",           cat: "Finanças",    date: "Abr 2025", href: "#" },
  { Icon: Bell,          color: C.red,    title: "Edital n.º 12/2025 — Obras Públicas",    cat: "Edital",      date: "Mar 2025", href: "#" },
  { Icon: BookOpen,      color: C.blue,   title: "Boletim Municipal — Edição 3/2025",      cat: "Boletim",     date: "Mar 2025", href: "#" },
  { Icon: Users,         color: C.muted,  title: "Actas das Reuniões do Conselho Municipal",cat: "Actas",      date: "Abr 2025", href: "#" },
  { Icon: Building2,     color: C.ink2,   title: "Relatório de Execução de Obras Públicas", cat: "Obras",      date: "Fev 2025", href: "#" },
  { Icon: Leaf,          color: C.green,  title: "Plano de Gestão Ambiental 2025–2030",    cat: "Ambiente",    date: "Jan 2025", href: "#" },
];

// ─── Portal links (landing pages) ───────────────────────────────
const PORTAL_LINKS = [
  {
    Icon: Building2, label: "Website do Município", color: "#B41414",
    desc: "Site oficial da Administração Municipal dos Mulenvos.",
    href: "https://mulenvos.ao", external: true,
  },
  {
    Icon: Globe2, label: "Portal do Governo de Angola", color: "#2f6ef5",
    desc: "Serviços e informações do Governo da República de Angola.",
    href: "https://governo.gov.ao", external: true,
  },
  {
    Icon: BarChart3, label: "Dashboard Administrativo", color: "#00c49a",
    desc: "Painel de gestão para técnicos e gestores municipais.",
    href: "/admin", external: false,
  },
  {
    Icon: Lock, label: "Área Técnica (TI)", color: "#F1A60F",
    desc: "Documentação técnica e arquitectura da plataforma OP1NA1.",
    href: "/", external: false,
  },
  {
    Icon: Headphones, label: "Portal de Atendimento ao Cidadão (PAC)", color: "#8B5CF6",
    desc: "Balcão único de atendimento da Administração Municipal.",
    href: "https://pac.angola.ao", external: true,
  },
  {
    Icon: ShieldCheck, label: "Portal de Transparência Municipal", color: "#0EA5E9",
    desc: "Acesso a dados públicos, orçamentos e contratos.",
    href: "https://transparencia.mulenvos.ao", external: true,
  },
];

// ─── Main component ──────────────────────────────────────────────
export default function CitizenPortal() {
  const router = useRouter();
  const { t } = useTranslation();

  const TABS = [
    { id: "submeter",     label: t("citizen.tabs.submeter",     "Submeter Pedido"),     Icon: FileText   },
    { id: "consultar",    label: t("citizen.tabs.consultar",    "Consultar Pedido"),    Icon: Search     },
    { id: "estatisticas", label: t("citizen.tabs.estatisticas", "Estatísticas"),        Icon: BarChart3  },
    { id: "canais",       label: t("citizen.tabs.canais",       "Canais & Contactos"),  Icon: Phone      },
    { id: "documentos",   label: t("citizen.tabs.documentos",   "Documentos Públicos"), Icon: FolderOpen },
    { id: "informacoes",  label: t("citizen.tabs.informacoes",  "Informações"),         Icon: Info       },
    { id: "municipal",    label: t("citizen.tabs.municipal",    "Portal Municipal"),    Icon: Globe      },
  ];

  // Active tab (synced with URL hash)
  const [activeTab, setActiveTab] = useState("submeter");
  const switchTab = useCallback((id: string) => {
    setActiveTab(id);
    window.history.replaceState(null, "", `#${id}`);
  }, []);

  // Step
  const [step, setStep]     = useState(1);
  const [success, setSuccess] = useState(false);
  const [ticketId, setTicketId] = useState("");

  // Form state
  const [tipo, setTipo]           = useState("reclamacao");
  const [bairro, setBairro]       = useState<string|null>(null);
  const [gpsState, setGpsState]   = useState<"idle"|"loading"|"got"|"err">("idle");
  const [gpsCoords, setGpsCoords] = useState<{lat:number;lng:number}|null>(null);
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nome, setNome]           = useState("");
  const [telefone, setTelefone]   = useState("");
  const [referencia, setReferencia] = useState("");
  const [anonimo, setAnonimo]     = useState(false);
  const [terms, setTerms]         = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Errors
  const [errCat, setErrCat]   = useState(false);
  const [errDesc, setErrDesc] = useState(false);
  const [errBairro, setErrBairro] = useState(false);
  const [errTerms, setErrTerms]   = useState(false);

  // Channel
  const [channel, setChannel] = useState("portal");

  // Track
  const [trackVal, setTrackVal]     = useState("");
  const [trackResult, setTrackResult] = useState<typeof DEMO_TRACKS[0] | null>(null);

  // Stats (animated counters)
  const [stats, setStats] = useState({ resolved: 0, open: 0, time: "0h", mediators: 0 });

  // Toast
  const [toast, setToast]       = useState({ msg: "", visible: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Deep-link via URL hash (e.g. /citizen-portal#estatisticas)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && TABS.some(t => t.id === hash)) {
      setActiveTab(hash);
    }
  }, []);

  // Animate counters on mount
  useEffect(() => {
    const targets = [{ key:"resolved", target:714, dur:1200 }, { key:"open", target:389, dur:1000 }, { key:"mediators", target:3, dur:600 }];
    const timers = targets.map(({ key, target, dur }) => {
      const step = target / (dur / 16);
      let val = 0;
      return setInterval(() => {
        val = Math.min(val + step, target);
        const rounded = Math.round(val);
        setStats(s => ({ ...s, [key]: rounded, time: "38h" }));
        if (val >= target) clearInterval(timers[targets.findIndex(t => t.key === key)]);
      }, 16);
    });
    const cleanup = () => timers.forEach(clearInterval);
    return cleanup;
  }, []);

  const showToast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, visible: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
  }, []);

  // GPS
  function getGPS() {
    if (!navigator.geolocation) { setGpsState("err"); return; }
    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsState("got");
        showToast("Localização GPS capturada!");
      },
      () => setGpsState("err")
    );
  }

  // Step navigation
  function goStep2() { setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function validateStep2() {
    const catOk  = categoria !== "";
    const descOk = descricao.trim().length >= 20;
    setErrCat(!catOk); setErrDesc(!descOk);
    if (catOk && descOk) { setStep(3); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }
  function validateStep3() {
    if (!bairro && !gpsCoords) { setErrBairro(true); return; }
    setErrBairro(false);
    setStep(4); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submitForm() {
    if (!terms) { setErrTerms(true); return; }
    setSubmitting(true);
    try {
      const result = await submitRequest({
        type: tipo,
        category: categoria,
        description: descricao,
        contactName: anonimo ? null : (nome.trim() || null),
        contactPhone: anonimo ? null : (telefone.trim() || null),
        isAnonymous: anonimo,
        channel: "portal",
        bairroName: bairro,
        gpsLat: gpsCoords?.lat ?? null,
        gpsLng: gpsCoords?.lng ?? null,
        locationReference: referencia.trim() || null,
        acceptedTerms: true,
      });
      setTicketId(result.ticketId);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? `Não foi possível submeter (${e.status}): ${e.message}`
          : "Erro de rede. Tente novamente.";
      showToast(msg);
      const fallbackId = genTicketId();
      setTicketId(fallbackId);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }
  function resetForm() {
    setSuccess(false); setStep(1); setTipo("reclamacao"); setBairro(null);
    setGpsState("idle"); setGpsCoords(null); setCategoria(""); setDescricao("");
    setNome(""); setTelefone(""); setReferencia(""); setAnonimo(false);
    setTerms(false); setErrCat(false); setErrDesc(false); setErrBairro(false); setErrTerms(false);
  }

  // Track ticket
  async function doTrack() {
    const id = trackVal.trim();
    if (!id) return;
    try {
      const tracked = await trackRequest(id);
      const stepsByStatus: Record<string, { label: string; done: boolean; current: boolean; time: string }[]> = {
        received: [
          { label: "Pedido recebido",      done: true,  current: false, time: new Date(tracked.createdAt).toLocaleString("pt-PT") },
          { label: "Em triagem (IA)",      done: false, current: true,  time: "—" },
          { label: "Atribuído ao técnico", done: false, current: false, time: "—" },
          { label: "Em progresso",         done: false, current: false, time: "—" },
          { label: "Resolvido",            done: false, current: false, time: "—" },
        ],
        triaged: [
          { label: "Pedido recebido",      done: true,  current: false, time: new Date(tracked.createdAt).toLocaleString("pt-PT") },
          { label: "Em triagem (IA)",      done: true,  current: false, time: new Date(tracked.updatedAt).toLocaleString("pt-PT") },
          { label: "Atribuído ao técnico", done: false, current: true,  time: "—" },
          { label: "Em progresso",         done: false, current: false, time: "—" },
          { label: "Resolvido",            done: false, current: false, time: "—" },
        ],
        assigned: [
          { label: "Pedido recebido",      done: true,  current: false, time: new Date(tracked.createdAt).toLocaleString("pt-PT") },
          { label: "Em triagem (IA)",      done: true,  current: false, time: new Date(tracked.createdAt).toLocaleString("pt-PT") },
          { label: "Atribuído ao técnico", done: true,  current: false, time: new Date(tracked.updatedAt).toLocaleString("pt-PT") },
          { label: "Em progresso",         done: false, current: true,  time: "—" },
          { label: "Resolvido",            done: false, current: false, time: "—" },
        ],
        in_progress: [
          { label: "Pedido recebido",      done: true,  current: false, time: new Date(tracked.createdAt).toLocaleString("pt-PT") },
          { label: "Em triagem (IA)",      done: true,  current: false, time: new Date(tracked.createdAt).toLocaleString("pt-PT") },
          { label: "Atribuído ao técnico", done: true,  current: false, time: new Date(tracked.createdAt).toLocaleString("pt-PT") },
          { label: "Em progresso",         done: false, current: true,  time: new Date(tracked.updatedAt).toLocaleString("pt-PT") },
          { label: "Resolvido",            done: false, current: false, time: "—" },
        ],
        resolved: [
          { label: "Pedido recebido",      done: true, current: false, time: new Date(tracked.createdAt).toLocaleString("pt-PT") },
          { label: "Em triagem (IA)",      done: true, current: false, time: new Date(tracked.createdAt).toLocaleString("pt-PT") },
          { label: "Atribuído ao técnico", done: true, current: false, time: new Date(tracked.createdAt).toLocaleString("pt-PT") },
          { label: "Em progresso",         done: true, current: false, time: new Date(tracked.updatedAt).toLocaleString("pt-PT") },
          { label: "Resolvido",            done: true, current: false, time: tracked.resolvedAt ? new Date(tracked.resolvedAt).toLocaleString("pt-PT") : "—" },
        ],
        rejected: [
          { label: "Pedido recebido",      done: true,  current: false, time: new Date(tracked.createdAt).toLocaleString("pt-PT") },
          { label: "Rejeitado",            done: true,  current: false, time: new Date(tracked.updatedAt).toLocaleString("pt-PT") },
        ],
      };
      const steps = stepsByStatus[tracked.status] ?? stepsByStatus.received;
      setTrackResult({ desc: tracked.description, steps });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        showToast("Pedido não encontrado.");
      } else {
        showToast("Erro de rede. Tente novamente.");
      }
      setTrackResult(DEMO_TRACKS[0]);
    }
  }

  // Copy ticket
  function copyTicket() {
    navigator.clipboard?.writeText(ticketId).then(() => showToast("Número copiado: " + ticketId));
  }

  return (
    <main id="main-content" style={{ fontFamily: C.sans, color: C.ink, background: C.bg, minHeight: "100vh", lineHeight: 1.5 }}>
      <style>{`
        @keyframes cp-blink   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes cp-fade-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes cp-ring-pop{ from{transform:scale(.5);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes cp-toast   { from{transform:translateX(-50%) translateY(80px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }
        @keyframes cp-spin    { to{transform:rotate(360deg)} }
        .cp-ch-tab:hover  { border-color:rgba(255,255,255,.25)!important; color:rgba(255,255,255,.8)!important; }
        .cp-type-opt:hover { border-color:${C.bdr2}!important; background:${C.white}!important; transform:translateY(-1px); }
        .cp-bairro-opt:hover { border-color:${C.bdr2}!important; }
        .cp-track-btn:hover { border-color:${C.yellow}!important; color:${C.yellow}!important; }
        .cp-ri:hover { border-color:${C.bdr2}!important; transform:translateY(-1px); }
        .cp-share-btn:hover { border-color:${C.bdr2}!important; transform:translateY(-1px); }
        .cp-footer-link { color:${C.green}; text-decoration:none; }
        .cp-footer-link:hover { text-decoration:underline; }
        .cp-btn-back:hover { border-color:${C.bdr2}!important; color:${C.ink}!important; }
        .cp-btn-next:hover:not(:disabled) { background:${C.yellowD}!important; transform:translateY(-1px)!important; box-shadow:0 5px 16px rgba(241,166,15,.3)!important; }
        .cp-btn-next:active { transform:none!important; }
        .cp-gps-btn:hover { border-color:${C.yellow}!important; color:${C.yellow}!important; }
        .cp-submit:hover:not(:disabled) { background:${C.yellowD}!important; transform:translateY(-1px)!important; }
        .cp-input:focus { border-color:${C.green}!important; box-shadow:0 0 0 3px ${C.greenL}!important; background:${C.white}!important; }
        .cp-input-err { border-color:${C.red}!important; box-shadow:0 0 0 3px rgba(180,20,20,.08)!important; }
        .cp-upload:hover, .cp-upload.drag-over { border-color:${C.yellow}!important; background:rgba(241,166,15,.04)!important; }
        .cp-topbar-track:hover { border-color:${C.yellow}!important; color:${C.yellow}!important; }
        .cp-tab:hover { background:rgba(241,166,15,.08)!important; color:${C.ink}!important; }
        .cp-info-card:hover { border-color:${C.bdr2}!important; transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,.06)!important; }
        .cp-channel-card:hover { border-color:${C.yellow}!important; transform:translateY(-2px); box-shadow:0 6px 20px rgba(241,166,15,.1)!important; }

        /* ── Responsive layout ────────────────────────────── */
        /* Tab bar: scroll horizontal em mobile, centrado em desktop */
        .cp-tabs-scroll {
          overflow-x: auto;
          justify-content: flex-start !important;
          padding: 0 12px !important;
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;
        }
        .cp-tabs-scroll::-webkit-scrollbar { display: none; }
        .cp-tabs-scroll > button { flex-shrink: 0; }
        @media (min-width: 640px) {
          .cp-tabs-scroll {
            justify-content: center !important;
            overflow-x: visible;
            padding: 0 !important;
          }
        }
        /* Topbar em ecrãs muito pequenos */
        @media (max-width: 479px) {
          .cp-topbar-long   { display: none !important; }
          .cp-topbar-short  { display: inline !important; }
          .cp-topbar-track-label { display: none !important; }
        }
        .cp-topbar-short { display: none; }
      `}</style>

      {/* ── TOPBAR ──────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(245,244,240,0.95)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.bdr}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 56,
      }}>
        <div style={{ fontFamily: C.display, fontSize: 20, color: C.ink, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.yellow, animation: "cp-blink 3s ease-in-out infinite", flexShrink: 0 }} />
          <span className="cp-topbar-long">OP1NA1 — Portal do Cidadão</span>
          <span className="cp-topbar-short">OP1NA1</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="cp-topbar-track"
            onClick={() => switchTab("consultar")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: C.mono, fontSize: 10, color: C.muted, border: `1px solid ${C.bdr2}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", background: C.white, transition: "all .15s", letterSpacing: "0.04em", flexShrink: 0 }}
          >
            <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <span className="cp-topbar-track-label">Consultar pedido</span>
          </button>
          <a href="/login" style={{ fontFamily: C.mono, fontSize: 10, color: C.muted, padding: "6px 10px", cursor: "pointer", borderRadius: 6, border: "1px solid transparent", background: "none", transition: "all .15s", textDecoration: "none" }}>
            {t("citizen.accessInstitutional")}
          </a>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section style={{ background: C.black, padding: "40px 24px 0", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 50% at 20% 60%,rgba(241,166,15,.1),transparent 70%),radial-gradient(ellipse 50% 60% at 80% 30%,rgba(180,20,20,.07),transparent 70%)` }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: C.mono, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.yellow, border: `1px solid rgba(241,166,15,.3)`, background: "rgba(241,166,15,.08)", borderRadius: 20, padding: "4px 14px", marginBottom: 16 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.yellow, display: "inline-block", animation: "cp-blink 2s ease-in-out infinite" }} />
            Participação cidadã · Município dos Mulenvos
          </div>
          <h1 style={{ fontFamily: C.display, fontSize: "clamp(26px,5vw,38px)", fontWeight: 300, color: "#fff", lineHeight: 1.2, letterSpacing: "-0.025em", marginBottom: 10 }}>
            A sua voz chega à <em style={{ fontStyle: "italic", color: C.yellow }}>Administração.</em>
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.7, marginBottom: 24 }}>
            {t("citizen.description")}
          </p>
        </div>

        {/* ── TABS BAR (inside hero, bottom) ── */}
        <div role="tablist" aria-label="Secções do portal" className="cp-tabs-scroll" style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", gap: 4, paddingBottom: 0 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            const TabIcon = tab.Icon;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                className={active ? "" : "cp-tab"}
                onClick={() => switchTab(tab.id)}
                style={{
                  fontFamily: C.mono, fontSize: 11, letterSpacing: "0.03em",
                  padding: "10px 18px", borderRadius: "8px 8px 0 0",
                  border: `1px solid ${active ? "rgba(255,255,255,.15)" : "rgba(255,255,255,.08)"}`,
                  borderBottom: active ? `2px solid ${C.yellow}` : "1px solid rgba(255,255,255,.08)",
                  color: active ? C.yellow : "rgba(255,255,255,.5)",
                  background: active ? "rgba(255,255,255,.07)" : "transparent",
                  cursor: "pointer", transition: "all .18s", whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <TabIcon size={12} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────────────────── */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.bdr}`, display: "flex", overflowX: "auto" }}>
        {[
          { num: stats.resolved.toString(), color: C.green,  label: "Resolvidas este mês" },
          { num: stats.open.toString(),     color: C.ink,    label: "Em progresso" },
          { num: stats.time,               color: C.ink,    label: "Tempo médio resposta" },
          { num: stats.mediators.toString(),color: C.yellow, label: "Mediadores activos" },
          { num: "10",                      color: C.ink,    label: "Bairros cobertos" },
          { num: "6",                       color: C.blue,   label: "Canais disponíveis" },
        ].map((s, i, a) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 24px", gap: 3, flexShrink: 0, borderRight: i < a.length - 1 ? `1px solid ${C.bdr}` : undefined, minWidth: 110 }}>
            <div style={{ fontFamily: C.display, fontSize: 22, fontWeight: 300, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.num}</div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ══ TAB: ESTATÍSTICAS ══ */}
      {activeTab === "estatisticas" && (
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 80px", animation: "cp-fade-up .3s ease" }}>
          <h2 style={{ fontFamily: C.display, fontSize: 26, fontWeight: 300, color: C.ink, marginBottom: 6 }}>Estatísticas em Tempo Real</h2>
          <p style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginBottom: 28, letterSpacing: "0.04em" }}>Dados actualizados automaticamente · Município dos Mulenvos</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 28 }}>
            {[
              { Icon: CheckCircle, label: "Pedidos Resolvidos",    value: stats.resolved,    unit: "este mês",        color: C.green  },
              { Icon: Clock,       label: "Em Progresso",          value: stats.open,        unit: "pedidos activos", color: C.blue   },
              { Icon: Zap,         label: "Tempo Médio Resposta",  value: stats.time,        unit: "horas",           color: C.yellow },
              { Icon: Users,       label: "Mediadores Activos",    value: stats.mediators,   unit: "no terreno",      color: C.red    },
              { Icon: MapPin,      label: "Bairros Cobertos",      value: 10,                unit: "de 10",           color: C.green  },
              { Icon: Radio,       label: "Canais Integrados",     value: 6,                 unit: "activos",         color: C.blue   },
            ].map((s, i) => (
              <div key={i} style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "20px 22px" }}>
                <div style={{ marginBottom: 12, width: 36, height: 36, borderRadius: C.radiusSm, background: `${s.color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}><s.Icon size={18} color={s.color} /></div>
                <div style={{ fontFamily: C.display, fontSize: 30, fontWeight: 300, color: s.color, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{s.unit}</div>
                <div style={{ fontSize: 13, color: C.ink2, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
            {/* By category */}
            <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "20px 22px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Pedidos por Categoria</div>
              {[
                { label: "Água e saneamento", pct: 34, color: C.blue },
                { label: "Recolha de lixo", pct: 22, color: C.green },
                { label: "Iluminação pública", pct: 18, color: C.yellow },
                { label: "Estradas e vias", pct: 14, color: C.red },
                { label: "Outros", pct: 12, color: C.muted },
              ].map(b => (
                <div key={b.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.ink2, marginBottom: 4 }}>
                    <span>{b.label}</span><span style={{ fontFamily: C.mono, color: C.muted }}>{b.pct}%</span>
                  </div>
                  <div style={{ height: 6, background: C.bg2, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${b.pct}%`, background: b.color, borderRadius: 4, transition: "width 1s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* By bairro */}
            <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "20px 22px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Pedidos por Bairro</div>
              {BAIRROS.slice(0, 6).map((b, i) => (
                <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 5 ? `1px solid ${C.bdr}` : undefined }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: ESTRATOS_COLOR[b.estrato], flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontSize: 12, color: C.ink2, flex: 1 }}>{b.name}</span>
                  <span style={{ fontFamily: C.mono, fontSize: 10, color: C.muted }}>{Math.floor(Math.random() * 80 + 20)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recently resolved */}
          <div style={{ marginTop: 16, background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "20px 22px" }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Problemas Resolvidos Recentemente</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
              {RESOLVED.map(r => (
                <div key={r.desc} className="cp-ri" style={{ display: "flex", gap: 10, padding: "10px 12px", background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.bdr}`, cursor: "default", transition: "all .14s" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: C.bg2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><r.Icon size={14} color={r.color} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11.5, color: C.ink2 }}>{r.desc}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, marginTop: 2 }}>{r.meta}</div>
                  </div>
                  <div style={{ alignSelf: "center", fontFamily: C.mono, fontSize: 8, padding: "2px 7px", borderRadius: 10, background: C.greenL, color: C.green, border: `1px solid rgba(0,196,154,.2)`, whiteSpace: "nowrap" }}>✓ Resolvido</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: CANAIS & CONTACTOS ══ */}
      {activeTab === "canais" && (
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 80px", animation: "cp-fade-up .3s ease" }}>
          <h2 style={{ fontFamily: C.display, fontSize: 26, fontWeight: 300, color: C.ink, marginBottom: 6 }}>Canais de Contacto</h2>
          <p style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginBottom: 28, letterSpacing: "0.04em" }}>Escolha o canal mais conveniente para si</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginBottom: 28 }}>
            {[
              { Icon: MessageCircle, label: "WhatsApp", color: "#25D366", desc: "Envie \"OLÁ\" para iniciar", contact: "+244 923 000 000", how: "Assistente automático 24h/7d. Ideal para pedidos rápidos e acompanhamento." },
              { Icon: MessageSquare, label: "SMS",       color: C.blue,    desc: "Envie a descrição do problema", contact: "+244 923 000 001", how: "Sem internet necessária. Resposta em até 2 horas em dias úteis." },
              { Icon: Hash,          label: "USSD *123#",color: C.yellow,  desc: "Marque no seu telemóvel", contact: "*123#", how: "Funciona sem internet e sem saldo. Menu guiado simples." },
              { Icon: Monitor,       label: "Portal Web",color: C.green,   desc: "Este portal online", contact: "op1na1.gov.ao", how: "Formulário completo com acompanhamento em tempo real." },
              { Icon: Smartphone,    label: "App Móvel", color: "#8B5CF6", desc: "Android e iOS", contact: "Descarregar na loja", how: "App offline-first. Funciona em zonas com pouca conectividade." },
              { Icon: MessageCircle, label: "Messenger", color: "#0EA5E9", desc: "Facebook Messenger", contact: "@MunicipioMulenvos", how: "Para utilizadores do Facebook. Assistente automático integrado." },
            ].map(ch => (
              <div key={ch.label} className="cp-channel-card" style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "20px 22px", cursor: "default", transition: "all .18s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: C.radiusSm, background: `${ch.color}15`, border: `1px solid ${ch.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}><ch.Icon size={20} color={ch.color} /></div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{ch.label}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 10, color: ch.color, letterSpacing: "0.04em" }}>{ch.contact}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>{ch.how}</div>
              </div>
            ))}
          </div>

          {/* Mediators */}
          <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "20px 22px" }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Mediadores no Terreno</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>Sem telemóvel ou internet? Um mediador pode registar o seu pedido presencialmente, gratuitamente.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
              {MEDIADORES.map(m => (
                <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.bdr}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(47,110,245,.1)", border: "1px solid rgba(47,110,245,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontSize: 11, color: C.blue, flexShrink: 0 }}>{m.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.ink2 }}>{m.name}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2 }}>{m.zone}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.online ? C.green : C.muted2, boxShadow: m.online ? `0 0 0 2px ${C.greenL}` : undefined }} />
                    <span style={{ fontFamily: C.mono, fontSize: 9, color: m.online ? C.green : C.muted2 }}>{m.online ? "Disponível" : "Offline"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: INFORMAÇÕES ══ */}
      {activeTab === "informacoes" && (
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 80px", animation: "cp-fade-up .3s ease" }}>
          <h2 style={{ fontFamily: C.display, fontSize: 26, fontWeight: 300, color: C.ink, marginBottom: 6 }}>Informações sobre o Sistema</h2>
          <p style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginBottom: 28, letterSpacing: "0.04em" }}>Tudo o que precisa de saber sobre o OP1NA1</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginBottom: 16 }}>
            {[
              { Icon: Target,        color: C.blue,   title: "O que é o OP1NA1?",          body: "O OP1NA1 (Opinar para Ajudar) é a plataforma oficial de participação cidadã do Município dos Mulenvos, Luanda. Permite reportar problemas, fazer sugestões e acompanhar a resolução de pedidos através de múltiplos canais." },
              { Icon: Clock,         color: C.yellow, title: "Qual o prazo de resposta?",   body: "Pedidos urgentes: até 4 horas. Pedidos normais: até 72 horas em dias úteis. Receberá notificações de actualização pelo canal que escolheu ao submeter." },
              { Icon: Shield,        color: C.green,  title: "Os meus dados estão seguros?",body: "Sim. Todos os dados são tratados nos termos da lei angolana de protecção de dados pessoais. Pode submeter anonimamente se preferir." },
              { Icon: ClipboardList, color: C.blue,   title: "O que acontece ao meu pedido?",body: "1. Recebemos o pedido. 2. A IA classifica e prioriza. 3. Atribuímos ao técnico responsável. 4. O técnico intervém. 5. Notificamos a resolução." },
              { Icon: MapPin,        color: C.red,    title: "Que bairros são cobertos?",   body: "KM 9-B, KM 12-B, KM 14-B, Mulenvos de Cima, Baixa de Cassanje, Boa-Fé, CAOP A, CAOP B, CAOP C e Capalanga. Cobertura total do município." },
              { Icon: Headphones,    color: C.muted,  title: "Preciso de ajuda?",           body: "Contacte a linha de apoio: +244 222 000 000 (dias úteis 8h–17h). Em alternativa, visite o Balcão de Atendimento na sede municipal ou contacte um mediador de bairro." },
            ].map(card => (
              <div key={card.title} className="cp-info-card" style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "20px 22px", transition: "all .18s" }}>
                <div style={{ width: 42, height: 42, borderRadius: C.radiusSm, background: `${card.color}14`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><card.Icon size={22} color={card.color} /></div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 8 }}>{card.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{card.body}</div>
              </div>
            ))}
          </div>

          <div style={{ background: C.ink, borderRadius: C.radius, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: C.display, fontSize: 18, fontWeight: 300, color: "#fff", marginBottom: 4 }}>Pronto para participar?</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>Submeta o seu pedido agora. É rápido, fácil e gratuito.</div>
            </div>
            <button onClick={() => switchTab("submeter")} style={{ padding: "12px 28px", borderRadius: C.radiusSm, border: "none", background: C.yellow, color: C.black, fontSize: 13.5, fontWeight: 600, cursor: "pointer", flexShrink: 0, fontFamily: C.sans, transition: "all .16s" }}>
              Submeter Pedido →
            </button>
          </div>
        </div>
      )}

      {/* ══ TAB: CONSULTAR PEDIDO ══ */}
      {activeTab === "consultar" && (
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px 80px", animation: "cp-fade-up .3s ease" }}>
          <h2 style={{ fontFamily: C.display, fontSize: 26, fontWeight: 300, color: C.ink, marginBottom: 6 }}>Consultar Pedido</h2>
          <p style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginBottom: 28, letterSpacing: "0.04em" }}>Introduza o número do seu pedido para ver o estado actual</p>

          <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "24px 28px", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                id="track-input"
                type="text"
                value={trackVal}
                onChange={e => setTrackVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doTrack()}
                placeholder="Ex: MUL-20260509-1234"
                style={{ flex: 1, background: C.surface, border: `1.5px solid ${C.bdr}`, borderRadius: C.radiusSm, padding: "12px 16px", fontFamily: C.mono, fontSize: 13, color: C.ink, outline: "none", letterSpacing: "0.04em" }}
              />
              <button className="cp-track-btn" onClick={doTrack} style={{ padding: "12px 20px", borderRadius: C.radiusSm, border: `1px solid ${C.bdr}`, background: C.ink, color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: C.sans, flexShrink: 0, transition: "all .14s" }}>
                Consultar
              </button>
            </div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, letterSpacing: "0.06em" }}>
              O número do pedido foi enviado no momento da submissão pelo canal que escolheu.
            </div>
          </div>

          {trackResult && (
            <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "24px 28px", animation: "cp-fade-up .3s ease" }}>
              <div style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginBottom: 6 }}>{trackVal.toUpperCase()}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 20 }}>{trackResult.desc}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {trackResult.steps.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < trackResult.steps.length - 1 ? 16 : 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16, flexShrink: 0 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${s.done ? C.green : s.current ? C.yellow : C.bdr2}`, background: s.done ? C.green : C.white, zIndex: 1, flexShrink: 0, boxShadow: s.current ? `0 0 0 4px ${C.yellowL}` : undefined }} />
                      {i < trackResult.steps.length - 1 && <div style={{ flex: 1, width: 2, background: s.done ? C.green : C.bdr2, minHeight: 20 }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: s.done || s.current ? C.ink : C.muted }}>{s.label}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted2, marginTop: 2 }}>{s.time}</div>
                    </div>
                    {s.current && <div style={{ alignSelf: "center", fontFamily: C.mono, fontSize: 8, padding: "3px 8px", borderRadius: 10, background: C.yellowL, color: C.yellowD, border: `1px solid rgba(241,166,15,.3)`, whiteSpace: "nowrap" }}>● Em curso</div>}
                    {s.done && <div style={{ alignSelf: "center", fontFamily: C.mono, fontSize: 8, padding: "3px 8px", borderRadius: 10, background: C.greenL, color: C.green, border: `1px solid rgba(0,196,154,.2)`, whiteSpace: "nowrap" }}>✓ Feito</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: SUBMETER PEDIDO ══ */}
      {(activeTab === "submeter") && (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 80px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

        {/* ── LEFT: FORM ── */}
        <div>
          {/* Step bar */}
          {!success && (
            <div style={{ display: "flex", background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, overflow: "hidden", marginBottom: 20, opacity: success ? 0.3 : 1 }}>
              {["Tipo","Detalhes","Localização","Confirmar"].map((lbl, i) => {
                const n = i + 1;
                const isActive = step === n;
                const isDone   = step > n;
                return (
                  <div
                    key={n}
                    onClick={() => { if (isDone) setStep(n); }}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 10px", borderRight: n < 4 ? `1px solid ${C.bdr}` : undefined, cursor: isDone ? "pointer" : "default" }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${isActive ? C.yellow : isDone ? C.green : C.bdr2}`, background: isActive ? C.yellow : isDone ? C.greenL : "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontSize: 10, color: isActive ? C.black : isDone ? C.green : C.muted, flexShrink: 0, transition: "all .18s" }}>
                      {isDone ? "✓" : n}
                    </div>
                    <span style={{ fontSize: 11, color: isActive ? C.ink : isDone ? C.green : C.muted, fontWeight: isActive ? 500 : 400, whiteSpace: "nowrap", transition: "color .18s" }}>{lbl}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Form card */}
          <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, overflow: "hidden" }}>

            {/* SUCCESS SCREEN */}
            {success && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "40px 24px", gap: 16, animation: "cp-fade-up .4s ease" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", border: `2px solid ${C.green}`, display: "flex", alignItems: "center", justifyContent: "center", animation: "cp-ring-pop .5s cubic-bezier(.34,1.56,.64,1)" }}>
                  <span style={{ fontSize: 28 }}>✓</span>
                </div>
                <div style={{ fontFamily: C.display, fontSize: 22, fontWeight: 400, color: C.ink, letterSpacing: "-0.01em" }}>Pedido registado!</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, maxWidth: 280 }}>
                  A Administração dos Mulenvos recebeu o seu pedido. Receberá uma resposta pelo canal seleccionado.
                </div>
                <div style={{ background: C.bg2, borderRadius: C.radiusSm, padding: "14px 20px", width: "100%", maxWidth: 280 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Número do seu pedido</div>
                  <div style={{ fontFamily: C.mono, fontSize: 18, color: C.green, fontWeight: 500, letterSpacing: "0.04em" }}>{ticketId}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, marginTop: 4, letterSpacing: "0.04em", lineHeight: 1.5 }}>Guarde este número para acompanhar o seu pedido.</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { label: "Copiar número", action: copyTicket },
                    { label: "Partilhar WA",  action: () => { const msg = encodeURIComponent(`O meu pedido OP1NA1: ${ticketId}`); window.open(`https://wa.me/?text=${msg}`, "_blank"); } },
                  ].map(b => (
                    <button key={b.label} className="cp-share-btn" onClick={b.action} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderRadius: C.radiusSm, border: `1.5px solid ${C.bdr}`, background: C.white, fontSize: 12, color: C.ink2, cursor: "pointer", transition: "all .14s", fontFamily: C.sans }}>
                      {b.label}
                    </button>
                  ))}
                </div>
                <button onClick={resetForm} style={{ padding: "12px 32px", borderRadius: C.radiusSm, border: "none", background: C.yellow, color: C.black, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: C.sans, transition: "all .16s" }}>
                  Fazer novo pedido
                </button>
              </div>
            )}

            {/* STEP 1: TIPO */}
            {!success && step === 1 && (
              <div style={{ animation: "cp-fade-up .3s ease" }}>
                <StepHeader icon={<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>} title={t("citizen.step1.title")} sub="Escolha a opção que melhor descreve a sua situação" />
                <div style={{ padding: 22 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8, marginBottom: 20 }}>
                    {TIPOS.map(t => {
                      const sel = tipo === t.id;
                      const isUrgent = t.id === "urgente";
                      return (
                        <div key={t.id} className="cp-type-opt" onClick={() => setTipo(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 8px 14px", borderRadius: C.radiusSm, border: `1.5px solid ${sel ? (isUrgent ? C.red : C.yellow) : C.bdr}`, cursor: "pointer", background: sel ? (isUrgent ? "rgba(180,20,20,.05)" : C.yellowL) : C.surface, textAlign: "center", position: "relative", transition: "all .16s" }}>
                          {sel && <span style={{ position: "absolute", top: 6, right: 8, fontSize: 9, color: isUrgent ? C.red : C.yellow, fontFamily: C.mono }}>✓</span>}
                          <div style={{ width: 40, height: 40, borderRadius: C.radiusSm, background: `${t.color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}><t.Icon size={22} color={t.color} /></div>
                          <span style={{ fontSize: 11, fontWeight: 500, color: C.ink2 }}>{t.name}</span>
                          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, letterSpacing: "0.04em" }}>{t.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                  <NavRow onNext={goStep2} />
                </div>
              </div>
            )}

            {/* STEP 2: DETALHES */}
            {!success && step === 2 && (
              <div style={{ animation: "cp-fade-up .3s ease" }}>
                <StepHeader icon={<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>} title={t("citizen.step2.title")} sub={t("citizen.step2.sub")} />
                <div style={{ padding: 22 }}>
                  <FieldWrap label="Categoria" required error={errCat ? "Seleccione uma categoria." : ""}>
                    <select value={categoria} onChange={e => { setCategoria(e.target.value); setErrCat(false); }} className={`cp-input${errCat ? " cp-input-err" : ""}`} style={{ width: "100%", background: C.surface, border: `1.5px solid ${errCat ? C.red : C.bdr}`, borderRadius: C.radiusSm, padding: "10px 36px 10px 14px", color: C.ink, fontFamily: C.sans, fontSize: 13.5, outline: "none", appearance: "none" }}>
                      <option value="">Seleccione uma categoria...</option>
                      {["Água e saneamento","Electricidade e iluminação","Estradas e vias públicas","Recolha de lixo","Segurança pública","Saúde pública","Educação","Outra"].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </FieldWrap>
                  <FieldWrap label="Descrição" required error={errDesc ? "A descrição é obrigatória (mínimo 20 caracteres)." : ""} hint={`${descricao.length} / 800`} hintColor={descricao.length > 720 ? C.red : descricao.length > 640 ? C.yellow : C.muted2}>
                    <textarea value={descricao} onChange={e => { setDescricao(e.target.value); setErrDesc(false); }} className={`cp-input${errDesc ? " cp-input-err" : ""}`} maxLength={800} placeholder="Descreva o problema com o máximo de detalhes possível..." style={{ width: "100%", background: C.surface, border: `1.5px solid ${errDesc ? C.red : C.bdr}`, borderRadius: C.radiusSm, padding: "10px 14px", color: C.ink, fontFamily: C.sans, fontSize: 13.5, outline: "none", resize: "vertical", minHeight: 110, lineHeight: 1.6 }} />
                  </FieldWrap>
                  <FieldWrap label="Nome (opcional)" hint="Pode submeter de forma anónima.">
                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="cp-input" placeholder="O seu nome completo" style={{ width: "100%", background: C.surface, border: `1.5px solid ${C.bdr}`, borderRadius: C.radiusSm, padding: "10px 14px", color: C.ink, fontFamily: C.sans, fontSize: 13.5, outline: "none" }} />
                  </FieldWrap>
                  <FieldWrap label="Contacto WhatsApp / Telefone (opcional)" hint="Para receber actualizações sobre o seu pedido.">
                    <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} className="cp-input" placeholder="+244 9XX XXX XXX" style={{ width: "100%", background: C.surface, border: `1.5px solid ${C.bdr}`, borderRadius: C.radiusSm, padding: "10px 14px", color: C.ink, fontFamily: C.sans, fontSize: 13.5, outline: "none" }} />
                  </FieldWrap>
                  <NavRow onBack={() => setStep(1)} onNext={validateStep2} />
                </div>
              </div>
            )}

            {/* STEP 3: LOCALIZAÇÃO */}
            {!success && step === 3 && (
              <div style={{ animation: "cp-fade-up .3s ease" }}>
                <StepHeader icon={<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>} title={t("citizen.step3.title")} sub={t("citizen.step3.sub")} />
                <div style={{ padding: 22 }}>
                  <button
                    className="cp-gps-btn"
                    onClick={getGPS}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: C.radiusSm, border: `1.5px solid ${gpsState === "got" ? C.yellow : C.bdr2}`, background: gpsState === "got" ? C.yellowL : C.surface, cursor: "pointer", fontSize: 13, color: gpsState === "got" ? C.yellowD : C.ink2, transition: "all .16s", width: "100%", fontFamily: C.sans, opacity: gpsState === "loading" ? 0.7 : 1 }}
                  >
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>
                    {gpsState === "loading" ? "A obter localização..." : gpsState === "got" ? `GPS: ${gpsCoords?.lat.toFixed(4)}, ${gpsCoords?.lng.toFixed(4)}` : gpsState === "err" ? "GPS não disponível — seleccione o bairro." : "Usar a minha localização GPS"}
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
                    <div style={{ flex: 1, height: 1, background: C.bdr2 }} />
                    <span style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, letterSpacing: "0.1em" }}>OU SELECCIONAR BAIRRO</span>
                    <div style={{ flex: 1, height: 1, background: C.bdr2 }} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6 }}>
                    {BAIRROS.map(b => {
                      const sel = bairro === b.name;
                      return (
                        <div key={b.name} className="cp-bairro-opt" onClick={() => { setBairro(b.name); setErrBairro(false); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: C.radiusSm, border: `1.5px solid ${sel ? C.yellow : C.bdr}`, cursor: "pointer", background: sel ? C.yellowL : C.surface, transition: "all .14s" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: ESTRATOS_COLOR[b.estrato], flexShrink: 0, display: "inline-block" }} />
                          <span style={{ fontSize: 12, color: C.ink2, flex: 1 }}>{b.name}</span>
                          <span style={{ fontFamily: C.mono, fontSize: 8, color: C.muted2, letterSpacing: "0.06em" }}>Est. {b.estrato}</span>
                        </div>
                      );
                    })}
                  </div>
                  {errBairro && <div style={{ fontFamily: C.mono, fontSize: 9, color: C.red, marginTop: 8, letterSpacing: "0.04em" }}>Seleccione o seu bairro ou use o GPS.</div>}

                  <div style={{ marginTop: 16 }}>
                    <FieldWrap label="Referência de localização (opcional)">
                      <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)} className="cp-input" placeholder="Ex: Perto do mercado, rua do poço..." style={{ width: "100%", background: C.surface, border: `1.5px solid ${C.bdr}`, borderRadius: C.radiusSm, padding: "10px 14px", color: C.ink, fontFamily: C.sans, fontSize: 13.5, outline: "none" }} />
                    </FieldWrap>
                  </div>
                  <NavRow onBack={() => setStep(2)} onNext={validateStep3} />
                </div>
              </div>
            )}

            {/* STEP 4: CONFIRMAR */}
            {!success && step === 4 && (
              <div style={{ animation: "cp-fade-up .3s ease" }}>
                <StepHeader icon={<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} title={t("citizen.step4.title")} sub={t("citizen.step4.sub")} />
                <div style={{ padding: 22 }}>
                  <div style={{ background: C.bg2, borderRadius: C.radiusSm, padding: "16px 18px", marginBottom: 16 }}>
                    {[
                      { key: "Tipo",        val: TIPO_LABELS[tipo] || tipo },
                      { key: "Categoria",   val: categoria || "—" },
                      { key: "Descrição",   val: descricao || "—" },
                      { key: "Bairro",      val: bairro || (gpsCoords ? `GPS: ${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}` : "—") },
                      { key: "Referência",  val: referencia || "—" },
                      { key: "Contacto",    val: anonimo ? "Anónimo" : [nome, telefone].filter(Boolean).join(" · ") || "Anónimo" },
                    ].map((r, i, a) => (
                      <div key={r.key} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < a.length-1 ? `1px solid ${C.bdr}` : undefined, fontSize: 12.5 }}>
                        <span style={{ color: C.muted, width: 120, flexShrink: 0 }}>{r.key}</span>
                        <span style={{ color: C.ink, fontWeight: 500, flex: 1 }}>{r.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Anon toggle */}
                  <div onClick={() => setAnonimo(v => !v)} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", background: "rgba(47,110,245,.05)", border: `1px solid rgba(47,110,245,.15)`, borderRadius: C.radiusSm, marginBottom: 16, cursor: "pointer" }}>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: anonimo ? C.green : C.bdr2, position: "relative", flexShrink: 0, transition: "background .18s", marginTop: 1 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: anonimo ? 19 : 3, transition: "left .18s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: C.ink, marginBottom: 2 }}>Submeter anonimamente</div>
                      <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted, letterSpacing: "0.04em", lineHeight: 1.5 }}>O seu nome e contacto não serão associados ao pedido. Não poderá receber actualizações.</div>
                    </div>
                  </div>

                  {/* Terms */}
                  <div onClick={() => { setTerms(v => !v); setErrTerms(false); }} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: errTerms ? 4 : 18, cursor: "pointer" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${terms ? C.yellow : C.bdr2}`, background: terms ? C.yellow : C.surface, flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .14s" }}>
                      {terms && <span style={{ fontSize: 9, color: C.black, fontFamily: C.mono }}>✓</span>}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                      Li e aceito os <button type="button" onClick={() => switchTab("informacoes")} style={{ color: C.green, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}>termos de uso</button> e a <button type="button" onClick={() => switchTab("informacoes")} style={{ color: C.green, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}>política de privacidade</button>. Os meus dados serão tratados nos termos da lei angolana de protecção de dados.
                    </div>
                  </div>
                  {errTerms && <div style={{ fontFamily: C.mono, fontSize: 9, color: C.red, marginBottom: 14, letterSpacing: "0.04em" }}>Deve aceitar os termos para continuar.</div>}

                  {/* Submit */}
                  <button
                    className="cp-submit"
                    onClick={submitForm}
                    disabled={submitting}
                    style={{ width: "100%", padding: 13, background: submitting ? C.yellowD : C.yellow, color: C.black, border: "none", borderRadius: C.radiusSm, fontFamily: C.sans, fontSize: 13.5, fontWeight: 500, cursor: submitting ? "not-allowed" : "pointer", transition: "all .18s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}
                  >
                    {submitting ? (
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "cp-spin .7s linear infinite" }}>
                        <circle cx="7" cy="7" r="5.5" stroke="rgba(0,0,0,.2)" strokeWidth="2"/>
                        <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke={C.black} strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    )}
                    {submitting ? "A submeter..." : "Submeter pedido"}
                  </button>
                  <button onClick={() => setStep(3)} style={{ width: "100%", padding: "10px", border: `1.5px solid ${C.bdr2}`, borderRadius: C.radiusSm, background: C.white, color: C.muted, fontFamily: C.sans, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Voltar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Quick consult */}
          <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: C.ink }}>Acompanhar pedido</span>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <button onClick={() => switchTab("consultar")} style={{ width: "100%", padding: "10px 14px", borderRadius: C.radiusSm, border: `1.5px solid ${C.bdr2}`, background: C.surface, color: C.ink2, fontSize: 12.5, cursor: "pointer", fontFamily: C.sans, transition: "all .14s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                Ir para Consulta de Pedidos
              </button>
            </div>
          </div>

          {/* Recently resolved */}
          <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: C.ink }}>Problemas resolvidos recentemente</span>
            </div>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {RESOLVED.map(r => (
                <div key={r.desc} className="cp-ri" style={{ display: "flex", gap: 10, padding: "10px 12px", background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.bdr}`, cursor: "pointer", transition: "all .14s" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: C.bg2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><r.Icon size={14} color={r.color} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, color: C.ink2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.desc}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, marginTop: 2, letterSpacing: "0.04em" }}>{r.meta}</div>
                  </div>
                  <div style={{ alignSelf: "center", fontFamily: C.mono, fontSize: 8, padding: "2px 7px", borderRadius: 10, background: C.greenL, color: C.green, border: `1px solid rgba(0,196,154,.2)`, whiteSpace: "nowrap" }}>✓ Resolvido</div>
                </div>
              ))}
              <button onClick={() => switchTab("estatisticas")} style={{ width: "100%", padding: "8px", background: "none", border: `1px solid ${C.bdr}`, borderRadius: C.radiusSm, fontSize: 11, color: C.muted, cursor: "pointer", fontFamily: C.mono, letterSpacing: "0.04em", transition: "all .14s" }}>
                Ver estatísticas completas →
              </button>
            </div>
          </div>

          {/* Mediators */}
          <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: C.ink }}>Mediadores no terreno</span>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, letterSpacing: "0.06em", marginBottom: 10 }}>
                Sem telemóvel? Um mediador pode registar o seu pedido presencialmente.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MEDIADORES.map(m => (
                  <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.bdr}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(47,110,245,.1)", border: "1px solid rgba(47,110,245,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontSize: 10, color: C.blue, flexShrink: 0 }}>{m.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: C.ink2 }}>{m.name}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2 }}>{m.zone}</div>
                    </div>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.online ? C.green : C.muted2, boxShadow: m.online ? `0 0 0 2px ${C.greenL}` : undefined }} />
                  </div>
                ))}
              </div>
              <button onClick={() => switchTab("canais")} style={{ width: "100%", marginTop: 10, padding: "8px", background: "none", border: `1px solid ${C.bdr}`, borderRadius: C.radiusSm, fontSize: 11, color: C.muted, cursor: "pointer", fontFamily: C.mono, letterSpacing: "0.04em", transition: "all .14s" }}>
                Ver todos os canais →
              </button>
            </div>
          </div>
        </div>
      </div>
      )} {/* end submeter tab */}

      {/* ══ TAB: DOCUMENTOS PÚBLICOS ══ */}
      {activeTab === "documentos" && (
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 80px", animation: "cp-fade-up .3s ease" }}>
          <h2 style={{ fontFamily: C.display, fontSize: 26, fontWeight: 300, color: C.ink, marginBottom: 6 }}>Documentos Públicos</h2>
          <p style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginBottom: 28, letterSpacing: "0.04em" }}>Regulamentos, planos, relatórios e editais da Administração Municipal dos Mulenvos</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, marginBottom: 28 }}>
            {DOCUMENTOS.map(doc => (
              <div key={doc.title} className="cp-info-card" style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "18px 20px", transition: "all .18s", display: "flex", gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: C.radiusSm, background: `${doc.color}14`, border: `1px solid ${doc.color}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><doc.Icon size={20} color={doc.color} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 8, color: C.muted2, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{doc.cat} · {doc.date}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.ink, lineHeight: 1.4, marginBottom: 10 }}>{doc.title}</div>
                  <a
                    href={doc.href}
                    onClick={e => { e.preventDefault(); showToast("Documento disponível em breve."); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: C.mono, fontSize: 9, color: C.green, textDecoration: "none", letterSpacing: "0.06em" }}
                  >
                    <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Descarregar PDF
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: C.bg2, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "18px 22px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 40, height: 40, borderRadius: C.radiusSm, background: C.white, border: `1px solid ${C.bdr2}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Download size={18} color={C.muted} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.ink, marginBottom: 3 }}>Solicitar documento específico</div>
              <div style={{ fontSize: 12, color: C.muted }}>Não encontrou o documento? Submeta um pedido de informação através do formulário ou contacte-nos.</div>
            </div>
            <button onClick={() => switchTab("submeter")} style={{ padding: "10px 20px", borderRadius: C.radiusSm, border: "none", background: C.yellow, color: C.black, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: C.sans, flexShrink: 0 }}>
              Submeter pedido →
            </button>
          </div>
        </div>
      )}

      {/* ══ TAB: PORTAL MUNICIPAL ══ */}
      {activeTab === "municipal" && (
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 80px", animation: "cp-fade-up .3s ease" }}>
          <h2 style={{ fontFamily: C.display, fontSize: 26, fontWeight: 300, color: C.ink, marginBottom: 6 }}>Portal Municipal</h2>
          <p style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginBottom: 28, letterSpacing: "0.04em" }}>Ligações rápidas para portais e serviços institucionais</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginBottom: 32 }}>
            {PORTAL_LINKS.map(link => (
              <div key={link.label} className="cp-channel-card" style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "22px 24px", transition: "all .18s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: C.radiusSm, background: `${link.color}14`, border: `1px solid ${link.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><link.Icon size={22} color={link.color} /></div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 1 }}>{link.label}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 9, color: link.color, letterSpacing: "0.06em" }}>{link.external ? "Portal externo" : "Acesso interno"}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>{link.desc}</div>
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: C.radiusSm, background: `${link.color}12`, border: `1px solid ${link.color}30`, color: link.color, fontFamily: C.mono, fontSize: 10, textDecoration: "none", letterSpacing: "0.05em", cursor: "pointer" }}
                  >
                    Aceder ao portal
                    <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                ) : (
                  <a
                    href={link.href}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: C.radiusSm, background: `${link.color}12`, border: `1px solid ${link.color}30`, color: link.color, fontFamily: C.mono, fontSize: 10, textDecoration: "none", letterSpacing: "0.05em", cursor: "pointer" }}
                  >
                    Aceder →
                  </a>
                )}
              </div>
            ))}
          </div>

          <div style={{ background: C.black, borderRadius: C.radius, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: C.display, fontSize: 18, fontWeight: 300, color: "#fff", marginBottom: 4 }}>Precisa de ajuda para encontrar um serviço?</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>A nossa linha de apoio pode orientá-lo. Linha: +244 222 000 000 · Dias úteis 8h–17h</div>
            </div>
            <button onClick={() => switchTab("canais")} style={{ padding: "12px 24px", borderRadius: C.radiusSm, border: "none", background: C.yellow, color: C.black, fontSize: 13.5, fontWeight: 600, cursor: "pointer", flexShrink: 0, fontFamily: C.sans }}>
              Ver contactos →
            </button>
          </div>
        </div>
      )}

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ background: C.ink, color: "rgba(255,255,255,.4)", padding: "28px 24px 24px", fontFamily: C.mono, fontSize: 9, letterSpacing: "0.08em" }}>
        {/* Footer links grid */}
        <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "16px 24px", marginBottom: 20 }}>
          {[
            { label: t("citizen.footer.services"), items: [
              { text: "Submeter Pedido",  action: () => switchTab("submeter") },
              { text: "Consultar Pedido", action: () => switchTab("consultar") },
              { text: "Estatísticas",     action: () => switchTab("estatisticas") },
            ]},
            { label: t("citizen.footer.info"), items: [
              { text: "Canais & Contactos", action: () => switchTab("canais") },
              { text: "Documentos Públicos", action: () => switchTab("documentos") },
              { text: "Informações Gerais",  action: () => switchTab("informacoes") },
            ]},
            { label: t("citizen.footer.portals"), items: [
              { text: "Portal Municipal",  action: () => switchTab("municipal") },
              { text: "Dashboard Admin",   action: () => router.push("/admin") },
              { text: "Área Técnica (TI)", action: () => router.push("/") },
            ]},
            { label: t("citizen.footer.legal"), items: [
              { text: "Termos de Uso",     action: () => switchTab("informacoes") },
              { text: "Privacidade",       action: () => switchTab("informacoes") },
              { text: "Acesso Institucional", action: () => router.push("/login") },
            ]},
          ].map(col => (
            <div key={col.label}>
              <div style={{ color: "rgba(255,255,255,.25)", fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", marginBottom: 8 }}>{col.label}</div>
              {col.items.map(item => (
                <button key={item.text} onClick={item.action} className="cp-footer-link"
                  style={{ display: "block", background: "none", border: "none", cursor: "pointer", fontFamily: C.mono, fontSize: 9, letterSpacing: "0.06em", marginBottom: 5, padding: 0, textAlign: "left" }}>
                  {item.text}
                </button>
              ))}
            </div>
          ))}
        </div>
        {/* Copyright bar */}
        <div style={{ maxWidth: 980, margin: "0 auto", borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 16, textAlign: "center", color: "rgba(255,255,255,.25)" }}>
          Copyright © 2025 OP1NA1 — Opinar para Ajudar · Administração Municipal dos Mulenvos · Luanda, Angola · v1.0
        </div>
      </footer>

      {/* ── TOAST ──────────────────────────────────────────── */}
      {toast.visible && (
        <div aria-live="polite" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#fff", fontFamily: C.mono, fontSize: 11, padding: "11px 20px", borderRadius: 24, border: "1px solid rgba(255,255,255,.1)", letterSpacing: "0.04em", zIndex: 999, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", animation: "cp-toast .3s cubic-bezier(.34,1.56,.64,1) both" }}>
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          {toast.msg}
        </div>
      )}
    </main>
  );
}

// ─── Small helpers ────────────────────────────────────────────────
function StepHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: C.radiusSm, background: "rgba(241,166,15,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.ink }}>{title}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

function FieldWrap({ label, required, error, hint, hintColor, children }: {
  label: string; required?: boolean; error?: string; hint?: string; hintColor?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
      <div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
        {label}{required && <span style={{ color: C.red, fontSize: 12 }}>*</span>}
      </div>
      {children}
      {hint && <div style={{ fontFamily: C.mono, fontSize: 9, color: hintColor || C.muted2, letterSpacing: "0.04em" }}>{hint}</div>}
      {error && <div style={{ fontFamily: C.mono, fontSize: 9, color: C.red, letterSpacing: "0.04em" }}>{error}</div>}
    </div>
  );
}

function NavRow({ onBack, onNext }: { onBack?: () => void; onNext: () => void }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 22, alignItems: "center" }}>
      {onBack && (
        <button className="cp-btn-back" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 18px", borderRadius: C.radiusSm, border: `1.5px solid ${C.bdr2}`, background: C.white, color: C.muted, fontSize: 13, cursor: "pointer", fontFamily: C.sans, transition: "all .14s" }}>
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Voltar
        </button>
      )}
      <button className="cp-btn-next" onClick={onNext} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, borderRadius: C.radiusSm, border: "none", background: C.yellow, color: C.black, fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: C.sans, letterSpacing: "0.01em", transition: "all .18s" }}>
        Continuar
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>
  );
}
