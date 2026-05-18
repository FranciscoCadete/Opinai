"use client";

// Thin wrapper that sets the municipality context (via URL param propagation)
// and renders the shared CitizenPortal component.
//
// The slug is passed to the citizen portal so that:
//   1. API calls to POST /api/requests include { municipalitySlug }
//   2. Branding can be loaded from GET /api/super/municipalities/:slug
//   3. Direct links like op1na1.gov.ao/m/mulenvos work as standalone entry points

import { useEffect, useState } from "react";
import type { Municipality } from "@/lib/municipalities";

interface Props {
  slug: string;
}

const T = {
  bg:      "#080c10",
  accent:  "#00c49a",
  text:    "#e8edf4",
  muted:   "#6b7d96",
  sans:    "'DM Sans', sans-serif",
  display: "'Fraunces', serif",
} as const;

export function CitizenPortalSlugClient({ slug }: Props) {
  const [municipality, setMunicipality] = useState<Municipality | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/super/municipalities/${slug}`)
      .then(async res => {
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { data: Municipality };
        setMunicipality(json.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.sans, color: T.muted, fontSize: 13 }}>
        A carregar…
      </div>
    );
  }

  if (notFound || !municipality?.active) {
    return (
      <div style={{ minHeight: "100dvh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: T.sans, color: T.text, gap: 12, textAlign: "center", padding: 24 }}>
        <div style={{ fontFamily: T.display, fontSize: 28, fontWeight: 300, color: T.accent, letterSpacing: "-0.03em" }}>OP1NA1</div>
        <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Município não encontrado</h1>
        <p style={{ color: T.muted, fontSize: 13, maxWidth: 320, lineHeight: 1.7 }}>
          O endereço <strong>/m/{slug}</strong> não corresponde a um município activo na plataforma OP1NA1.
        </p>
        <a href="/citizen-portal" style={{ color: T.accent, fontSize: 13, textDecoration: "none" }}>
          Aceder ao Portal Principal →
        </a>
      </div>
    );
  }

  // Store slug in sessionStorage so the CitizenPortal component can read it
  // when building the POST /api/requests payload.
  useEffect(() => {
    sessionStorage.setItem("op1na1_municipality_slug", slug);
    sessionStorage.setItem("op1na1_municipality_name", municipality.name);
    if (municipality.primaryColor) {
      document.documentElement.style.setProperty("--accent", municipality.primaryColor);
    }
  }, [municipality, slug]);

  // The shared CitizenPortal is a large copy-and-adapt component (see src/components/pages/CitizenPortal.tsx).
  // For now, render a municipality-branded entry screen with a redirect to the shared portal.
  // When CitizenPortal.tsx is fully adapted, replace this with <CitizenPortalClient />.
  return (
    <div style={{ minHeight: "100dvh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: T.sans, color: T.text, gap: 20, textAlign: "center", padding: 24 }}>
      <div style={{ fontFamily: T.display, fontSize: 36, fontWeight: 300, color: municipality.primaryColor ?? T.accent, letterSpacing: "-0.03em" }}>
        OP1NA1
      </div>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>{municipality.name}</h1>
        <p style={{ color: T.muted, fontSize: 12, margin: 0 }}>{municipality.province} · Angola</p>
      </div>
      <p style={{ color: T.muted, fontSize: 14, maxWidth: 360, lineHeight: 1.7, margin: 0 }}>
        Portal de pedidos e reclamações do município de <strong style={{ color: T.text }}>{municipality.name}</strong>.
        Submeta problemas, sugestões e acompanhe o estado das suas solicitações.
      </p>
      <a
        href={`/citizen-portal?municipality=${slug}`}
        style={{
          display: "inline-block",
          padding: "12px 28px",
          background: municipality.primaryColor ?? T.accent,
          color: "#000",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 14,
          textDecoration: "none",
          transition: "opacity .14s",
        }}
        onMouseOver={e => (e.currentTarget.style.opacity = "0.85")}
        onMouseOut={e => (e.currentTarget.style.opacity = "1")}
      >
        Entrar no Portal
      </a>
      {municipality.contactEmail && (
        <p style={{ color: T.muted, fontSize: 11 }}>
          Contacto: <a href={`mailto:${municipality.contactEmail}`} style={{ color: T.muted }}>{municipality.contactEmail}</a>
        </p>
      )}
    </div>
  );
}
