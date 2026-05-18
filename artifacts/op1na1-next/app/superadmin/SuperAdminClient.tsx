"use client";

import { useState, useEffect, useCallback } from "react";
import type { Municipality, CreateMunicipalityInput } from "@/lib/municipalities";

const T = {
  bg:      "#080c10",
  surface: "#0e1419",
  srf2:    "#111720",
  bdr:     "rgba(255,255,255,0.07)",
  bdr2:    "rgba(255,255,255,0.12)",
  accent:  "#00c49a",
  text:    "#e8edf4",
  muted:   "#6b7d96",
  danger:  "#f76f6f",
  warn:    "#f5a623",
  mono:    "'DM Mono', monospace",
  sans:    "'DM Sans', sans-serif",
  display: "'Fraunces', serif",
} as const;

function Badge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontFamily: T.mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
      padding: "2px 8px", borderRadius: 100,
      background: active ? "rgba(0,196,154,.12)" : "rgba(247,111,111,.12)",
      color: active ? T.accent : T.danger,
      border: `1px solid ${active ? "rgba(0,196,154,.3)" : "rgba(247,111,111,.3)"}`,
    }}>
      {active ? "activo" : "inactivo"}
    </span>
  );
}

const EMPTY_FORM: CreateMunicipalityInput = {
  slug: "", name: "", province: "", country: "Angola",
  primaryColor: "#00c49a", contactEmail: "", contactPhone: "",
};

export function SuperAdminClient() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [showCreate, setShowCreate]         = useState(false);
  const [form, setForm]                     = useState<CreateMunicipalityInput>(EMPTY_FORM);
  const [saving, setSaving]                 = useState(false);
  const [saveError, setSaveError]           = useState<string | null>(null);
  const [toggling, setToggling]             = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/super/municipalities");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data: Municipality[] };
      setMunicipalities(json.data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch("/api/super/municipalities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(m: Municipality) {
    setToggling(m.slug);
    try {
      await fetch(`/api/super/municipalities/${m.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !m.active }),
      });
      await load();
    } finally {
      setToggling(null);
    }
  }

  const field = (key: keyof CreateMunicipalityInput, label: string, placeholder?: string, type = "text") => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {label}
      </label>
      <input
        type={type}
        value={form[key] ?? ""}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{
          background: T.srf2, border: `1px solid ${T.bdr2}`, borderRadius: 7,
          padding: "9px 12px", color: T.text, fontFamily: T.sans, fontSize: 13, outline: "none",
        }}
      />
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, color: T.text, fontFamily: T.sans }}>
      {/* Header */}
      <header style={{ padding: "20px 32px", borderBottom: `1px solid ${T.bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 300, color: T.accent, letterSpacing: "-0.02em" }}>OP1NA1</div>
          <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 2 }}>Superadmin · Municípios</div>
        </div>
        <a href="/admin" style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, textDecoration: "none" }}>← Voltar ao admin</a>
      </header>

      <main id="main-content" style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
        {/* Page title + create button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ fontFamily: T.display, fontSize: 22, fontWeight: 300, margin: 0, letterSpacing: "-0.02em" }}>
            Municípios
          </h1>
          <button
            onClick={() => { setShowCreate(v => !v); setSaveError(null); }}
            style={{
              padding: "8px 18px", background: T.accent, color: "#000", border: "none", borderRadius: 7,
              fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {showCreate ? "Cancelar" : "+ Novo município"}
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <form onSubmit={e => { void handleCreate(e); }} style={{ background: T.surface, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: "20px 24px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>Novo município</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {field("slug",     "Slug (URL)",  "ex: luanda-sambizanga")}
              {field("name",     "Nome",        "ex: Município de Luanda-Sambizanga")}
              {field("province", "Província",   "ex: Luanda")}
              {field("country",  "País",        "Angola")}
              {field("primaryColor", "Cor principal", "#00c49a", "color")}
              {field("contactEmail", "Email de contacto", "municipio@gov.ao", "email")}
            </div>
            {field("contactPhone", "Telefone", "+244XXXXXXXXX", "tel")}
            {saveError && (
              <div role="alert" style={{ color: T.danger, fontFamily: T.sans, fontSize: 12 }}>{saveError}</div>
            )}
            <button
              type="submit"
              disabled={saving}
              style={{ alignSelf: "flex-start", padding: "9px 22px", background: T.accent, color: "#000", border: "none", borderRadius: 7, fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "A criar…" : "Criar município"}
            </button>
          </form>
        )}

        {/* Error / loading */}
        {error && <div role="alert" style={{ color: T.danger, fontFamily: T.sans, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        {loading && <div style={{ color: T.muted, fontFamily: T.sans, fontSize: 13 }}>A carregar…</div>}

        {/* Municipality list */}
        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {municipalities.length === 0 && (
              <div style={{ color: T.muted, fontFamily: T.sans, fontSize: 13, textAlign: "center", padding: "40px 0" }}>
                Nenhum município registado.
              </div>
            )}
            {municipalities.map(m => (
              <div key={m.slug} style={{
                background: T.surface, border: `1px solid ${T.bdr}`, borderRadius: 10,
                padding: "16px 20px", display: "flex", alignItems: "center", gap: 16,
              }}>
                {/* Colour swatch */}
                <div style={{ width: 32, height: 32, borderRadius: 8, background: m.primaryColor ?? T.accent, flexShrink: 0 }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600 }}>{m.name}</span>
                    <Badge active={m.active} />
                  </div>
                  <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, marginTop: 3, letterSpacing: "0.06em" }}>
                    /m/{m.slug} · {m.province} · {m.country}
                  </div>
                  {m.contactEmail && (
                    <div style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, marginTop: 2 }}>{m.contactEmail}</div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <a
                    href={`/m/${m.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ padding: "6px 12px", background: T.srf2, border: `1px solid ${T.bdr2}`, borderRadius: 6, color: T.muted, fontFamily: T.sans, fontSize: 11, textDecoration: "none" }}
                  >
                    Portal →
                  </a>
                  <button
                    onClick={() => { void toggleActive(m); }}
                    disabled={toggling === m.slug}
                    aria-label={m.active ? `Desactivar ${m.name}` : `Activar ${m.name}`}
                    style={{
                      padding: "6px 12px", border: `1px solid ${T.bdr2}`, borderRadius: 6, cursor: "pointer",
                      background: T.srf2, color: m.active ? T.danger : T.accent, fontFamily: T.sans, fontSize: 11,
                      opacity: toggling === m.slug ? 0.5 : 1,
                    }}
                  >
                    {m.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {!loading && municipalities.length > 0 && (
          <div style={{ marginTop: 20, fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: "0.08em" }}>
            {municipalities.filter(m => m.active).length} activo(s) · {municipalities.length} total
          </div>
        )}
      </main>
    </div>
  );
}
