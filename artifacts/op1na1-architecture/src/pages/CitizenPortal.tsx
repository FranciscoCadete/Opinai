import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";

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
  { id: "reclamacao",  icon: "⚠️", name: "Reclamação",   desc: "Problema no bairro" },
  { id: "sugestao",    icon: "💡", name: "Sugestão",     desc: "Ideia de melhoria" },
  { id: "denuncia",    icon: "🔍", name: "Denúncia",     desc: "Situação irregular" },
  { id: "solicitacao", icon: "📋", name: "Solicitação",  desc: "Pedido de serviço" },
  { id: "elogio",      icon: "👏", name: "Elogio",       desc: "Feedback positivo" },
  { id: "urgente",     icon: "🚨", name: "Urgente",      desc: "Situação de risco" },
];
const TIPO_LABELS: Record<string,string> = {
  reclamacao: "⚠️ Reclamação", sugestao: "💡 Sugestão",
  denuncia: "🔍 Denúncia", solicitacao: "📋 Solicitação",
  elogio: "👏 Elogio", urgente: "🚨 Urgente",
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
  { icon: "💧", desc: "Avaria na conduta de água — KM 12-B",   meta: "Infraestrutura · 18h" },
  { icon: "🗑",  desc: "Recolha de lixo irregular — Boa-Fé",    meta: "Ambiente · 36h" },
  { icon: "💡", desc: "Iluminação avariada — Mulenvos de Cima", meta: "Segurança · 24h" },
];
const MEDIADORES = [
  { initials: "AM", name: "António M.",  zone: "CAOP C · Seg–Sex 7h–17h",    online: true  },
  { initials: "CJ", name: "Clara J.",    zone: "Capalanga · Seg–Sáb 8h–16h", online: true  },
  { initials: "JA", name: "João António",zone: "Boa-Fé · Ter–Sáb 9h–17h",   online: false },
];
const CHANNELS = [
  { id: "portal",   label: "Portal",     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg> },
  { id: "whatsapp", label: "WhatsApp",   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg> },
  { id: "sms",      label: "SMS",        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg> },
  { id: "ussd",     label: "USSD *123#", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg> },
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

// ─── Main component ──────────────────────────────────────────────
export default function CitizenPortal() {
  const [, navigate] = useLocation();

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

  // Stats
  const [stats, setStats] = useState({ resolved: 0, open: 0, time: "0h", mediators: 0 });

  // Toast
  const [toast, setToast]       = useState({ msg: "", visible: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

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
  function submitForm() {
    if (!terms) { setErrTerms(true); return; }
    setSubmitting(true);
    setTimeout(() => {
      const id = genTicketId();
      setTicketId(id);
      setSubmitting(false);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 2200);
  }
  function resetForm() {
    setSuccess(false); setStep(1); setTipo("reclamacao"); setBairro(null);
    setGpsState("idle"); setGpsCoords(null); setCategoria(""); setDescricao("");
    setNome(""); setTelefone(""); setReferencia(""); setAnonimo(false);
    setTerms(false); setErrCat(false); setErrDesc(false); setErrBairro(false); setErrTerms(false);
  }

  // Track ticket
  function doTrack() {
    if (!trackVal.trim()) return;
    setTrackResult(DEMO_TRACKS[Math.floor(Math.random() * DEMO_TRACKS.length)]);
  }

  // Copy ticket
  function copyTicket() {
    navigator.clipboard?.writeText(ticketId).then(() => showToast("Número copiado: " + ticketId));
  }

  return (
    <div style={{ fontFamily: C.sans, color: C.ink, background: C.bg, minHeight: "100vh", lineHeight: 1.5 }}>
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
      `}</style>

      {/* ── TOPBAR ──────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(245,244,240,0.92)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.bdr}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 58,
      }}>
        <div style={{ fontFamily: C.display, fontSize: 20, color: C.ink, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.yellow }} />
          OP1NA1
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="cp-topbar-track"
            onClick={() => { const el = document.getElementById("track-input"); el?.focus(); el?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
            style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: C.mono, fontSize: 10, color: C.muted, border: `1px solid ${C.bdr2}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", background: C.white, transition: "all .15s", letterSpacing: "0.04em" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            Consultar pedido
          </button>
          <button onClick={() => navigate("/overview")} style={{ fontFamily: C.mono, fontSize: 10, color: C.muted, padding: "6px 10px", cursor: "pointer", borderRadius: 6, border: "1px solid transparent", background: "none", transition: "all .15s" }}>
            ← Portal Técnico
          </button>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section style={{ background: C.black, padding: "52px 24px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 50% at 20% 60%,rgba(241,166,15,.1),transparent 70%),radial-gradient(ellipse 50% 60% at 80% 30%,rgba(180,20,20,.07),transparent 70%)` }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: C.mono, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: C.yellow, border: `1px solid rgba(241,166,15,.3)`, background: "rgba(241,166,15,.08)", borderRadius: 20, padding: "4px 14px", marginBottom: 20 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.yellow, display: "inline-block", animation: "cp-blink 2s ease-in-out infinite" }} />
            Participação cidadã · Mulenvos
          </div>
          <h1 style={{ fontFamily: C.display, fontSize: "clamp(28px,6vw,40px)", fontWeight: 300, color: "#fff", lineHeight: 1.18, letterSpacing: "-0.025em", marginBottom: 14 }}>
            A sua voz chega<br />
            à <em style={{ fontStyle: "italic", color: C.yellow }}>Administração.</em>
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.5)", lineHeight: 1.7, marginBottom: 32 }}>
            Reporte problemas, faça sugestões e acompanhe as respostas — pelo canal que preferir.
          </p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {CHANNELS.map(ch => {
              const active = channel === ch.id;
              return (
                <button
                  key={ch.id}
                  className="cp-ch-tab"
                  onClick={() => setChannel(ch.id)}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: C.mono, fontSize: 10, letterSpacing: "0.04em", padding: "6px 12px", borderRadius: 20, border: `1px solid ${active ? C.yellow : "rgba(255,255,255,.12)"}`, color: active ? C.black : "rgba(255,255,255,.5)", background: active ? C.yellow : "transparent", cursor: "pointer", transition: "all .2s" }}
                >
                  {ch.icon}{ch.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Channel banner */}
      {channel !== "portal" && CHANNEL_MSG[channel] && (
        <div style={{ background: C.ink, color: "#fff", textAlign: "center", padding: "18px 24px", fontSize: 14, borderBottom: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <span>{CHANNEL_MSG[channel]}</span>
          <button onClick={() => setChannel("portal")} style={{ fontFamily: C.mono, fontSize: 10, color: C.yellow, background: "none", border: `1px solid rgba(241,166,15,.3)`, padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}>
            Usar portal
          </button>
        </div>
      )}

      {/* ── STATS BAR ──────────────────────────────────────── */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.bdr}`, display: "flex", overflowX: "auto" }}>
        {[
          { num: stats.resolved.toString(), color: C.green, label: "Resolvidas este mês" },
          { num: stats.open.toString(),     color: C.ink,   label: "Em progresso" },
          { num: stats.time,               color: C.ink,   label: "Tempo médio" },
          { num: stats.mediators.toString(),color: C.yellow,label: "Mediadores activos" },
          { num: "10",                      color: C.ink,   label: "Bairros cobertos" },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 28px", gap: 3, flexShrink: 0, borderRight: i < 4 ? `1px solid ${C.bdr}` : undefined, minWidth: 110 }}>
            <div style={{ fontFamily: C.display, fontSize: 22, fontWeight: 300, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.num}</div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ──────────────────────────────────────── */}
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
                <StepHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>} title="Qual é o tipo de pedido?" sub="Escolha a opção que melhor descreve a sua situação" />
                <div style={{ padding: 22 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
                    {TIPOS.map(t => {
                      const sel = tipo === t.id;
                      const isUrgent = t.id === "urgente";
                      return (
                        <div key={t.id} className="cp-type-opt" onClick={() => setTipo(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 8px 14px", borderRadius: C.radiusSm, border: `1.5px solid ${sel ? (isUrgent ? C.red : C.yellow) : C.bdr}`, cursor: "pointer", background: sel ? (isUrgent ? "rgba(180,20,20,.05)" : C.yellowL) : C.surface, textAlign: "center", position: "relative", transition: "all .16s" }}>
                          {sel && <span style={{ position: "absolute", top: 6, right: 8, fontSize: 9, color: isUrgent ? C.red : C.yellow, fontFamily: C.mono }}>✓</span>}
                          <span style={{ fontSize: 24, lineHeight: 1 }}>{t.icon}</span>
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
                <StepHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>} title="Descreva o problema" sub="Quanto mais detalhes, mais rápida será a resposta" />
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
                <StepHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>} title="Onde é o problema?" sub="Seleccione o bairro ou use o GPS para localização exacta" />
                <div style={{ padding: 22 }}>
                  <button
                    className="cp-gps-btn"
                    onClick={getGPS}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: C.radiusSm, border: `1.5px solid ${gpsState === "got" ? C.yellow : C.bdr2}`, background: gpsState === "got" ? C.yellowL : C.surface, cursor: "pointer", fontSize: 13, color: gpsState === "got" ? C.yellowD : C.ink2, transition: "all .16s", width: "100%", fontFamily: C.sans, opacity: gpsState === "loading" ? 0.7 : 1 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>
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
                <StepHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} title="Confirmar e enviar" sub="Reveja os dados antes de submeter o pedido" />
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
                      Li e aceito os <a href="#" style={{ color: C.green, textDecoration: "none" }}>termos de uso</a> e a <a href="#" style={{ color: C.green, textDecoration: "none" }}>política de privacidade</a>. Os meus dados serão tratados nos termos da lei angolana de protecção de dados.
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
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "cp-spin .7s linear infinite" }}>
                        <circle cx="7" cy="7" r="5.5" stroke="rgba(0,0,0,.2)" strokeWidth="2"/>
                        <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke={C.black} strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    )}
                    {submitting ? "A submeter..." : "Submeter pedido"}
                  </button>
                  <button onClick={() => setStep(3)} style={{ width: "100%", padding: "10px", border: `1.5px solid ${C.bdr2}`, borderRadius: C.radiusSm, background: C.white, color: C.muted, fontFamily: C.sans, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Voltar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Track card */}
          <div id="track-card" style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: C.ink }}>Acompanhar pedido</span>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <input
                  id="track-input"
                  type="text"
                  value={trackVal}
                  onChange={e => setTrackVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && doTrack()}
                  placeholder="MUL-20260509-XXXX"
                  style={{ flex: 1, background: C.surface, border: `1.5px solid ${C.bdr}`, borderRadius: C.radiusSm, padding: "9px 12px", fontFamily: C.mono, fontSize: 11, color: C.ink, outline: "none", transition: "border-color .15s", letterSpacing: "0.04em" }}
                />
                <button className="cp-track-btn" onClick={doTrack} style={{ padding: "9px 14px", borderRadius: C.radiusSm, border: `1px solid ${C.bdr}`, background: C.ink, color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: C.sans, flexShrink: 0, transition: "all .14s" }}>
                  Consultar
                </button>
              </div>
              {trackResult && (
                <div style={{ background: C.surface, borderRadius: C.radiusSm, padding: 14, border: `1px solid ${C.bdr}`, animation: "cp-fade-up .3s ease" }}>
                  <div style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginBottom: 8 }}>{trackVal.toUpperCase()}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.ink, marginBottom: 10 }}>{trackResult.desc}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {trackResult.steps.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, paddingBottom: i < trackResult.steps.length-1 ? 10 : 0 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14, flexShrink: 0 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${s.done ? C.green : s.current ? C.yellow : C.bdr2}`, background: s.done ? C.green : C.white, zIndex: 1, flexShrink: 0, boxShadow: s.current ? `0 0 0 3px ${C.yellowL}` : undefined }} />
                          {i < trackResult.steps.length-1 && <div style={{ flex: 1, width: 1.5, background: s.done ? C.green : C.bdr2, minHeight: 16 }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 500, color: s.done || s.current ? C.ink : C.muted }}>{s.label}</div>
                          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, marginTop: 1 }}>{s.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recently resolved */}
          <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: C.ink }}>Problemas resolvidos recentemente</span>
            </div>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {RESOLVED.map(r => (
                <div key={r.desc} className="cp-ri" style={{ display: "flex", gap: 10, padding: "10px 12px", background: C.surface, borderRadius: C.radiusSm, border: `1px solid ${C.bdr}`, cursor: "pointer", transition: "all .14s" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: C.bg2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{r.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, color: C.ink2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.desc}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 9, color: C.muted2, marginTop: 2, letterSpacing: "0.04em" }}>{r.meta}</div>
                  </div>
                  <div style={{ alignSelf: "center", fontFamily: C.mono, fontSize: 8, padding: "2px 7px", borderRadius: 10, background: C.greenL, color: C.green, border: `1px solid rgba(0,196,154,.2)`, whiteSpace: "nowrap" }}>✓ Resolvido</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mediators */}
          <div style={{ background: C.white, border: `1px solid ${C.bdr}`, borderRadius: C.radius, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ background: C.ink, color: "rgba(255,255,255,.4)", textAlign: "center", padding: 24, fontFamily: C.mono, fontSize: 9, letterSpacing: "0.08em", lineHeight: 2 }}>
        OP1NA1 · Sistema Integrado de Participação Cidadã · Administração Municipal dos Mulenvos · Luanda, Angola<br />
        <a href="/overview" className="cp-footer-link">Termos de uso</a> · <a href="/overview" className="cp-footer-link">Privacidade</a> · <a href="/login" className="cp-footer-link">Acesso institucional</a> · v1.0
      </footer>

      {/* ── TOAST ──────────────────────────────────────────── */}
      {toast.visible && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#fff", fontFamily: C.mono, fontSize: 11, padding: "11px 20px", borderRadius: 24, border: "1px solid rgba(255,255,255,.1)", letterSpacing: "0.04em", zIndex: 999, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", animation: "cp-toast .3s cubic-bezier(.34,1.56,.64,1) both" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          {toast.msg}
        </div>
      )}
    </div>
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Voltar
        </button>
      )}
      <button className="cp-btn-next" onClick={onNext} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, borderRadius: C.radiusSm, border: "none", background: C.yellow, color: C.black, fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: C.sans, letterSpacing: "0.01em", transition: "all .18s" }}>
        Continuar
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>
  );
}
