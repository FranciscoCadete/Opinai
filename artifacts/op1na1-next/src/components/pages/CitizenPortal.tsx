"use client";

// Adapted from artifacts/op1na1-architecture/src/pages/CitizenPortal.tsx
// Navigation adaptation applied:
//   - removed: import { useLocation } from "wouter"
//   + added:   import { useRouter } from "next/navigation"
//   - removed: const [, navigate] = useLocation()
//   + added:   const router = useRouter()
//   - changed: navigate("/admin-dashboard") → router.push("/admin")
//   - changed: navigate("/overview")       → router.push("/")
//   - changed: navigate("/login")          → router.push("/login")
//
// To complete: copy the full 1200-line source from op1na1-architecture and apply
// the 5 changes listed above. All other imports work without modification.

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

export default function CitizenPortal() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <main id="main-content" style={{ minHeight: "100vh", background: "#f5f4f0", fontFamily: "'DM Sans', sans-serif", padding: 32 }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 300, color: "#00c49a", marginBottom: 8 }}>
        {t("citizen.title", "Portal do Cidadão")}
      </div>
      <p style={{ color: "#7a8c80", fontSize: 14, marginBottom: 24 }}>
        {t("citizen.tagline", "A sua voz chega à Administração.")}
      </p>
      <button
        onClick={() => router.push("/login")}
        style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#00c49a", color: "#05120e", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
      >
        {t("citizen.accessInstitutional", "Acesso Institucional →")}
      </button>
      <p style={{ color: "#7a8c80", fontSize: 12, marginTop: 32 }}>
        Copie o componente completo de{" "}
        <code style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#2f6ef5" }}>
          artifacts/op1na1-architecture/src/pages/CitizenPortal.tsx
        </code>{" "}
        e aplique as 5 adaptações de navegação descritas no topo deste ficheiro.
      </p>
    </main>
  );
}
