import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";

// ─── Design tokens ───────────────────────────────────────────────
const T = {
  bg:      "#080c10",
  panel:   "#0e1419",
  surface: "#141c24",
  bdr:     "rgba(255,255,255,0.07)",
  bdr2:    "rgba(255,255,255,0.13)",
  accent:  "#00c49a",
  accentD: "#008f70",
  accent2: "#4fa3f7",
  danger:  "#f76f6f",
  text:    "#dde5f0",
  muted:   "#5e7288",
  muted2:  "#3d5166",
  mono:    "'DM Mono', monospace",
  sans:    "'DM Sans', sans-serif",
  display: "'Fraunces', serif",
};

// ─── Particle canvas hook ────────────────────────────────────────
function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    let rafId: number;

    interface Particle {
      x: number; y: number; vx: number; vy: number; r: number; a: number;
      update(): void; draw(): void;
    }

    function makeParticle(): Particle {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random() * 0.5 + 0.1,
        update() {
          this.x += this.vx; this.y += this.vy;
          if (this.x < 0 || this.x > W) this.vx *= -1;
          if (this.y < 0 || this.y > H) this.vy *= -1;
        },
        draw() {
          ctx!.beginPath();
          ctx!.arc(this.x, this.y, this.r, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(0,196,154,${this.a})`;
          ctx!.fill();
        },
      };
    }

    let particles: Particle[] = [];

    function resize() {
      W = canvas!.width  = window.innerWidth;
      H = canvas!.height = window.innerHeight;
    }

    function drawLines() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const a = (1 - dist / 120) * 0.08;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(0,196,154,${a})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }
    }

    function animate() {
      ctx!.clearRect(0, 0, W, H);
      particles.forEach(p => { p.update(); p.draw(); });
      drawLines();
      rafId = requestAnimationFrame(animate);
    }

    resize();
    particles = Array.from({ length: 70 }, makeParticle);
    animate();

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, []);
}

// ─── Types ───────────────────────────────────────────────────────
type Role = "admin" | "gestor" | "analista" | "tecnico";
type LoginState = "idle" | "loading" | "success" | "error";

const ROLES: { id: Role; label: string; icon: string }[] = [
  { id: "admin",   label: "Administrador", icon: "🛡" },
  { id: "gestor",  label: "Gestor",        icon: "📊" },
  { id: "analista",label: "Analista",      icon: "🔬" },
  { id: "tecnico", label: "Técnico",       icon: "🔧" },
];

// ─── Main component ──────────────────────────────────────────────
export default function Login() {
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useParticleCanvas(canvasRef);

  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [passErr, setPassErr] = useState("");
  const [redirectPct, setRedirectPct] = useState(0);

  // Kick off redirect bar fill after success
  useEffect(() => {
    if (loginState === "success") {
      const t1 = setTimeout(() => setRedirectPct(100), 100);
      const t2 = setTimeout(() => navigate("/admin-dashboard"), 2800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [loginState, navigate]);

  function validate() {
    let ok = true;
    setEmailErr(""); setPassErr("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr("Introduza um email válido."); ok = false;
    }
    if (!password || password.length < 4) {
      setPassErr("A palavra-passe é obrigatória."); ok = false;
    }
    return ok;
  }

  function handleLogin() {
    if (!validate()) return;
    setErrorMsg(""); setLoginState("loading");
    setTimeout(() => {
      if (email === "admin@mulenvos.ao" && password === "op1na1") {
        setLoginState("success");
      } else {
        setErrorMsg("Credenciais inválidas. Tente: admin@mulenvos.ao / op1na1");
        setLoginState("error");
      }
    }, 1800);
  }

  function handleAlt(provider: string) {
    setLoginState("loading");
    setTimeout(() => {
      setErrorMsg(`${provider} SSO não configurado neste ambiente de demonstração.`);
      setLoginState("error");
    }, 1000);
  }

  function clearFieldErrors() {
    setEmailErr(""); setPassErr(""); if (loginState === "error") setLoginState("idle");
  }

  const isLoading = loginState === "loading";
  const isSuccess = loginState === "success";
  const isError   = loginState === "error";

  return (
    <div style={{
      position: "fixed", inset: 0, background: T.bg, color: T.text,
      fontFamily: T.sans, fontSize: 14, lineHeight: 1.5, overflow: "hidden",
    }}>
      {/* Injected styles */}
      <style>{`
        @keyframes lp-pulse     { 0%,100%{box-shadow:0 0 0 0 rgba(0,196,154,.5)} 50%{box-shadow:0 0 0 5px rgba(0,196,154,0)} }
        @keyframes lp-pill-in   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes lp-form-in   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes lp-pop-in    { from{transform:scale(.5);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes lp-shake     { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }
        @keyframes lp-spin      { to{transform:rotate(360deg)} }
        .lp-role-opt { cursor:pointer; transition:border-color .16s,background .16s; }
        .lp-role-opt:hover { border-color:${T.bdr2} !important; }
        .lp-alt-btn { cursor:pointer; transition:border-color .14s,color .14s; font-family:${T.sans}; }
        .lp-alt-btn:hover { border-color:${T.bdr2} !important; color:${T.text} !important; }
        .lp-input { width:100%; background:${T.surface}; border:1px solid ${T.bdr}; border-radius:8px; padding:11px 12px 11px 38px; color:${T.text}; font-family:${T.sans}; font-size:13px; outline:none; transition:border-color .15s,box-shadow .15s; box-sizing:border-box; }
        .lp-input::placeholder { color:${T.muted2}; }
        .lp-input:focus { border-color:rgba(0,196,154,.5) !important; box-shadow:0 0 0 3px rgba(0,196,154,.08) !important; }
        .lp-input-err { border-color:rgba(247,111,111,.5) !important; box-shadow:0 0 0 3px rgba(247,111,111,.08) !important; }
        .lp-forgot:hover { border-color:${T.accent} !important; }
        .lp-submit:hover:not(:disabled) { background:#00daa9 !important; transform:translateY(-1px) !important; box-shadow:0 6px 20px rgba(0,196,154,.25) !important; }
        .lp-submit:active { transform:translateY(0) !important; }
        .lp-ch-wa   { border-color:rgba(37,211,102,.2)!important;  color:#25d366!important; }
        .lp-ch-sms  { border-color:rgba(79,163,247,.2)!important;  color:${T.accent2}!important; }
        .lp-ch-fb   { border-color:rgba(24,119,242,.2)!important;  color:#1877f2!important; }
        .lp-ch-ussd { border-color:rgba(247,184,79,.2)!important;  color:#f7b84f!important; }
        .lp-ch-web  { border-color:rgba(0,196,154,.2)!important;   color:${T.accent}!important; }
      `}</style>

      {/* Canvas particle background */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />

      {/* Grid overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        backgroundImage: `linear-gradient(rgba(0,196,154,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,196,154,.03) 1px,transparent 1px)`,
        backgroundSize: "48px 48px",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)",
      }} />

      {/* Main layout */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "grid", gridTemplateColumns: "1fr 480px", height: "100vh",
      }}>

        {/* ── LEFT PANEL ── */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "48px 56px", position: "relative", overflow: "hidden",
          borderRight: `1px solid ${T.bdr2}`,
        }}>

          {/* Logo */}
          <div>
            <div style={{ fontFamily: T.display, fontSize: 36, fontWeight: 300, color: T.accent, letterSpacing: "-0.03em", lineHeight: 1 }}>
              OP1NA1
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 6 }}>
              Sistema Integrado · Mulenvos · Luanda
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 32, maxWidth: 520 }}>

            {/* Tagline */}
            <div>
              <div style={{ fontFamily: T.display, fontSize: "clamp(28px,3.2vw,44px)", fontWeight: 300, lineHeight: 1.2, letterSpacing: "-0.02em", color: T.text }}>
                A voz dos cidadãos<br />
                em <em style={{ fontStyle: "italic", color: T.accent }}>dados que decidem.</em>
              </div>
            </div>

            <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.7, maxWidth: 420 }}>
              Plataforma omnicanal de participação cidadã e inteligência territorial para a Administração Municipal dos Mulenvos. 882.014 habitantes. 10 bairros. 3 estratos geodemográficos.
            </div>

            {/* Stat strip */}
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "stretch" }}>
              {[
                { val: "57,7%", lbl: "Preferem modelo híbrido" },
                { val: "83,6%", lbl: "Confiam com mediador" },
                { val: "390",   lbl: "Inquiridos validados" },
              ].flatMap((s, i) => [
                ...(i > 0 ? [<div key={`div-${i}`} style={{ width: 1, background: T.bdr2, alignSelf: "stretch" }} />] : []),
                <div key={s.val}>
                  <div style={{ fontFamily: T.display, fontSize: 28, fontWeight: 300, color: T.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{s.lbl}</div>
                </div>,
              ])}
            </div>

            {/* Channel pills */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2, letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 2 }}>Canais</span>
              {[
                { cls: "lp-ch-wa",   label: "WhatsApp" },
                { cls: "lp-ch-sms",  label: "SMS"      },
                { cls: "lp-ch-fb",   label: "Facebook"  },
                { cls: "lp-ch-ussd", label: "USSD"      },
                { cls: "lp-ch-web",  label: "Portal"    },
              ].map((ch, i) => (
                <span key={ch.label} className={ch.cls} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontFamily: T.mono, fontSize: 9, padding: "3px 10px",
                  borderRadius: 20, border: `1px solid ${T.bdr}`, color: T.muted,
                  animation: `lp-pill-in 0.5s ease ${i * 0.1}s both`,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block", flexShrink: 0 }} />
                  {ch.label}
                </span>
              ))}
            </div>

            {/* Hypothesis badges */}
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "H1 — Canais formais vs. informais", color: "#f7b84f", bg: "rgba(247,184,79,.06)", border: "rgba(247,184,79,.25)" },
                { label: "H2 — Aceitação TAM",                color: T.accent2, bg: "rgba(79,163,247,.06)", border: "rgba(79,163,247,.25)" },
                { label: "H3 — Modelo híbrido ✓",            color: T.accent,  bg: "rgba(0,196,154,.06)",  border: "rgba(0,196,154,.25)"  },
              ].map(b => (
                <span key={b.label} style={{
                  fontFamily: T.mono, fontSize: 9, padding: "4px 10px", borderRadius: 4,
                  border: `1px solid ${b.border}`, background: b.bg, color: b.color, lineHeight: 1.4,
                }}>{b.label}</span>
              ))}
            </div>
          </div>

          {/* Left footer */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.mono, fontSize: 9, color: T.accent }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", background: T.accent,
                animation: "lp-pulse 2s ease-in-out infinite",
              }} />
              Sistema operacional
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2, letterSpacing: "0.06em", lineHeight: 1.6 }}>
              UAN · Faculdade de Ciências Sociais · Geodemografia<br />
              Modelo Híbrido de Participação Cidadã · Luanda 2026
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "32px 48px",
          background: T.panel,
          borderLeft: `1px solid ${T.bdr}`,
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative radial glows */}
          <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: 200, background: "radial-gradient(circle at top right,rgba(0,196,154,.06),transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 180, height: 180, background: "radial-gradient(circle at bottom left,rgba(79,163,247,.04),transparent 70%)", pointerEvents: "none" }} />

          <div style={{ width: "100%", maxWidth: 360, animation: "lp-form-in 0.6s cubic-bezier(.4,0,.2,1) both" }}>

            {/* SUCCESS STATE */}
            {isSuccess && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", padding: 32 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: "rgba(0,196,154,.1)", border: "1px solid rgba(0,196,154,.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "lp-pop-in 0.4s cubic-bezier(.34,1.56,.64,1)",
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00c49a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 300, color: T.accent }}>Acesso autorizado</div>
                <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, lineHeight: 1.6 }}>
                  Bem-vindo ao OP1NA1.<br />A redirecionar para o seu painel...
                </div>
                <div style={{ width: "100%", height: 3, background: T.bdr, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", background: T.accent, borderRadius: 10,
                    width: `${redirectPct}%`,
                    transition: "width 2.5s linear",
                  }} />
                </div>
              </div>
            )}

            {/* FORM */}
            {!isSuccess && (
              <>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12 }}>
                  Painel de controlo · OP1NA1
                </div>
                <div style={{ fontFamily: T.display, fontSize: 28, fontWeight: 300, letterSpacing: "-0.02em", color: T.text, lineHeight: 1.2, marginBottom: 6 }}>
                  Iniciar sessão
                </div>
                <div style={{ fontSize: 13, color: T.muted, marginBottom: 32, lineHeight: 1.5 }}>
                  Seleccione o seu perfil e introduza as credenciais.
                </div>

                {/* Role selector */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 24 }}>
                  {ROLES.map(r => {
                    const active = role === r.id;
                    return (
                      <div
                        key={r.id}
                        className="lp-role-opt"
                        onClick={() => setRole(r.id)}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                          padding: "10px 8px", borderRadius: 8, position: "relative", overflow: "hidden",
                          border: `1px solid ${active ? T.accent : T.bdr}`,
                          background: active ? "rgba(0,196,154,.06)" : T.surface,
                          cursor: "pointer",
                        }}
                      >
                        {active && (
                          <span style={{ position: "absolute", top: 4, right: 7, fontSize: 8, color: T.accent, fontFamily: T.mono }}>✓</span>
                        )}
                        <span style={{ fontSize: 18, lineHeight: 1 }}>{r.icon}</span>
                        <span style={{ fontFamily: T.mono, fontSize: 9, color: active ? T.accent : T.muted, letterSpacing: "0.06em", textAlign: "center" }}>
                          {r.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Error banner */}
                {isError && errorMsg && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 12px", background: "rgba(247,111,111,.06)",
                    border: "1px solid rgba(247,111,111,.2)", borderRadius: 7,
                    marginBottom: 16, fontFamily: T.mono, fontSize: 10, color: T.danger,
                    animation: "lp-shake 0.4s ease",
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {errorMsg}
                  </div>
                )}

                {/* Fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>

                  {/* Email */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Endereço de email
                    </div>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted2} strokeWidth="1.8" style={{ position: "absolute", left: 12, pointerEvents: "none", flexShrink: 0 }}>
                        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 7L2 7" />
                      </svg>
                      <input
                        type="email"
                        className={`lp-input${emailErr ? " lp-input-err" : ""}`}
                        placeholder="utilizador@mulenvos.ao"
                        autoComplete="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); clearFieldErrors(); }}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                      />
                    </div>
                    {emailErr && <div style={{ fontFamily: T.mono, fontSize: 9, color: T.danger, letterSpacing: "0.04em" }}>{emailErr}</div>}
                  </div>

                  {/* Password */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Palavra-passe
                    </div>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted2} strokeWidth="1.8" style={{ position: "absolute", left: 12, pointerEvents: "none" }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <input
                        type={showPass ? "text" : "password"}
                        className={`lp-input${passErr ? " lp-input-err" : ""}`}
                        placeholder="••••••••••"
                        autoComplete="current-password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); clearFieldErrors(); }}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        style={{ position: "absolute", right: 12, background: "none", border: "none", cursor: "pointer", color: T.muted2, padding: 2, lineHeight: 0 }}
                        aria-label="Mostrar palavra-passe"
                      >
                        {showPass ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M6.53 6.53 17.47 17.47" />
                            <path d="M10.73 10.73a3 3 0 0 0 4.24 4.24" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {passErr && <div style={{ fontFamily: T.mono, fontSize: 9, color: T.danger, letterSpacing: "0.04em" }}>{passErr}</div>}
                  </div>
                </div>

                {/* Options row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12, color: T.muted, userSelect: "none" }}>
                    <div
                      onClick={() => setRemember(v => !v)}
                      style={{
                        width: 14, height: 14, borderRadius: 3,
                        border: `1px solid ${remember ? T.accent : T.bdr2}`,
                        background: remember ? T.accent : T.surface,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, transition: "all .14s", cursor: "pointer",
                      }}
                    >
                      {remember && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <polyline points="1,3 3,5 7,1" stroke="#05120e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    Manter sessão
                  </label>
                  <a href="#" className="lp-forgot" style={{
                    fontFamily: T.mono, fontSize: 9, color: T.accent, cursor: "pointer",
                    letterSpacing: "0.06em", textDecoration: "none",
                    borderBottom: "1px solid rgba(0,196,154,.3)", paddingBottom: 1, transition: "border-color .14s",
                  }}>
                    Recuperar acesso
                  </a>
                </div>

                {/* Security note */}
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "10px 12px", background: "rgba(0,196,154,.04)",
                  border: "1px solid rgba(0,196,154,.12)", borderRadius: 7, marginBottom: 20,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00c49a" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                  </svg>
                  <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: "0.04em", lineHeight: 1.6 }}>
                    Ligação encriptada TLS 1.3 · JWT + refresh token httpOnly · Rate limit: 5 tentativas / 15 min · Sessão auditada
                  </div>
                </div>

                {/* Submit */}
                <button
                  className="lp-submit"
                  onClick={handleLogin}
                  disabled={isLoading}
                  style={{
                    width: "100%", padding: 13,
                    background: isLoading ? T.accentD : T.accent,
                    color: "#05120e", border: "none", borderRadius: 8,
                    fontFamily: T.sans, fontSize: 13, fontWeight: 500,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    transition: "all .18s", display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 8, marginBottom: 14,
                    letterSpacing: "0.01em",
                  }}
                >
                  {isLoading ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "lp-spin .7s linear infinite" }}>
                      <circle cx="7" cy="7" r="5.5" stroke="rgba(5,18,14,.3)" strokeWidth="2" />
                      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="#05120e" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                  {isLoading ? "A autenticar..." : "Entrar no sistema"}
                </button>

                {/* OR divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1, height: 1, background: T.bdr }} />
                  <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2, letterSpacing: "0.1em" }}>ou aceder via</div>
                  <div style={{ flex: 1, height: 1, background: T.bdr }} />
                </div>

                {/* Alt login */}
                <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
                  <button
                    className="lp-alt-btn"
                    onClick={() => handleAlt("Microsoft")}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 9, borderRadius: 7, border: `1px solid ${T.bdr}`, background: T.surface, fontSize: 12, color: T.muted }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M11.4 2H2v9.4h9.4V2Z" fill="#f25022" /><path d="M22 2h-9.4v9.4H22V2Z" fill="#7fba00" />
                      <path d="M11.4 12.6H2V22h9.4v-9.4Z" fill="#00a4ef" /><path d="M22 12.6h-9.4V22H22v-9.4Z" fill="#ffb900" />
                    </svg>
                    Microsoft SSO
                  </button>
                  <button
                    className="lp-alt-btn"
                    onClick={() => handleAlt("Google")}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 9, borderRadius: 7, border: `1px solid ${T.bdr}`, background: T.surface, fontSize: 12, color: T.muted }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" fill="#4285f4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34a853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z" fill="#fbbc05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#ea4335" />
                    </svg>
                    Google
                  </button>
                </div>

                {/* Footer */}
                <div style={{ textAlign: "center", fontFamily: T.mono, fontSize: 9, color: T.muted2, letterSpacing: "0.06em", lineHeight: 1.7 }}>
                  OP1NA1 v1.0 · Administração Municipal dos Mulenvos · Luanda, Angola<br />
                  UAN · Geodemografia · 2026 · Dados protegidos por lei angolana de protecção de dados
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
