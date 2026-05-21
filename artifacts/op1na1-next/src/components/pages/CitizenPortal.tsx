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
  { initials: "AM", name: "António M.",   zone: "CAOP C · Seg–Sex 7h–17h",    bairro: "CAOP C",   online: true,  whatsapp: "958746812", facebook: "https://m.me/municipiomulenvos" },
  { initials: "CJ", name: "Clara J.",     zone: "Capalanga · Seg–Sáb 8h–16h", bairro: "Capalanga", online: true,  whatsapp: "958746812", facebook: "https://m.me/municipiomulenvos" },
  { initials: "JA", name: "João António", zone: "Boa-Fé · Ter–Sáb 9h–17h",   bairro: "Boa-Fé",   online: false, whatsapp: "958746812", facebook: "https://m.me/municipiomulenvos" },
];

// Mensagens dinâmicas rotativas (mobile-first)
const DYNAMIC_MSGS = [
  "Este mês, foram resolvidos 45 problemas de saneamento nos Mulenvos.",
  "714 pedidos resolvidos em Maio. A sua participação conta!",
  "Tempo médio de resposta: 38 horas. Juntos somos mais rápidos.",
  "3 mediadores disponíveis agora mesmo para o ajudar presencialmente.",
  "Sem internet? Marque *123# ou envie SMS para 958 746 812.",
];
const CHANNELS = [
  { id: "portal",   label: "Portal",     icon: <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg> },
  { id: "whatsapp", label: "WhatsApp",   icon: <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg> },
  { id: "sms",      label: "SMS",        icon: <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg> },
  { id: "ussd",     label: "USSD *123#", icon: <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg> },
];
const CHANNEL_MSG: Record<string,string> = {
  whatsapp: "📱 WhatsApp: envie \"OLÁ\" para 958 746 812 e siga as instruções do assistente.",
  sms:      "📨 SMS: envie a descrição do problema para 958 746 812.",
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

function genTicketId() {
  // Short, memorable ticket code — easy to share via SMS/WhatsApp/call
  const n = Math.floor(Math.random() * 900) + 100;
  return `OP${n}`;
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
  const switchTab = useCallback((id: string, scroll = true) => {
    setActiveTab(id);
    window.history.replaceState(null, "", `#${id}`);
    if (scroll) {
      // Small delay so the new content renders before scrolling
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
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

  // Canal 3 — channel-selector modal (Como pretende contactar?)
  const [contactModal, setContactModal] = useState<{
    name:  string;
    phone: string;
    open:  boolean;
  } | null>(null);
  const [selectedContactChannel, setSelectedContactChannel] =
    useState<"chamada" | "sms" | "whatsapp" | null>(null);

  // Track
  const [trackVal, setTrackVal]         = useState("");
  const [trackPhone, setTrackPhone]     = useState("");
  const [trackMode, setTrackMode]       = useState<"ticket"|"phone">("ticket");
  const [trackResult, setTrackResult]   = useState<typeof DEMO_TRACKS[0] | null>(null);

  // Offline / data-saver
  const [dataSaver, setDataSaver]       = useState(false);
  const [isOffline, setIsOffline]       = useState(false);

  // Dynamic rotating message
  const [dynMsgIdx, setDynMsgIdx]       = useState(0);

  // Stats (animated counters)
  const [stats, setStats] = useState({ resolved: 0, open: 0, time: "0h", mediators: 0 });

  // Toast
  const [toast, setToast]       = useState({ msg: "", visible: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Smooth scroll target — right before tab content
  const contentRef = useRef<HTMLDivElement>(null);

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

  // Offline detection + data-saver via Network Information API
  useEffect(() => {
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    setIsOffline(!navigator.onLine);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    // Auto-enable data saver on slow connections
    const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
    if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") setDataSaver(true);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  // Rotate dynamic message every 5s
  useEffect(() => {
    const id = setInterval(() => setDynMsgIdx(i => (i + 1) % DYNAMIC_MSGS.length), 5000);
    return () => clearInterval(id);
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

        /* ── Category selection pulse ────────────────────── */
        @keyframes cp-select-pop { 0%{transform:scale(1)} 35%{transform:scale(1.06)} 70%{transform:scale(.97)} 100%{transform:scale(1)} }
        .cp-tipo-selected { animation: cp-select-pop .28s cubic-bezier(.34,1.56,.64,1) both; }

        /* ── Mobile-only / desktop-only visibility ────────── */
        .cp-mobile-only  { display: block; }
        .cp-desktop-only { display: none; }
        @media(min-width: 768px){
          .cp-mobile-only  { display: none !important; }
          .cp-desktop-only { display: block; }
        }

        /* ── Academic footer ──────────────────────────────── */
        .cp-footer-academic { border-top: 1px solid rgba(255,255,255,.08); padding-top: 16px; text-align: center; }

        /* ── 3 Main CTAs ─────────────────────────────────── */
        .cp-cta-grid { display:grid; grid-template-columns:1fr; gap:10px; padding:0 0 24px; position:relative; z-index:1; }
        @media(min-width:480px){ .cp-cta-grid { grid-template-columns:repeat(3,1fr); } }
        .cp-cta-btn { background:rgba(255,255,255,.06); border-radius:14px; padding:20px 16px; cursor:pointer; border:1px solid rgba(255,255,255,.1); transition:all .18s; text-align:left; display:flex; align-items:center; gap:14px; width:100%; }
        @media(min-width:480px){ .cp-cta-btn { flex-direction:column; align-items:flex-start; gap:10px; } }
        .cp-cta-btn:hover { transform:translateY(-2px); border-color:rgba(255,255,255,.22); background:rgba(255,255,255,.1); }
        .cp-cta-btn:active { transform:none; }

        /* ── Offline / data-saver banner ─────────────────── */
        .cp-offline-bar { display:flex; align-items:center; gap:10px; padding:10px 20px; font-family:${C.mono}; font-size:11px; }
        .cp-ds-toggle { cursor:pointer; background:none; border:1px solid currentColor; border-radius:4px; padding:2px 8px; font-family:${C.mono}; font-size:10px; opacity:.8; }
        .cp-ds-toggle:hover { opacity:1; }

        /* ── Mediator action buttons ─────────────────────── */
        .cp-med-wa { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; border:none; cursor:pointer; font-family:${C.sans}; font-size:12px; font-weight:500; transition:all .14s; }
        .cp-med-wa:hover { opacity:.88; transform:translateY(-1px); }

        /* ── Dynamic message fade ─────────────────────────── */
        @keyframes cp-msg-fade { 0%{opacity:0;transform:translateY(4px)} 15%{opacity:1;transform:none} 85%{opacity:1} 100%{opacity:0} }
        .cp-dyn-msg { animation:cp-msg-fade 5s ease forwards; }

        /* ── Track mode tabs ──────────────────────────────── */
        .cp-track-tab { padding:8px 16px; border-radius:8px 8px 0 0; cursor:pointer; font-family:${C.mono}; font-size:11px; border:none; transition:all .14s; }

        /* ── Submeter two-column on large screens ────────── */
        @media(min-width:900px){ .cp-submeter-grid { grid-template-columns: minmax(0,1fr) 320px !important; } }

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

        /* ── Canal 3: Channel selector modal ─────────────── */
        @keyframes cp-modal-in { from{opacity:0;transform:translate(-50%,-48%) scale(.96)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
        .cp-modal-overlay { position:fixed; inset:0; background:rgba(8,12,16,.55); z-index:200; backdrop-filter:blur(4px); }
        .cp-modal-box { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:${C.white}; border:1px solid ${C.bdr2}; border-radius:18px; width:min(92vw,440px); padding:32px 28px; z-index:201; animation:cp-modal-in .2s cubic-bezier(.34,1.2,.64,1) both; box-shadow:0 24px 60px rgba(0,0,0,.18); }
        .cp-ch-opt { display:flex; align-items:center; gap:14px; padding:14px 16px; border-radius:12px; border:1.5px solid ${C.bdr}; cursor:pointer; background:transparent; width:100%; transition:all .15s; text-align:left; }
        .cp-ch-opt:hover { border-color:${C.yellow}; background:rgba(241,166,15,.04); transform:translateX(3px); }
        .cp-ch-opt.selected { border-color:${C.yellow}; background:rgba(241,166,15,.08); }
        .cp-ch-opt-icon { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .cp-ch-action { margin-top:20px; padding:12px 20px; border-radius:10px; border:none; cursor:pointer; width:100%; font-family:${C.sans}; font-size:14px; font-weight:600; background:${C.yellow}; color:${C.black}; transition:all .15s; }
        .cp-ch-action:hover { background:${C.yellowD}; transform:translateY(-1px); }
        .cp-ch-action:disabled { opacity:.35; cursor:default; transform:none; }
        .cp-contact-trigger { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; border:1px solid ${C.bdr2}; cursor:pointer; font-family:${C.sans}; font-size:12px; font-weight:500; transition:all .14s; background:transparent; color:${C.ink}; }
        .cp-contact-trigger:hover { border-color:${C.yellow}; color:${C.yellow}; }
      `}</style>

      {/* ══ CANAL 3: Channel-selector modal ════════════════════ */}
      {contactModal?.open && (
        <>
          {/* Backdrop */}
          <div
            className="cp-modal-overlay"
            onClick={() => { setContactModal(null); setSelectedContactChannel(null); }}
            aria-hidden="true"
          />
          <div className="cp-modal-box" role="dialog" aria-modal="true" aria-labelledby="cp-modal-title">
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                Contactar · {contactModal.name}
              </div>
              <div id="cp-modal-title" style={{ fontFamily: C.display, fontSize: 20, fontWeight: 300, color: C.ink, lineHeight: 1.2 }}>
                Como pretende contactar?
              </div>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                {
                  id: "chamada" as const,
                  label: "Chamada Telefónica",
                  sub:   "Fale directamente com um agente",
                  color: C.green,
                  bg:    C.greenL,
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5 19.79 19.79 0 0 1 1.62 2.84 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/>
                    </svg>
                  ),
                },
                {
                  id: "sms" as const,
                  label: "SMS",
                  sub:   "Envie o problema por mensagem de texto",
                  color: C.blue,
                  bg:    "rgba(47,110,245,.08)",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" aria-hidden="true">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  ),
                },
                {
                  id: "whatsapp" as const,
                  label: "WhatsApp",
                  sub:   "Assistente automático guiado 24h/7d",
                  color: "#25D366",
                  bg:    "rgba(37,211,102,.08)",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" aria-hidden="true">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/>
                    </svg>
                  ),
                },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  className={`cp-ch-opt${selectedContactChannel === opt.id ? " selected" : ""}`}
                  onClick={() => setSelectedContactChannel(opt.id)}
                  style={{ borderColor: selectedContactChannel === opt.id ? opt.color : undefined,
                           background: selectedContactChannel === opt.id ? opt.bg : undefined }}
                >
                  <div className="cp-ch-opt-icon" style={{ background: opt.bg }}>
                    {opt.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{opt.label}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted, marginTop: 2 }}>{opt.sub}</div>
                  </div>
                  {selectedContactChannel === opt.id && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={opt.color} aria-hidden="true">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Action */}
            <button
              className="cp-ch-action"
              disabled={!selectedContactChannel}
              onClick={() => {
                const phone = contactModal.phone.replace(/\D/g, "");
                if (selectedContactChannel === "chamada") {
                  window.open(`tel:+244${phone}`, "_self");
                } else if (selectedContactChannel === "sms") {
                  window.open(`sms:+244${phone}`, "_self");
                } else if (selectedContactChannel === "whatsapp") {
                  window.open(`https://wa.me/244${phone}?text=OL%C3%81%20OP1NA1`, "_blank", "noopener,noreferrer");
                }
                setContactModal(null);
                setSelectedContactChannel(null);
              }}
            >
              {selectedContactChannel === "chamada"  && "Ligar agora →"}
              {selectedContactChannel === "sms"      && "Abrir SMS →"}
              {selectedContactChannel === "whatsapp" && "Abrir WhatsApp →"}
              {!selectedContactChannel               && "Seleccione um canal"}
            </button>

            {/* Dismiss */}
            <button
              onClick={() => { setContactModal(null); setSelectedContactChannel(null); }}
              style={{ display: "block", width: "100%", marginTop: 10, padding: "8px", background: "none", border: "none", cursor: "pointer", fontFamily: C.mono, fontSize: 10, color: C.muted2, letterSpacing: "0.04em" }}
            >
              cancelar
            </button>
          </div>
        </>
      )}

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
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.7, marginBottom: 28 }}>
            {t("citizen.description")}
          </p>

          {/* ── 3 PRINCIPAIS ACÇÕES ─────────────────────────── */}
          <div className="cp-cta-grid">
            {[
              {
                id: "submeter", color: C.red, borderColor: "rgba(180,20,20,.45)",
                icon: (
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(180,20,20,.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                ),
                label: "Reportar Problema",
                desc: "Fotos, voz ou texto — rápido e sem burocracia",
              },
              {
                id: "consultar", color: C.blue, borderColor: "rgba(47,110,245,.45)",
                icon: (
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(47,110,245,.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.63 19a19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-2.91-8.72A2 2 0 0 1 4.7 2h3a2 2 0 0 1 2 1.72c.127.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.91 9.96a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.34 1.85.574 2.81.7A2 2 0 0 1 22 17.3Z"/></svg>
                  </div>
                ),
                label: "Acompanhar Pedido",
                desc: "Veja o estado em tempo real pelo número de telefone",
              },
              {
                id: "canais", color: "#25D366", borderColor: "rgba(37,211,102,.45)",
                icon: (
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(37,211,102,.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>
                  </div>
                ),
                label: "Falar com o Mediador",
                desc: "Apoio humano presencial ou via WhatsApp no seu bairro",
              },
            ].map(cta => (
              <button
                key={cta.id}
                className="cp-cta-btn"
                onClick={() => switchTab(cta.id)}
                style={{ borderColor: cta.borderColor }}
                aria-label={cta.label}
              >
                {cta.icon}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 3 }}>{cta.label}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 10, color: "rgba(255,255,255,.5)", lineHeight: 1.4 }}>{cta.desc}</div>
                </div>
                <svg style={{ marginLeft: "auto", flexShrink: 0, opacity: .5 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            ))}
          </div>
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

      {/* ── OFFLINE / DATA-SAVER BANNER ─────────────────── */}
      {(isOffline || dataSaver) && (
        <div className="cp-offline-bar" style={{ background: isOffline ? "rgba(180,20,20,.08)" : "rgba(241,166,15,.08)", color: isOffline ? C.red : C.yellow, borderBottom: `1px solid ${isOffline ? "rgba(180,20,20,.2)" : "rgba(241,166,15,.2)"}` }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {isOffline
              ? <><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></>
              : <><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>
            }
          </svg>
          <span style={{ flex: 1 }}>
            {isOffline
              ? "Sem ligação à internet. Use SMS (958 746 812) ou USSD (*123#) gratuitamente."
              : "Modo Poupança de Dados activo — imagens e mapas desactivados."
            }
          </span>
          {dataSaver && !isOffline && (
            <button className="cp-ds-toggle" style={{ color: C.yellow }} onClick={() => setDataSaver(false)}>Desactivar</button>
          )}
          {!isOffline && !dataSaver && (
            <button className="cp-ds-toggle" style={{ color: C.yellow }} onClick={() => setDataSaver(true)}>Modo Poupança</button>
          )}
        </div>
      )}

      {/* ── DYNAMIC MOBILE MESSAGE ───────────────────────── */}
      <div style={{ background: C.ink, borderBottom: `1px solid rgba(255,255,255,.06)`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, minHeight: 40, overflow: "hidden" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, flexShrink: 0, animation: "cp-blink 2s ease-in-out infinite" }} />
        <div key={dynMsgIdx} className="cp-dyn-msg" style={{ fontFamily: C.mono, fontSize: 11, color: "rgba(255,255,255,.65)", letterSpacing: "0.02em", flex: 1 }}>
          {DYNAMIC_MSGS[dynMsgIdx]}
        </div>
        {!dataSaver && !isOffline && (
          <button className="cp-ds-toggle" style={{ color: "rgba(255,255,255,.4)", flexShrink: 0 }} onClick={() => setDataSaver(true)} title="Activar modo poupança de dados">
            Poupar dados
          </button>
        )}
      </div>

      {/* ── Smooth-scroll anchor (target of switchTab) ───── */}
      <div ref={contentRef} style={{ scrollMarginTop: 60 }} />

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

          {/* Canal 3 — decision banner */}
          <div style={{ background: "linear-gradient(135deg,rgba(241,166,15,.08),rgba(0,196,154,.06))", border: `1px solid rgba(241,166,15,.2)`, borderRadius: C.radius, padding: "18px 22px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.yellow, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Canal 3 — Decisão Assistida</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>Como pretende contactar?</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Escolha o canal e o sistema orienta-o automaticamente.</div>
            </div>
            <button
              className="cp-contact-trigger"
              style={{ background: C.yellow, color: C.black, border: "none", fontWeight: 600, borderRadius: 10, padding: "10px 20px" }}
              onClick={() => {
                setSelectedContactChannel(null);
                setContactModal({ name: "OP1NA1 – Mulenvos", phone: "958746812", open: true });
              }}
            >
              Contactar agora →
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginBottom: 28 }}>
            {[
              { Icon: MessageCircle, label: "WhatsApp", color: "#25D366", desc: "Envie \"OLÁ\" para iniciar", contact: "958 746 812", phone: "958746812", how: "Assistente automático guiado 24h/7d. Categorias, estado e confirmação.", actionable: true },
              { Icon: MessageSquare, label: "SMS",       color: C.blue,    desc: "Envie a descrição do problema", contact: "958 746 812", phone: "958746812", how: "Sem internet. Classificação automática por IA. Resposta em 2h.", actionable: true },
              { Icon: Hash,          label: "USSD *123#",color: C.yellow,  desc: "Marque no seu telemóvel", contact: "*123#", phone: "", how: "Funciona sem internet e sem saldo. Menu guiado simples.", actionable: false },
              { Icon: Monitor,       label: "Portal Web",color: C.green,   desc: "Este portal online", contact: "op1na1.gov.ao", phone: "", how: "Formulário completo com acompanhamento em tempo real.", actionable: false },
              { Icon: Smartphone,    label: "App Móvel", color: "#8B5CF6", desc: "Android e iOS", contact: "Descarregar na loja", phone: "", how: "App offline-first. Funciona em zonas com pouca conectividade.", actionable: false },
              { Icon: MessageCircle, label: "Messenger", color: "#0EA5E9", desc: "Facebook Messenger", contact: "@MunicipioMulenvos", phone: "", how: "Para utilizadores do Facebook. Assistente automático integrado.", actionable: false },
            ].map(ch => (
              <div key={ch.label} className="cp-channel-card" style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "20px 22px", cursor: "default", transition: "all .18s", display: "flex", flexDirection: "column", gap: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: C.radiusSm, background: `${ch.color}15`, border: `1px solid ${ch.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}><ch.Icon size={20} color={ch.color} /></div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{ch.label}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 10, color: ch.color, letterSpacing: "0.04em" }}>{ch.contact}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, flex: 1 }}>{ch.how}</div>
                {ch.actionable && (
                  <button
                    className="cp-contact-trigger"
                    style={{ marginTop: 14, width: "100%", justifyContent: "center" }}
                    onClick={() => {
                      setSelectedContactChannel(null);
                      setContactModal({ name: ch.label, phone: ch.phone, open: true });
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
                    Contactar
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Mediators — hybrid human support */}
          <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Mediadores Comunitários no Terreno</div>
              <div style={{ fontFamily: C.mono, fontSize: 9, padding: "3px 10px", borderRadius: 10, background: C.greenL, color: C.green, border: `1px solid rgba(0,196,154,.2)` }}>
                ● {MEDIADORES.filter(m => m.online).length} disponíveis agora
              </div>
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
              Sem telemóvel ou internet? Um mediador do seu bairro regista o pedido <strong>presencialmente e gratuitamente</strong>. Contacte directamente via WhatsApp ou Messenger.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
              {MEDIADORES.map(m => (
                <div key={m.name} style={{ background: C.surface, borderRadius: C.radius, border: `1px solid ${m.online ? "rgba(0,196,154,.2)" : C.bdr}`, overflow: "hidden" }}>
                  {/* Header */}
                  <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.bdr}` }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(47,110,245,.1)", border: `2px solid ${m.online ? "rgba(0,196,154,.3)" : C.bdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.mono, fontSize: 13, color: C.blue, flexShrink: 0, position: "relative" }}>
                      {m.initials}
                      {m.online && <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: C.green, border: `2px solid ${C.surface}` }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{m.name}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, marginTop: 1 }}>{m.zone}</div>
                    </div>
                  </div>
                  {/* Bairro tag */}
                  <div style={{ padding: "8px 16px", borderBottom: `1px solid ${C.bdr}` }}>
                    <span style={{ fontFamily: C.mono, fontSize: 9, padding: "2px 8px", borderRadius: 4, background: C.bg2, color: C.muted }}>📍 {m.bairro}</span>
                  </div>
                  {/* Action buttons */}
                  <div style={{ padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a
                      href={`https://wa.me/${m.whatsapp.replace(/\D/g,"")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cp-med-wa"
                      style={{ background: "#25D366", color: "#fff", flex: 1, justifyContent: "center", textDecoration: "none" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>
                      WhatsApp
                    </a>
                    <a
                      href={m.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cp-med-wa"
                      style={{ background: "#0084FF", color: "#fff", flex: 1, justifyContent: "center", textDecoration: "none" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                      Messenger
                    </a>
                  </div>
                </div>
              ))}
            </div>
            {/* SMS/USSD fallback */}
            <div style={{ marginTop: 16, padding: "14px 18px", background: C.bg, borderRadius: C.radiusSm, border: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 20 }}>📟</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.ink2, marginBottom: 2 }}>Sem internet ou sem smartphone?</div>
                <div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted }}>SMS para <strong>958 746 812</strong> · USSD <strong>*123#</strong> · Ambos gratuitos, funcionam em 2G</div>
              </div>
              <a href="tel:+244923000001" style={{ padding: "8px 16px", borderRadius: C.radiusSm, border: `1px solid ${C.bdr2}`, background: C.white, color: C.ink, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: C.sans, textDecoration: "none", flexShrink: 0 }}>
                Ligar
              </a>
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
          <h2 style={{ fontFamily: C.display, fontSize: 26, fontWeight: 300, color: C.ink, marginBottom: 6 }}>Acompanhar Pedido</h2>
          <p style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginBottom: 24, letterSpacing: "0.04em" }}>Sem necessidade de código — consulte pelo seu número de telefone ou pelo número do pedido</p>

          {/* Mode selector */}
          <div style={{ display: "flex", marginBottom: 0, gap: 4 }}>
            {([["phone","📱 Número de telefone"],["ticket","🔖 Nº do pedido"]] as [string,string][]).map(([mode, label]) => (
              <button
                key={mode}
                className="cp-track-tab"
                onClick={() => setTrackMode(mode as "ticket"|"phone")}
                style={{
                  background: trackMode === mode ? C.white : C.bg2,
                  color: trackMode === mode ? C.ink : C.muted,
                  borderBottom: trackMode === mode ? `2px solid ${C.yellow}` : "2px solid transparent",
                  fontWeight: trackMode === mode ? 500 : 400,
                }}
              >{label}</button>
            ))}
          </div>

          <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: `0 ${C.radiusSm}px ${C.radiusSm}px ${C.radiusSm}px`, padding: "24px 28px", marginBottom: 16 }}>
            {trackMode === "phone" ? (
              <>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
                  Introduza o número de telefone que usou ao submeter o pedido. Verá os seus últimos pedidos.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="tel"
                    value={trackPhone}
                    onChange={e => setTrackPhone(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { setTrackResult(DEMO_TRACKS[0]); } }}
                    placeholder="+244 9XX XXX XXX"
                    style={{ flex: 1, background: C.surface, border: `1.5px solid ${C.bdr}`, borderRadius: C.radiusSm, padding: "12px 16px", fontFamily: C.mono, fontSize: 13, color: C.ink, outline: "none", letterSpacing: "0.04em" }}
                  />
                  <button className="cp-track-btn" onClick={() => { if (trackPhone.trim()) setTrackResult(DEMO_TRACKS[0]); }} style={{ padding: "12px 20px", borderRadius: C.radiusSm, border: "none", background: C.yellow, color: C.black, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: C.sans, flexShrink: 0, transition: "all .14s" }}>
                    Ver pedidos
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    id="track-input"
                    type="text"
                    value={trackVal}
                    onChange={e => setTrackVal(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && doTrack()}
                    placeholder="Ex: MUL-20260509-1234"
                    style={{ flex: 1, background: C.surface, border: `1.5px solid ${C.bdr}`, borderRadius: C.radiusSm, padding: "12px 16px", fontFamily: C.mono, fontSize: 13, color: C.ink, outline: "none", letterSpacing: "0.04em" }}
                  />
                  <button className="cp-track-btn" onClick={doTrack} style={{ padding: "12px 20px", borderRadius: C.radiusSm, border: "none", background: C.ink, color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: C.sans, flexShrink: 0, transition: "all .14s" }}>
                    Consultar
                  </button>
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, letterSpacing: "0.06em" }}>
                  O número do pedido foi enviado no momento da submissão pelo canal que escolheu.
                </div>
              </>
            )}
          </div>

          {/* Visual timeline — package-tracking style */}
          {trackResult && (
            <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, overflow: "hidden", animation: "cp-fade-up .3s ease" }}>
              {/* Header */}
              <div style={{ padding: "16px 24px", background: C.surface, borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted, marginBottom: 2, letterSpacing: "0.06em" }}>{trackMode === "phone" ? trackPhone : trackVal.toUpperCase()}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{trackResult.desc}</div>
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 9, padding: "4px 10px", borderRadius: 10, background: C.yellowL, color: C.yellowD, border: `1px solid rgba(241,166,15,.3)`, whiteSpace: "nowrap" }}>● Em progresso</div>
              </div>

              {/* Horizontal progress bar */}
              <div style={{ padding: "20px 24px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                  {trackResult.steps.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", flex: i < trackResult.steps.length - 1 ? 1 : undefined }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${s.done ? C.green : s.current ? C.yellow : C.bdr2}`, background: s.done ? C.green : s.current ? C.yellowL : C.white, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: s.current ? `0 0 0 5px ${C.yellowL}` : undefined, transition: "all .3s", zIndex: 1 }}>
                          {s.done
                            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                            : s.current
                              ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.yellow, animation: "cp-blink 1.5s ease-in-out infinite" }} />
                              : <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.bdr2 }} />
                          }
                        </div>
                      </div>
                      {i < trackResult.steps.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: s.done ? C.green : C.bdr2, margin: "0 4px", transition: "background .3s" }} />
                      )}
                    </div>
                  ))}
                </div>
                {/* Step labels */}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  {trackResult.steps.map((s, i) => (
                    <div key={i} style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: C.mono, fontSize: 8, color: s.done ? C.green : s.current ? C.yellowD : C.muted2, letterSpacing: "0.02em", textAlign: "center", padding: "0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detail steps */}
              <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
                {trackResult.steps.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < trackResult.steps.length - 1 ? 14 : 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16, flexShrink: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.done ? C.green : s.current ? C.yellow : C.bdr2, flexShrink: 0, zIndex: 1 }} />
                      {i < trackResult.steps.length - 1 && <div style={{ flex: 1, width: 1, background: s.done ? C.green : C.bdr2, minHeight: 18 }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 4 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: s.done || s.current ? C.ink : C.muted }}>{s.label}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 10, color: C.muted2, marginTop: 1 }}>{s.time}</div>
                    </div>
                    {s.current && <div style={{ alignSelf: "center", fontFamily: C.mono, fontSize: 8, padding: "3px 8px", borderRadius: 10, background: C.yellowL, color: C.yellowD, border: `1px solid rgba(241,166,15,.3)`, whiteSpace: "nowrap" }}>● Em curso</div>}
                    {s.done && <div style={{ alignSelf: "center", fontFamily: C.mono, fontSize: 8, padding: "3px 8px", borderRadius: 10, background: C.greenL, color: C.green, border: `1px solid rgba(0,196,154,.2)`, whiteSpace: "nowrap" }}>✓ Feito</div>}
                  </div>
                ))}
              </div>

              {/* Share */}
              <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.bdr}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="cp-share-btn" onClick={() => { const msg = encodeURIComponent(`Pedido OP1NA1 ${trackVal}: ${trackResult?.desc} — Acompanhe em op1na1.gov.ao`); window.open(`https://wa.me/?text=${msg}`, "_blank"); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: C.radiusSm, border: `1px solid #25D366`, background: "rgba(37,211,102,.06)", color: "#25D366", fontSize: 12, cursor: "pointer", fontFamily: C.sans, transition: "all .14s", fontWeight: 500 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>
                  Partilhar estado no WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: SUBMETER PEDIDO ══ */}
      {(activeTab === "submeter") && (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 80px", display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 20, alignItems: "start" }} className="cp-submeter-grid">

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
                <StepHeader icon={<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>} title="O que deseja reportar hoje?" sub="Toque na categoria que melhor descreve a situação no seu bairro" />
                <div style={{ padding: 22 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8, marginBottom: 20 }}>
                    {TIPOS.map(t => {
                      const sel = tipo === t.id;
                      const isUrgent = t.id === "urgente";
                      return (
                        <div key={t.id} className={`cp-type-opt${sel ? " cp-tipo-selected" : ""}`} onClick={() => setTipo(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 8px 14px", borderRadius: C.radiusSm, border: `2px solid ${sel ? (isUrgent ? C.red : C.yellow) : C.bdr}`, cursor: "pointer", background: sel ? (isUrgent ? "rgba(180,20,20,.07)" : C.yellowL) : C.surface, textAlign: "center", position: "relative", transition: "border-color .16s, background .16s", boxShadow: sel ? `0 0 0 3px ${isUrgent ? "rgba(180,20,20,.15)" : "rgba(241,166,15,.2)"}` : undefined }}>
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
              { text: "Dashboard Admin",   action: () => router.push("/admin"),  desktopOnly: true },
              { text: "Área Técnica (TI)", action: () => router.push("/"),       desktopOnly: true },
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
                <button key={item.text} onClick={item.action} className={`cp-footer-link${(item as {desktopOnly?: boolean}).desktopOnly ? " cp-desktop-only" : ""}`}
                  style={{ display: "block", background: "none", border: "none", cursor: "pointer", fontFamily: C.mono, fontSize: 9, letterSpacing: "0.06em", marginBottom: 5, padding: 0, textAlign: "left" }}>
                  {item.text}
                </button>
              ))}
            </div>
          ))}
        </div>
        {/* Copyright + Academic attribution */}
        <div className="cp-footer-academic" style={{ maxWidth: 980, margin: "0 auto" }}>
          {/* Omnichannel contact */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(241,166,15,.08)", border: "1px solid rgba(241,166,15,.15)", borderRadius: 8, padding: "8px 16px", marginBottom: 16 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.63 19a19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-2.91-8.72A2 2 0 0 1 4.7 2h3a2 2 0 0 1 2 1.72c.127.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.91 9.96a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.34 1.85.574 2.81.7A2 2 0 0 1 22 17.3Z"/></svg>
            <span style={{ color: "rgba(255,255,255,.5)", fontSize: 9 }}>
              Linha omnicanal (chamadas · SMS · WhatsApp):
            </span>
            <a href="tel:958746812" style={{ color: C.yellow, textDecoration: "none", fontWeight: 600, fontSize: 10, letterSpacing: "0.04em" }}>958 746 812</a>
          </div>

          {/* Academic block */}
          <div style={{ color: "rgba(255,255,255,.18)", fontSize: 9, lineHeight: 2, letterSpacing: "0.06em" }}>
            <div style={{ color: "rgba(255,255,255,.35)", fontSize: 10, marginBottom: 4 }}>
              © 2026 OP1NA1 – Município dos Mulenvos
            </div>
            <div>Desenvolvido por <span style={{ color: "rgba(255,255,255,.4)" }}>Francisco Cadete</span></div>
            <div>Faculdade de Ciências Sociais · Universidade Agostinho Neto</div>
            <div style={{ marginTop: 4, color: "rgba(255,255,255,.12)" }}>
              Estatística Social & Geodemografia aplicadas à Governação Digital Participativa
            </div>
          </div>

          {/* Mobile-only: institutional login link */}
          <div className="cp-mobile-only" style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <button onClick={() => router.push("/login")} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "10px 20px", color: "rgba(255,255,255,.5)", fontFamily: C.mono, fontSize: 10, cursor: "pointer", letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Acesso institucional (gestores e técnicos)
            </button>
          </div>
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
