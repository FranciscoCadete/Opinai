"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, RequireAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

const T = {
  bg:      "#080c10",
  surface: "#0e1419",
  srf2:    "#111720",
  bdr:     "rgba(255,255,255,0.07)",
  bdr2:    "rgba(255,255,255,0.12)",
  accent:  "#00c49a",
  text:    "#e8edf4",
  muted:   "#6b7d96",
  mono:    "'DM Mono', monospace",
  sans:    "'DM Sans', sans-serif",
  display: "'Fraunces', serif",
} as const;

const NAV_ITEMS = [
  { href: "/admin",          label: "Dashboard",     icon: "◈" },
  { href: "/admin/requests", label: "Pedidos",        icon: "◉" },
  { href: "/admin/reports",  label: "Relatórios",     icon: "◒" },
  { href: "/admin/users",    label: "Utilizadores",   icon: "◎" },
  { href: "/admin/audit",    label: "Auditoria",      icon: "◐" },
  { href: "/admin/channels", label: "Canais",         icon: "◑" },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <>
      {/* Backdrop — mobile only, rendered only when open */}
      {open && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="sidebar-backdrop"
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 49,
          }}
        />
      )}

      <nav
        aria-label="Navegação principal"
        className={`admin-sidebar${open ? " admin-sidebar--open" : ""}`}
        style={{
          width: 220, flexShrink: 0, background: T.surface,
          borderRight: `1px solid ${T.bdr}`,
          display: "flex", flexDirection: "column",
          padding: "24px 0", height: "100vh", position: "sticky", top: 0,
        }}
      >
        {/* Logo */}
        <div style={{ padding: "0 20px 24px", borderBottom: `1px solid ${T.bdr}`, marginBottom: 16, position: "relative" }}>
          <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 300, color: T.accent, letterSpacing: "-0.03em" }}>OP1NA1</div>
          <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 3 }}>Painel Admin</div>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="sidebar-close-btn"
            style={{
              position: "absolute", top: 0, right: 0,
              background: "transparent", border: "none",
              color: T.muted, cursor: "pointer", padding: 4,
              display: "none",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <ul role="list" style={{ listStyle: "none", margin: 0, padding: "0 10px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <button
                  onClick={() => { router.push(item.href); onClose(); }}
                  aria-current={active ? "page" : undefined}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 10px", borderRadius: 7, border: "none", cursor: "pointer",
                    background: active ? "rgba(0,196,154,.1)" : "transparent",
                    color: active ? T.accent : T.muted,
                    fontFamily: T.sans, fontSize: 13, fontWeight: active ? 500 : 400,
                    textAlign: "left", transition: "all .14s",
                  }}
                  onMouseOver={e => { if (!active) e.currentTarget.style.color = T.text; }}
                  onMouseOut={e => { if (!active) e.currentTarget.style.color = T.muted; }}
                >
                  <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1, fontFamily: "system-ui", width: 18, textAlign: "center" }}>{item.icon}</span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>

        {/* User info + logout */}
        <div style={{ padding: "16px 10px 0", borderTop: `1px solid ${T.bdr}` }}>
          {user && (
            <div style={{ padding: "8px 10px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontFamily: T.sans, fontSize: 12, color: T.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>{user.role}</div>
            </div>
          )}
          <button
            onClick={async () => { await logout(); router.push("/login"); }}
            aria-label={t("nav.logout", "Terminar sessão")}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 7, border: "none", cursor: "pointer", background: "transparent", color: T.muted, fontFamily: T.sans, fontSize: 13, textAlign: "left", transition: "color .14s" }}
            onMouseOver={e => (e.currentTarget.style.color = "#f76f6f")}
            onMouseOut={e => (e.currentTarget.style.color = T.muted)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            {t("nav.logout", "Terminar sessão")}
          </button>
        </div>
      </nav>
    </>
  );
}

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RequireAuth minRole="technician">
      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed !important;
            left: -220px;
            top: 0;
            height: 100vh !important;
            z-index: 50;
            transition: left .24s cubic-bezier(.4,0,.2,1);
          }
          .admin-sidebar--open { left: 0 !important; }
          .sidebar-close-btn  { display: flex !important; }
          .mobile-topbar      { display: flex !important; }
          /* ensure pages don't overflow horizontally on phones */
          #main-content { overflow-x: hidden; }
        }
        @media (min-width: 769px) {
          .admin-sidebar { position: sticky !important; left: 0 !important; }
          .mobile-topbar { display: none !important; }
        }
        /* Prevent text overflow on very small phones */
        @media (max-width: 400px) {
          .admin-sidebar { width: 85vw !important; }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.sans }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main id="main-content" style={{ flex: 1, overflow: "auto", minHeight: "100vh" }}>
          {/* Mobile top bar */}
          <div
            className="mobile-topbar"
            style={{
              display: "none",
              alignItems: "center", gap: 12,
              padding: "12px 16px",
              background: T.surface,
              borderBottom: `1px solid ${T.bdr}`,
              position: "sticky", top: 0, zIndex: 40,
            }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={sidebarOpen}
              style={{ background: "transparent", border: "none", color: T.muted, cursor: "pointer", padding: 8, display: "flex", borderRadius: 8, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="3" y1="6"  x2="21" y2="6"  />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 300, color: T.accent, letterSpacing: "-0.03em", flex: 1, minWidth: 0 }}>OP1NA1</div>
          </div>

          {children}
        </main>
      </div>
    </RequireAuth>
  );
}
