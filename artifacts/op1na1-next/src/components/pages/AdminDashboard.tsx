"use client";

// Adapted from artifacts/op1na1-architecture/src/pages/AdminDashboard.tsx
// To complete this migration: copy the full source file here and apply:
//   1. Keep this "use client" directive
//   2. Remove: import { useLocation } from "wouter"
//   3. Add:    import { useRouter } from "next/navigation"
//   4. Replace: const [, navigate] = useLocation()
//      With:    const router = useRouter()
//   5. Replace: navigate("/login") → router.push("/login")
//
// All other imports (@/lib/api, @/lib/auth, @/lib/useRealtimeEvents, react-i18next)
// resolve correctly in this package without modification.

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { listAdminRequests, type AdminRequestRow } from "@/lib/api";
import { useRealtimeEvents } from "@/lib/useRealtimeEvents";
import { useTranslation } from "react-i18next";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/login");
  }, [logout, router]);

  return (
    <main id="main-content" style={{ padding: 32, color: "#e8edf4", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 300, color: "#00c49a" }}>
          {t("dashboard.title", "Dashboard Admin")}
        </div>
        <button
          onClick={handleLogout}
          aria-label={t("nav.logout", "Terminar sessão")}
          style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "#6b7d96", cursor: "pointer", fontSize: 13 }}
        >
          {t("nav.logout", "Terminar sessão")}
        </button>
      </div>
      <p style={{ color: "#6b7d96", fontSize: 13 }}>
        Bem-vindo, {user?.name}. Copie o componente completo de{" "}
        <code style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#4fa3f7" }}>
          artifacts/op1na1-architecture/src/pages/AdminDashboard.tsx
        </code>{" "}
        e aplique a adaptação de navegação descrita no topo deste ficheiro.
      </p>
    </main>
  );
}

