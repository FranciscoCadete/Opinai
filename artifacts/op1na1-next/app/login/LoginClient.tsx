"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

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
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.2 + 0.3, a: Math.random() * 0.5 + 0.1,
        update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > W) this.vx *= -1; if (this.y < 0 || this.y > H) this.vy *= -1; },
        draw() { ctx!.beginPath(); ctx!.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx!.fillStyle = `rgba(0,196,154,${this.a})`; ctx!.fill(); },
      };
    }

    let particles: Particle[] = [];

    function resize() { W = canvas!.width = window.innerWidth; H = canvas!.height = window.innerHeight; }

    function drawLines() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const a = (1 - dist / 120) * 0.08;
            ctx!.beginPath(); ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(0,196,154,${a})`; ctx!.lineWidth = 0.5; ctx!.stroke();
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
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("resize", onResize); };
  }, []);
}

type Role = "admin" | "gestor" | "analista" | "tecnico";
type LoginState = "idle" | "loading" | "success" | "error";

const ROLES: { id: Role; label: string; icon: string }[] = [
  { id: "admin",    label: "Administrador", icon: "🛡" },
  { id: "gestor",   label: "Gestor",        icon: "📊" },
  { id: "analista", label: "Analista",      icon: "🔬" },
  { id: "tecnico",  label: "Técnico",       icon: "🔧" },
];

export function LoginClient() {
  const router = useRouter();
  const auth = useAuth();
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

  useEffect(() => {
    if (loginState !== "success") return;
    const t1 = setTimeout(() => setRedirectPct(100), 100);
    const t2 = setTimeout(() => router.push("/admin"), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [loginState, router]);

  function validate() {
    let ok = true;
    setEmailErr(""); setPassErr("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailErr("Introduza um email válido."); ok = false; }
    if (!password || password.length < 4) { setPassErr("A palavra-passe é obrigatória."); ok = false; }
    return ok;
  }

  async function handleLogin() {
    if (!validate()) return;
    setErrorMsg(""); setLoginState("loading");
    try {
      await auth.login(email.trim().toLowerCase(), password);
      setLoginState("success");
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setErrorMsg(t("auth.errorInvalid"));
        else if (e.status === 403) setErrorMsg(t("auth.errorForbidden"));
        else setErrorMsg(e.message);
      } else if (e instanceof Error) {
        setErrorMsg(e.message || t("auth.errorNetwork"));
      } else {
        setErrorMsg(t("auth.errorNetwork"));
      }
      setLoginState("error");
    }
  }

  function clearFieldErrors() { setEmailErr(""); setPassErr(""); if (loginState === "error") setLoginState("idle"); }

  const isLoading = loginState === "loading";
  const isSuccess = loginState === "success";
  const isError   = loginState === "error";

  return (
    <div style={{ position: "fixed", inset: 0, background: T.bg, color: T.text, fontFamily: T.sans, fontSize: 14, lineHeight: 1.5, overflow: "auto" }}>
      <style>{`
        @keyframes lp-pulse   { 0%,100%{box-shadow:0 0 0 0 rgba(0,196,154,.5)} 50%{box-shadow:0 0 0 5px rgba(0,196,154,0)} }
        @keyframes lp-pill-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes lp-form-in { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes lp-pop-in  { from{transform:scale(.5);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes lp-shake   { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }
        @keyframes lp-spin    { to{transform:rotate(360deg)} }
        .lp-role-opt { cursor:pointer; transition:border-color .16s,background .16s; }
        .lp-role-opt:hover { border-color:${T.bdr2} !important; }
        .lp-input { width:100%; background:${T.surface}; border:1px solid ${T.bdr}; border-radius:8px; padding:11px 12px 11px 38px; color:${T.text}; font-family:${T.sans}; font-size:13px; outline:none; transition:border-color .15s,box-shadow .15s; box-sizing:border-box; }
        .lp-input::placeholder { color:${T.muted2}; }
        .lp-input:focus { border-color:rgba(0,196,154,.5) !important; box-shadow:0 0 0 3px rgba(0,196,154,.08) !important; }
        .lp-input-err { border-color:rgba(247,111,111,.5) !important; box-shadow:0 0 0 3px rgba(247,111,111,.08) !important; }
        .lp-forgot:hover { border-color:${T.accent} !important; }
        .lp-submit:hover:not(:disabled) { background:#00daa9 !important; transform:translateY(-1px) !important; box-shadow:0 6px 20px rgba(0,196,154,.25) !important; }
        .lp-submit:active { transform:translateY(0) !important; }
        /* ── Mobile responsiveness ── */
        .lp-grid { display:grid; grid-template-columns:1fr 480px; height:100vh; }
        .lp-left { display:flex; }
        .lp-right { display:flex; align-items:center; justify-content:center; padding:32px 48px; background:${T.panel}; position:relative; overflow:hidden; }
        .lp-mobile-logo { display:none; }
        @media(max-width:767px){
          .lp-grid { grid-template-columns:1fr; overflow-y:auto; height:auto; min-height:100dvh; }
          .lp-left { display:none; }
          .lp-right { padding:32px 24px 40px; min-height:100dvh; align-items:flex-start; padding-top:72px; }
          .lp-mobile-logo { display:block; }
        }
      `}</style>

      {/* Back to portal */}
      <div style={{ position: "fixed", top: 16, left: 20, zIndex: 20 }}>
        <button
          onClick={() => router.push("/citizen-portal")}
          aria-label={`${t("auth.backToCitizenPortal")} — OP1NA1`}
          style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.mono, fontSize: 9, color: T.muted, background: "rgba(14,20,25,0.8)", border: `1px solid ${T.bdr2}`, borderRadius: 20, padding: "5px 12px", cursor: "pointer", backdropFilter: "blur(8px)", letterSpacing: "0.06em", transition: "all .15s" }}
          onMouseOver={e => (e.currentTarget.style.color = T.accent)}
          onMouseOut={e => (e.currentTarget.style.color = T.muted)}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          {t("auth.backToCitizenPortal")}
        </button>
      </div>

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />

      {/* Grid overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(0,196,154,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,196,154,.03) 1px,transparent 1px)`, backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)" }} />

      <div className="lp-grid" style={{ position: "relative", zIndex: 10 }}>

        {/* LEFT PANEL */}
        <div className="lp-left" style={{ flexDirection: "column", justifyContent: "space-between", padding: "48px 56px", borderRight: `1px solid ${T.bdr2}` }}>
          <div>
            <div style={{ fontFamily: T.display, fontSize: 36, fontWeight: 300, color: T.accent, letterSpacing: "-0.03em", lineHeight: 1 }}>OP1NA1</div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 6 }}>Sistema Integrado · Mulenvos · Luanda</div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 32, maxWidth: 520 }}>
            <div>
              <div style={{ fontFamily: T.display, fontSize: "clamp(28px,3.2vw,44px)", fontWeight: 300, lineHeight: 1.2, letterSpacing: "-0.02em", color: T.text }}>
                A voz dos cidadãos<br />em <em style={{ fontStyle: "italic", color: T.accent }}>dados que decidem.</em>
              </div>
            </div>
            <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.7, maxWidth: 420 }}>
              Plataforma omnicanal de participação cidadã e inteligência territorial para a Administração Municipal dos Mulenvos. 882.014 habitantes. 10 bairros. 3 estratos geodemográficos.
            </div>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
              {[{ val: "57,7%", lbl: "Preferem modelo híbrido" }, { val: "83,6%", lbl: "Confiam com mediador" }, { val: "390", lbl: "Inquiridos validados" }].flatMap((s, i) => [
                ...(i > 0 ? [<div key={`div-${i}`} style={{ width: 1, background: T.bdr2, alignSelf: "stretch" }} />] : []),
                <div key={s.val}><div style={{ fontFamily: T.display, fontSize: 28, fontWeight: 300, color: T.text }}>{s.val}</div><div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{s.lbl}</div></div>,
              ])}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "H1 — Canais formais vs. informais", color: "#f7b84f", bg: "rgba(247,184,79,.06)", border: "rgba(247,184,79,.25)" },
                { label: "H2 — Aceitação TAM", color: T.accent2, bg: "rgba(79,163,247,.06)", border: "rgba(79,163,247,.25)" },
                { label: "H3 — Modelo híbrido ✓", color: T.accent, bg: "rgba(0,196,154,.06)", border: "rgba(0,196,154,.25)" },
              ].map(b => (
                <span key={b.label} style={{ fontFamily: T.mono, fontSize: 9, padding: "4px 10px", borderRadius: 4, border: `1px solid ${b.border}`, background: b.bg, color: b.color }}>{b.label}</span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.mono, fontSize: 9, color: T.accent }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, animation: "lp-pulse 2s ease-in-out infinite" }} />
              Sistema operacional
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2, letterSpacing: "0.06em", lineHeight: 1.6 }}>
              UAN · Faculdade de Ciências Sociais · Geodemografia<br />
              Modelo Híbrido de Participação Cidadã · Luanda 2026
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lp-right">
          <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: 200, background: "radial-gradient(circle at top right,rgba(0,196,154,.06),transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 180, height: 180, background: "radial-gradient(circle at bottom left,rgba(79,163,247,.04),transparent 70%)", pointerEvents: "none" }} />

          <div id="main-content" style={{ width: "100%", maxWidth: 360, animation: "lp-form-in 0.6s cubic-bezier(.4,0,.2,1) both" }}>
            {/* Mobile-only logo */}
            <div className="lp-mobile-logo" style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: T.display, fontSize: 28, fontWeight: 300, color: T.accent, letterSpacing: "-0.03em" }}>OP1NA1</div>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 3 }}>Sistema Integrado · Mulenvos · Luanda</div>
            </div>

            {isSuccess && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", padding: 32 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(0,196,154,.1)", border: "1px solid rgba(0,196,154,.3)", display: "flex", alignItems: "center", justifyContent: "center", animation: "lp-pop-in 0.4s cubic-bezier(.34,1.56,.64,1)" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00c49a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 300, color: T.accent }}>{t("auth.successTitle")}</div>
                <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, lineHeight: 1.6 }}>
                  {t("auth.successMessage").split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
                </div>
                <div style={{ width: "100%", height: 3, background: T.bdr, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: T.accent, borderRadius: 10, width: `${redirectPct}%`, transition: "width 2.5s linear" }} />
                </div>
              </div>
            )}

            {!isSuccess && (
              <>
                <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12 }}>{t("auth.breadcrumb")}</div>
                <h1 style={{ fontFamily: T.display, fontSize: 28, fontWeight: 300, letterSpacing: "-0.02em", color: T.text, lineHeight: 1.2, margin: "0 0 6px" }}>{t("auth.title")}</h1>
                <p style={{ fontSize: 13, color: T.muted, marginBottom: 32, lineHeight: 1.5 }}>{t("auth.subtitle")}</p>

                <div role="radiogroup" aria-label="Seleccionar perfil" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 24 }}>
                  {ROLES.map(r => {
                    const active = role === r.id;
                    const label = t(`auth.roles.${r.id}`, r.label);
                    return (
                      <div key={r.id} className="lp-role-opt" role="radio" aria-checked={active} tabIndex={active ? 0 : -1}
                        onClick={() => setRole(r.id)} onKeyDown={e => (e.key === "Enter" || e.key === " ") && setRole(r.id)} aria-label={label}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 8px", borderRadius: 8, position: "relative", overflow: "hidden", border: `1px solid ${active ? T.accent : T.bdr}`, background: active ? "rgba(0,196,154,.06)" : T.surface, cursor: "pointer" }}
                      >
                        {active && <span aria-hidden="true" style={{ position: "absolute", top: 4, right: 7, fontSize: 8, color: T.accent, fontFamily: T.mono }}>✓</span>}
                        <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>{r.icon}</span>
                        <span style={{ fontFamily: T.mono, fontSize: 9, color: active ? T.accent : T.muted, letterSpacing: "0.06em", textAlign: "center" }}>{label}</span>
                      </div>
                    );
                  })}
                </div>

                <div role="alert" aria-live="assertive" aria-atomic="true" style={{ minHeight: 0 }}>
                  {isError && errorMsg && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(247,111,111,.06)", border: "1px solid rgba(247,111,111,.2)", borderRadius: 7, marginBottom: 16, fontFamily: T.mono, fontSize: 10, color: T.danger, animation: "lp-shake 0.4s ease" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {errorMsg}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label htmlFor="login-email" style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("auth.emailLabel")}</label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted2} strokeWidth="1.8" style={{ position: "absolute", left: 12, pointerEvents: "none" }} aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>
                      <input id="login-email" type="email" className={`lp-input${emailErr ? " lp-input-err" : ""}`} placeholder={t("auth.emailPlaceholder")} autoComplete="email"
                        aria-describedby={emailErr ? "email-error" : undefined} aria-invalid={!!emailErr}
                        value={email} onChange={e => { setEmail(e.target.value); clearFieldErrors(); }} onKeyDown={e => e.key === "Enter" && handleLogin()} />
                    </div>
                    {emailErr && <div id="email-error" role="alert" style={{ fontFamily: T.mono, fontSize: 9, color: T.danger }}>{emailErr}</div>}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label htmlFor="login-password" style={{ fontFamily: T.mono, fontSize: 9, color: T.muted2, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("auth.passwordLabel")}</label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted2} strokeWidth="1.8" style={{ position: "absolute", left: 12, pointerEvents: "none" }} aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      <input id="login-password" type={showPass ? "text" : "password"} className={`lp-input${passErr ? " lp-input-err" : ""}`} placeholder={t("auth.passwordPlaceholder")} autoComplete="current-password"
                        aria-describedby={passErr ? "pass-error" : undefined} aria-invalid={!!passErr}
                        value={password} onChange={e => { setPassword(e.target.value); clearFieldErrors(); }} onKeyDown={e => e.key === "Enter" && handleLogin()} />
                      <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 12, background: "none", border: "none", cursor: "pointer", color: T.muted2, padding: 2 }}
                        aria-label={showPass ? t("auth.hidePassword") : t("auth.showPassword")}>
                        {showPass
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M6.53 6.53 17.47 17.47"/><path d="M10.73 10.73a3 3 0 0 0 4.24 4.24"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    </div>
                    {passErr && <div id="pass-error" role="alert" style={{ fontFamily: T.mono, fontSize: 9, color: T.danger }}>{passErr}</div>}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12, color: T.muted, userSelect: "none" }}>
                    <div onClick={() => setRemember(v => !v)} style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${remember ? T.accent : T.bdr2}`, background: remember ? T.accent : T.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .14s", cursor: "pointer" }}>
                      {remember && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><polyline points="1,3 3,5 7,1" stroke="#05120e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    Manter sessão
                  </label>
                  <button type="button" className="lp-forgot" onClick={() => alert(t("auth.forgotContact"))} style={{ fontFamily: T.mono, fontSize: 9, color: T.accent, cursor: "pointer", letterSpacing: "0.06em", background: "none", border: "none", borderBottom: "1px solid rgba(0,196,154,.3)", paddingBottom: 1, transition: "border-color .14s" }}>
                    {t("auth.forgotAccess")}
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", background: "rgba(0,196,154,.04)", border: "1px solid rgba(0,196,154,.12)", borderRadius: 7, marginBottom: 20 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00c49a" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>
                  <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: "0.04em", lineHeight: 1.6 }}>{t("auth.securityNote")}</div>
                </div>

                <button className="lp-submit" onClick={handleLogin} disabled={isLoading}
                  style={{ width: "100%", padding: 13, background: isLoading ? T.accentD : T.accent, color: "#05120e", border: "none", borderRadius: 8, fontFamily: T.sans, fontSize: 13, fontWeight: 500, cursor: isLoading ? "not-allowed" : "pointer", transition: "all .18s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}>
                  {isLoading
                    ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "lp-spin .7s linear infinite" }}><circle cx="7" cy="7" r="5.5" stroke="rgba(5,18,14,.3)" strokeWidth="2"/><path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="#05120e" strokeWidth="2" strokeLinecap="round"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  }
                  {isLoading ? t("auth.submitting") : t("auth.submitButton")}
                </button>

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
