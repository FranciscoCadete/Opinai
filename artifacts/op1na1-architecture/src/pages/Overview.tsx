import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  MessageCircle, Phone, Monitor, Smartphone, Globe, Hash,
  Zap, Shield, Database, Cpu, Server, GitBranch, ArrowRight,
  Users, MapPin, Activity, Clock, CheckCircle, Code2,
} from "lucide-react";

// ─── Animated counter ────────────────────────────────────────────
function Counter({ target, suffix = "", duration = 1200 }: { target: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      observer.disconnect();
      const step = target / (duration / 16);
      let v = 0;
      const timer = setInterval(() => {
        v = Math.min(v + step, target);
        setVal(Math.round(v));
        if (v >= target) clearInterval(timer);
      }, 16);
    }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ─── Channel data ────────────────────────────────────────────────
const CHANNELS = [
  { icon: MessageCircle, label: "WhatsApp", color: "#25D366", bg: "rgba(37,211,102,0.08)", desc: "Chatbot automático via Twilio / 360dialog" },
  { icon: Phone,          label: "SMS",      color: "#3B82F6", bg: "rgba(59,130,246,0.08)", desc: "Africa's Talking · USSD fallback integrado" },
  { icon: Hash,           label: "USSD",     color: "#F59E0B", bg: "rgba(245,158,11,0.08)", desc: "Código *123# — funciona sem internet" },
  { icon: Globe,          label: "Web Portal",color: "#00c49a", bg: "rgba(0,196,154,0.08)", desc: "Portal público + acompanhamento de pedidos" },
  { icon: Smartphone,     label: "Mobile App",color: "#8B5CF6", bg: "rgba(139,92,246,0.08)", desc: "PWA React Native — offline-first" },
  { icon: Monitor,        label: "Messenger", color: "#0EA5E9", bg: "rgba(14,165,233,0.08)", desc: "Facebook Messenger API webhook" },
];

const STACK = [
  { label: "FastAPI", color: "#009688" },
  { label: "Python 3.11", color: "#3776ab" },
  { label: "SQLAlchemy 2.x", color: "#c15c1a" },
  { label: "Alembic", color: "#66503e" },
  { label: "MySQL 8.x", color: "#4479a1" },
  { label: "Celery", color: "#37814a" },
  { label: "Redis", color: "#dc382d" },
  { label: "Nginx", color: "#009639" },
  { label: "Ubuntu 22.04", color: "#E95420" },
  { label: "Docker", color: "#2496ed" },
];

const LAYERS = [
  { icon: Globe, label: "Canais de entrada", detail: "WhatsApp · SMS · USSD · Web · Mobile · Messenger", color: "#00c49a" },
  { icon: Cpu,   label: "Motor de processamento NLP + IA", detail: "Triagem automática · classificação · detecção de crises", color: "#F1A60F" },
  { icon: Database, label: "Core API & Base de dados", detail: "FastAPI REST · MySQL · Redis cache · Celery tasks", color: "#B41414" },
  { icon: Server,   label: "Infra & Deploy", detail: "Ubuntu VPS · Nginx · Gunicorn · CI/CD básico", color: "#8B5CF6" },
];

const PRINCIPLES = [
  { icon: GitBranch, title: "Monólito modular", desc: "Sem microserviços. Código dividido por domínios funcionais dentro de um único deploy.", color: "#00c49a" },
  { icon: Shield, title: "RBAC multinível", desc: "Cidadão → Técnico → Gestor → Director → Admin. Cada perfil com permissões granulares.", color: "#3B82F6" },
  { icon: Zap, title: "Offline-resiliente", desc: "Fila assíncrona Celery+Redis para cenários de baixa conectividade nos bairros.", color: "#F59E0B" },
  { icon: Activity, title: "Auditoria completa", desc: "Todas as mutações de dados são registadas com actor, timestamp e payload anterior.", color: "#8B5CF6" },
  { icon: CheckCircle, title: "SLA garantido", desc: "Tickets priorizados por canal, urgência e bairro. Alertas automáticos por breach.", color: "#EC4899" },
  { icon: Code2, title: "API-first", desc: "OpenAPI 3.1 como contrato de verdade. Clientes gerados a partir do spec.", color: "#B41414" },
];

// ─── Main ─────────────────────────────────────────────────────────
export default function Overview() {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="page-enter space-y-10">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <div className="relative hero-gradient rounded-2xl border border-border/60 overflow-hidden">
        {/* Decorative orb */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,196,154,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: "30%", width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(204,0,0,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div className="relative px-8 py-10 md:px-10 md:py-12">
          {/* Pill */}
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-950/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-emerald-700 dark:text-emerald-400" style={{ fontFamily: "'DM Mono',monospace" }}>
              Plataforma activa · Mulenvos · Luanda
            </span>
          </div>

          <h1 className="text-display text-3xl md:text-5xl font-light text-foreground mb-4 leading-[1.12]" style={{ fontFamily: "'Fraunces',serif", fontWeight: 300 }}>
            OP1NA1 — Participação<br className="hidden md:block" />
            <em className="italic" style={{ color: "#00c49a" }}> Cidadã Omnicanal</em>
          </h1>
          <p className="text-base text-muted-foreground max-w-xl leading-relaxed mb-8">
            Plataforma FastAPI + Python que permite aos cidadãos reportar problemas municipais e interagir com a Administração Municipal dos Mulenvos através de 6 canais integrados — incluindo WhatsApp, USSD e SMS para zonas de baixa conectividade.
          </p>

          {/* CTA row */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate("/citizen-portal")}
              className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white transition-all duration-200 shadow-sm"
              style={{ background: "linear-gradient(135deg, #00c49a, #009b7a)", boxShadow: "0 2px 12px rgba(0,196,154,0.3)" }}
            >
              Portal do Cidadão
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/admin-dashboard")}
              className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm border border-border bg-card hover:bg-secondary text-foreground transition-all duration-200"
            >
              Dashboard Admin
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/c4-architecture")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Arquitectura C4 →
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS ROW ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Globe,      value: 6,    suffix: "",  label: "Canais de entrada",    color: "#00c49a" },
          { icon: MapPin,     value: 10,   suffix: "",  label: "Bairros cobertos",      color: "#F1A60F" },
          { icon: Cpu,        value: 3,    suffix: "",  label: "Camadas de IA/NLP",    color: "#8B5CF6" },
          { icon: Clock,      value: 99,   suffix: ".9%", label: "Uptime garantido",   color: "#3B82F6" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-card border border-border rounded-xl p-5 group hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15` }}>
                  <Icon size={16} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground mb-0.5" style={{ fontFamily: "'Fraunces',serif", fontWeight: 300, fontSize: 30 }}>
                <Counter target={s.value} suffix={s.suffix} />
              </div>
              <div className="text-xs text-muted-foreground font-medium tracking-wide">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── CANAIS DE ENTRADA ─────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">Canais de participação</h2>
          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">6 activos</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CHANNELS.map((ch, i) => {
            const Icon = ch.icon;
            const isHovered = hovered === i;
            return (
              <div
                key={ch.label}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="relative bg-card border border-border rounded-xl p-4 cursor-default group transition-all duration-200 overflow-hidden"
                style={{ boxShadow: isHovered ? `0 4px 20px ${ch.color}18` : undefined, borderColor: isHovered ? `${ch.color}40` : undefined }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200" style={{ background: isHovered ? `${ch.color}18` : ch.bg }}>
                    <Icon size={18} style={{ color: ch.color }} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground mb-0.5">{ch.label}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{ch.desc}</div>
                  </div>
                </div>
                {isHovered && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${ch.color}, transparent)` }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ARQUITECTURA EM CAMADAS ───────────────────────────── */}
      <div>
        <h2 className="text-xl font-semibold text-foreground tracking-tight mb-5">Arquitectura em camadas</h2>
        <div className="relative space-y-2">
          {LAYERS.map((l, i) => {
            const Icon = l.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-4 transition-all duration-200 hover:shadow-sm group"
                style={{ marginLeft: `${i * 16}px`, marginRight: 0 }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${l.color}14` }}>
                  <Icon size={16} style={{ color: l.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground">{l.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{l.detail}</div>
                </div>
                <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ background: `${l.color}40` }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PRINCÍPIOS DE DESIGN ──────────────────────────────── */}
      <div>
        <h2 className="text-xl font-semibold text-foreground tracking-tight mb-5">Princípios de design</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRINCIPLES.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-all duration-200 group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${p.color}12` }}>
                  <Icon size={16} style={{ color: p.color }} />
                </div>
                <div className="font-semibold text-sm text-foreground mb-1.5">{p.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{p.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── STACK TECNOLÓGICO ─────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <Code2 size={16} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.08em]">Stack tecnológico</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {STACK.map((t) => (
            <span
              key={t.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 hover:shadow-sm"
              style={{
                borderColor: `${t.color}30`,
                background: `${t.color}08`,
                color: t.color,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
              {t.label}
            </span>
          ))}
        </div>
        <div className="mt-5 pt-5 border-t border-border">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {[
              { label: "Servidor", val: "Ubuntu 22.04 VPS · 2 GB RAM · Nginx" },
              { label: "Equipa", val: "1–3 developers" },
              { label: "Línguas", val: "Português (PT-AO) + Inglês (API docs)" },
              { label: "Licença", val: "Proprietary · Município dos Mulenvos" },
            ].map(r => (
              <div key={r.label}>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5" style={{ fontFamily: "'DM Mono',monospace" }}>{r.label}</div>
                <div className="text-xs text-foreground">{r.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── NAVIGATION CARDS ──────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-semibold text-foreground tracking-tight mb-5">Explorar documentação</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "C4 Architecture",      sub: "Diagrama de contexto, container e componente",   href: "/c4-architecture",    color: "#00c49a" },
            { label: "ERD Schema",           sub: "Modelo de dados completo com relações",           href: "/erd-schema",         color: "#3B82F6" },
            { label: "API Contract",         sub: "Endpoints REST documentados com exemplos",        href: "/api-contract",       color: "#F59E0B" },
            { label: "Módulo Auth",          sub: "JWT, RBAC, OTP — segurança de ponta a ponta",    href: "/auth-module",        color: "#8B5CF6" },
            { label: "Pipeline NLP",         sub: "Classificação e triagem automática de pedidos",   href: "/nlp-pipeline",       color: "#EC4899" },
            { label: "Dashboard Admin",      sub: "KPIs em tempo real + gestão de tickets",         href: "/admin-dashboard",    color: "#B41414" },
          ].map((card, i) => (
            <button
              key={i}
              onClick={() => navigate(card.href)}
              className="text-left group bg-card border border-border rounded-xl px-5 py-4 hover:shadow-sm transition-all duration-200 hover:border-border/80 flex items-center gap-4"
              style={{ borderLeftWidth: 3, borderLeftColor: `${card.color}40` }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: card.color, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{card.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{card.sub}</div>
              </div>
              <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
