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
      {/* Backdrop — mobile only, starts BELOW the topbar (68px) */}
      {/* so the topbar stays accessible regardless of z-index stacking */}
      {open && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="sidebar-backdrop"
          style={{
            position: "fixed", left: 0, right: 0, bottom: 0,
            top: 68,              /* below mobile topbar */
            background: "rgba(0,0,0,0.60)",
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
          padding: "24px 0", height: "100vh",
          /* position/top managed entirely by CSS to allow media-query override */
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
        /* ── Desktop: sidebar sticky in flex flow ───────────────── */
        .admin-sidebar {
          position: sticky;
          top: 0;
        }

        /* ── Mobile (≤768px): top-slide full-width overlay ──────── */
        /* Pattern: jw.org — header always on top, menu slides down */
        @media (max-width: 768px) {
          /* Remove from flex flow so <main> fills full 100vw */
          .admin-sidebar {
            position: fixed !important;
            top: 68px !important;          /* right below mobile topbar */
            left: 0 !important;
            width: 100vw !important;
            height: auto !important;
            max-height: calc(100vh - 68px) !important;
            overflow-y: auto !important;
            z-index: 50 !important;
            transform: translateY(-110%) !important; /* hidden above topbar */
            transition: transform .28s cubic-bezier(.4,0,.2,1) !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.08) !important;
            padding-top: 8px !important;
            padding-bottom: 24px !important;
          }
          /* Slide down into view when open */
          .admin-sidebar--open {
            transform: translateY(0) !important;
          }
          /* Close button inside sidebar is not needed for top-slide */
          .sidebar-close-btn { display: none !important; }
          /* Show mobile topbar */
          .mobile-topbar { display: flex !important; }
          /* Main fills full width — sidebar is out of flex flow */
          #admin-main { overflow-x: hidden !important; }
          /* Nav items: larger tap targets + full-width separator */
          .admin-sidebar ul li button {
            padding: 14px 20px !important;
            font-size: 14px !important;
            border-bottom: 1px solid rgba(255,255,255,0.05) !important;
            border-radius: 0 !important;
            width: 100% !important;
          }
          /* Logo area padding */
          .admin-sidebar > div:first-child {
            padding: 16px 20px !important;
          }
        }

        /* ── Desktop (≥769px): sticky sidebar, no topbar ────────── */
        @media (min-width: 769px) {
          .admin-sidebar {
            position: sticky !important;
            top: 0 !important;
            left: 0 !important;
            width: 220px !important;
            transform: none !important;
          }
          .mobile-topbar { display: none !important; }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.sans }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main id="admin-main" style={{ flex: 1, overflow: "auto", minHeight: "100vh", minWidth: 0 }}>
          {/* ── Mobile top bar ──────────────────────────────────── */}
          <div
            className="mobile-topbar"
            style={{
              display: "none",
              alignItems: "center",
              padding: "0 8px 0 4px",
              height: 68,
              background: T.surface,
              borderBottom: `1px solid ${T.bdr}`,
              position: "sticky", top: 0, zIndex: 52,
            }}
          >
            {/* Hamburger / close toggle */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={sidebarOpen}
              style={{
                background: "transparent", border: "none",
                color: T.muted, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 8, minWidth: 48, minHeight: 48,
              }}
            >
              {sidebarOpen ? (
                /* X icon */
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                /* Hamburger icon */
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="3" y1="6"  x2="21" y2="6"  />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>

            {/* Logo */}
            <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 300, color: T.accent, letterSpacing: "-0.03em", flex: 1, paddingLeft: 4 }}>
              OP1NA1
            </div>

            {/* Painel label */}
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", paddingRight: 8 }}>
              Admin
            </div>
          </div>

          {children}
        </main>
      </div>
    </RequireAuth>
  );
}
