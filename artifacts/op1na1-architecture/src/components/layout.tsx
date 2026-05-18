import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Share2, Table2, Code2, FolderOpen, GitMerge,
  Lock, ClipboardList, BellRing, Smartphone, Users, Cpu, Siren,
  BarChart3, Menu, X, Search, ChevronDown, Globe2, Server,
  FlaskConical, UserCog, SlidersHorizontal, ShieldCheck, MapPin,
  ChevronRight, Sun, Moon, LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Brand colours ──────────────────────────────────────────────
const C = {
  yellow: "#F1A60F",
  red:    "#B41414",
  black:  "#0d0d0d",
  white:  "#FFFFFF",
} as const;

// ─── Navigation structure ───────────────────────────────────────
// Citizen-facing tabs (public)
const NAV_CITIZEN = [
  {
    label: "Início",
    href:  "/citizen-portal",
    items: [] as { href: string; label: string; icon: React.ElementType }[],
  },
  {
    label: "Serviços",
    items: [
      { href: "/citizen-portal#submeter",    label: "Submeter Pedido",       icon: Smartphone },
      { href: "/citizen-portal#consultar",   label: "Consultar Pedido",      icon: Search },
      { href: "/citizen-portal#canais",      label: "Canais de Contacto",    icon: Globe2 },
      { href: "/citizen-portal#canais",      label: "Mediadores no Terreno", icon: Users },
      { href: "/citizen-portal#documentos",  label: "Documentos Públicos",   icon: ClipboardList },
      { href: "/citizen-portal#municipal",   label: "Portal Municipal",      icon: MapPin },
    ],
  },
  {
    label: "Estatísticas",
    href:  "/citizen-portal#estatisticas",
    items: [] as { href: string; label: string; icon: React.ElementType }[],
  },
  {
    label: "Informações",
    href:  "/citizen-portal#informacoes",
    items: [] as { href: string; label: string; icon: React.ElementType }[],
  },
  {
    label: "Acesso Institucional",
    href:  "/login",
    items: [] as { href: string; label: string; icon: React.ElementType }[],
  },
];

// Technical section (IT only) — all backend/architecture docs
const NAV_TECH = [
  {
    label: "Plataforma",
    items: [
      { href: "/overview",            label: "Overview",             icon: LayoutDashboard },
      { href: "/c4-architecture",     label: "C4 Architecture",      icon: Share2 },
      { href: "/erd-schema",          label: "ERD Schema",           icon: Table2 },
      { href: "/folder-structure",    label: "Folder Structure",     icon: FolderOpen },
      { href: "/municipality-config", label: "Municípios & Bairros", icon: MapPin },
    ],
  },
  {
    label: "Interfaces",
    items: [
      { href: "/api-contract",        label: "API Contract",         icon: Code2 },
      { href: "/auth-module",         label: "Módulo Auth",          icon: Lock },
      { href: "/reports-module",      label: "Módulo Relatórios",    icon: ClipboardList },
      { href: "/notification-engine", label: "Motor Notificações",   icon: BellRing },
      { href: "/mobile-submit",       label: "Formulário Móvel",     icon: Smartphone },
    ],
  },
  {
    label: "Segurança & IA",
    items: [
      { href: "/rbac-matrix",         label: "RBAC Matrix",          icon: Users },
      { href: "/alembic-migrations",  label: "Migrações Alembic",    icon: GitMerge },
      { href: "/nlp-pipeline",        label: "Pipeline NLP",         icon: Cpu },
      { href: "/crisis-detection",    label: "Detecção de Crises",   icon: Siren },
    ],
  },
  {
    label: "Operações",
    items: [
      { href: "/deployment-guide",    label: "Deployment Guide",     icon: Server },
      { href: "/testing-strategy",    label: "Testing & CI/CD",      icon: FlaskConical },
      { href: "/user-management",     label: "Utilizadores",         icon: UserCog },
      { href: "/channel-config",      label: "Canais & SLA",         icon: SlidersHorizontal },
      { href: "/audit-center",        label: "Auditoria",            icon: ShieldCheck },
    ],
  },
  {
    label: "Demo ao Vivo",
    items: [
      { href: "/citizen-portal",  label: "Portal do Cidadão",  icon: Globe2 },
      { href: "/admin-dashboard", label: "Dashboard Admin",    icon: BarChart3 },
    ],
  },
];

// Legacy NAV alias for search
const NAV = [
  { label: "Home", href: "/overview", items: [] as { href: string; label: string; icon: React.ElementType }[] },
  ...NAV_TECH,
];

const ALL_ITEMS = NAV.flatMap(s => s.items);

// ─── Dark mode hook ─────────────────────────────────────────────
function useDark() {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && (
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
    )
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, setDark] as const;
}

// ─── Geometric logo mark ────────────────────────────────────────
function LogoMark({ size = 36 }: { size?: number }) {
  const u = size / 3;
  const g = Math.round(size * 0.055);
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left tall black block */}
      <rect x="0"          y="0"       width={u - g/2} height={size}     fill={C.black} rx="2" />
      {/* Top-right red block */}
      <rect x={u + g/2}   y="0"       width={u*2 - g} height={u - g/2}  fill={C.red}   rx="2" />
      {/* Middle-right yellow block */}
      <rect x={u + g/2}   y={u + g/2} width={u - g}   height={u - g}    fill={C.yellow} rx="2" />
      {/* Bottom-right black block (small) */}
      <rect x={u*2}       y={u + g/2} width={u - g/2} height={u - g}    fill={C.black} rx="2" />
      {/* Bottom row left */}
      <rect x={u + g/2}   y={u*2+g/2} width={u - g}   height={u - g/2}  fill={C.black} rx="2" />
      {/* Bottom row right (yellow) */}
      <rect x={u*2}       y={u*2+g/2} width={u - g/2} height={u - g/2}  fill={C.yellow} rx="2" />
    </svg>
  );
}

// ─── Search modal ───────────────────────────────────────────────
function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [, nav] = useLocation();
  const results = q.trim() ? ALL_ITEMS.filter(i => i.label.toLowerCase().includes(q.toLowerCase())).slice(0, 7) : [];

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
          <Search size={15} className="text-zinc-400 flex-shrink-0" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Pesquisar páginas..."
            className="flex-1 bg-transparent text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 outline-none" />
          <kbd className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 font-mono">ESC</kbd>
        </div>
        {results.length > 0 && (
          <div className="py-1.5 max-h-64 overflow-y-auto">
            {results.map(r => {
              const Icon = r.icon;
              return (
                <button key={r.href} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left"
                  onClick={() => { nav(r.href); onClose(); }}>
                  <Icon size={13} className="text-zinc-400 flex-shrink-0" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-200">{r.label}</span>
                </button>
              );
            })}
          </div>
        )}
        {q.trim() && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-zinc-400">Nenhum resultado para "{q}"</div>
        )}
        {!q.trim() && (
          <div className="px-4 py-2.5 text-[11px] text-zinc-400" style={{ fontFamily: "'DM Mono',monospace" }}>
            {ALL_ITEMS.length} páginas disponíveis · ↑↓ navegar · Enter seleccionar
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Layout ─────────────────────────────────────────────────────
export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [dark, setDark] = useDark();
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathOf = (href: string) => href.split("#")[0];
  const isActive = (href: string) => {
    const path = pathOf(href);
    if (path === "/overview") return location === "/overview";
    if (path === "/citizen-portal") return location === "/" || location === "/citizen-portal";
    return location === path;
  };

  const currentSection = NAV.find(s => s.items.some(i => isActive(i.href)));
  const currentItem    = ALL_ITEMS.find(i => isActive(i.href));
  const isCitizenPortal = location === "/citizen-portal";

  // ⌘K shortcut
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearching(true); }
      if (e.key === "Escape") { setSearching(false); setOpenMenu(null); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  function startClose() {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 180);
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  return (
    <div className={cn("min-h-[100dvh] flex flex-col", dark && "dark")}>
      {searching && <SearchModal onClose={() => setSearching(false)} />}

      {/* ══════════════════════════════════════════════════
          HEADER — branco com logotipo geométrico
      ══════════════════════════════════════════════════ */}
      <header className="bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

          {/* Logo */}
          <Link href="/citizen-portal">
            <div className="flex items-center gap-3 cursor-pointer select-none">
              <LogoMark size={38} />
              <div className="flex items-baseline gap-[3px]">
                <span
                  className="text-[22px] leading-none font-bold tracking-[-0.04em]"
                  style={{ color: C.black, fontFamily: "'Fraunces',serif", fontWeight: 700 }}
                >
                  OP1NA1
                </span>
              </div>
            </div>
          </Link>

          <div className="flex-1" />

          {/* Right utilities */}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => setSearching(true)}
              className="flex items-center gap-2 h-8 px-3 rounded-lg text-[12px] text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              style={{ fontFamily: "'DM Mono',monospace" }}
            >
              <Search size={11} />
              Pesquisar
              <kbd className="text-[9px] border border-zinc-200 dark:border-zinc-700 px-1 rounded bg-white dark:bg-zinc-900">⌘K</kbd>
            </button>
            <button
              onClick={() => setDark(!dark)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label={dark ? "Modo claro" : "Modo escuro"}
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════
          NAV BAR — fundo amarelo #F1A60F
      ══════════════════════════════════════════════════ */}
      <nav
        className="hidden md:block sticky top-0 z-50 shadow-sm"
        style={{ background: C.yellow }}
        ref={menuRef}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-11 flex items-center gap-0.5">

          {/* ── CITIZEN TABS ── */}
          {NAV_CITIZEN.map((section) => {
            const isOpen     = openMenu === section.label;
            const hasItems   = section.items.length > 0;
            const isSimple   = !hasItems && !!section.href;
            const sectionActive = isSimple
              ? isActive(section.href!)
              : section.items.some(i => isActive(i.href));
            const isInstitutional = section.label === "Acesso Institucional";

            return (
              <div key={section.label} className="relative">
                {isSimple ? (
                  <Link href={section.href!}>
                    <div
                      className="flex items-center gap-1.5 px-3.5 h-11 text-[13px] font-semibold cursor-pointer transition-all select-none"
                      style={isInstitutional ? {
                        color: C.black,
                        background: "rgba(0,0,0,0.10)",
                        borderLeft: `2px solid rgba(0,0,0,0.15)`,
                        marginLeft: 4,
                        fontSize: 12,
                        letterSpacing: "0.01em",
                      } : {
                        color: sectionActive ? C.white : C.black,
                        background: sectionActive ? C.red : undefined,
                      }}
                    >
                      {isInstitutional && <LogIn size={12} />}
                      {section.label}
                    </div>
                  </Link>
                ) : (
                  <div
                    className="relative flex items-center gap-1 px-3.5 h-11 text-[13px] font-semibold cursor-pointer transition-all select-none"
                    style={{
                      color: sectionActive || isOpen ? C.white : C.black,
                      background: sectionActive || isOpen ? "rgba(0,0,0,0.18)" : undefined,
                    }}
                    onMouseEnter={() => { cancelClose(); setOpenMenu(section.label); }}
                    onMouseLeave={startClose}
                  >
                    {section.label}
                    <ChevronDown size={11} className={cn("transition-transform mt-0.5", isOpen && "rotate-180")} />
                    {isOpen && (
                      <div
                        className="absolute top-full left-0 min-w-[210px] bg-white dark:bg-zinc-900 shadow-xl rounded-b-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden z-50"
                        onMouseEnter={cancelClose}
                        onMouseLeave={startClose}
                      >
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.href);
                          return (
                            <Link key={item.label} href={item.href}>
                              <div
                                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                                style={{
                                  background: active ? `${C.yellow}18` : undefined,
                                  borderLeft: active ? `3px solid ${C.yellow}` : "3px solid transparent",
                                }}
                                onClick={() => setOpenMenu(null)}
                              >
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: active ? `${C.yellow}25` : "#f4f4f5" }}>
                                  <Icon size={13} style={{ color: active ? C.red : "#71717a" }} />
                                </div>
                                <span className="text-[12.5px] font-medium" style={{ color: active ? C.black : "#3f3f46" }}>
                                  {item.label}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── DIVIDER ── */}
          <div className="w-px h-5 bg-black/20 mx-1" />

          {/* ── ÁREA TÉCNICA (IT only) ── */}
          <div className="relative">
            <div
              className="relative flex items-center gap-1.5 px-3.5 h-11 text-[12px] font-semibold cursor-pointer transition-all select-none"
              style={{
                color: openMenu === "__tech__" ? C.white : "rgba(0,0,0,0.55)",
                background: openMenu === "__tech__" ? "rgba(0,0,0,0.18)" : undefined,
              }}
              onMouseEnter={() => { cancelClose(); setOpenMenu("__tech__"); }}
              onMouseLeave={startClose}
            >
              <Lock size={10} />
              Área Técnica
              <ChevronDown size={11} className={cn("transition-transform mt-0.5", openMenu === "__tech__" && "rotate-180")} />

              {openMenu === "__tech__" && (
                <div
                  className="absolute top-full right-0 w-[620px] bg-white dark:bg-zinc-900 shadow-2xl rounded-b-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden z-50"
                  onMouseEnter={cancelClose}
                  onMouseLeave={startClose}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}
                >
                  {/* Header */}
                  <div className="col-span-3 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2"
                    style={{ background: "#fafafa" }}>
                    <Lock size={11} className="text-zinc-400" />
                    <span className="text-[11px] font-semibold text-zinc-500 tracking-wide uppercase" style={{ fontFamily: "'DM Mono',monospace" }}>
                      Documentação técnica — acesso restrito a TI
                    </span>
                    <div className="flex-1" />
                    <Link href="/login">
                      <span className="text-[10px] font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors"
                        style={{ background: C.red, color: "#fff" }}
                        onClick={() => setOpenMenu(null)}>
                        Entrar
                      </span>
                    </Link>
                  </div>
                  {NAV_TECH.map((section) => (
                    <div key={section.label} className="py-2">
                      <div className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400"
                        style={{ fontFamily: "'DM Mono',monospace" }}>
                        {section.label}
                      </div>
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                          <Link key={item.href} href={item.href}>
                            <div className="flex items-center gap-2.5 px-4 py-2 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              style={{ borderLeft: active ? `3px solid ${C.yellow}` : "3px solid transparent" }}
                              onClick={() => setOpenMenu(null)}>
                              <Icon size={12} style={{ color: active ? C.red : "#a1a1aa", flexShrink: 0 }} />
                              <span className="text-[12px]" style={{ color: active ? C.black : "#52525b" }}>{item.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1" />

          {/* Submeter Pedido button */}
          <Link href="/citizen-portal">
            <div
              className="px-5 h-7 flex items-center text-[12.5px] font-bold text-white rounded-full cursor-pointer transition-all hover:opacity-90 select-none shadow-sm"
              style={{ background: C.red, letterSpacing: "0.01em" }}
            >
              Submeter Pedido
            </div>
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════
          MOBILE MENU — slide down
      ══════════════════════════════════════════════════ */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 shadow-lg overflow-y-auto max-h-[70vh]">
          {/* Citizen section */}
          <div className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 pt-4"
            style={{ fontFamily: "'DM Mono',monospace" }}>
            Para o Cidadão
          </div>
          {NAV_CITIZEN.map((section) => {
            if (!section.items?.length && section.href) {
              return (
                <Link key={section.label} href={section.href}>
                  <div className="flex items-center gap-3 px-5 py-2.5 text-sm cursor-pointer"
                    style={{ color: isActive(section.href) ? C.red : "#52525b", fontWeight: isActive(section.href) ? 600 : 400 }}
                    onClick={() => setMobileOpen(false)}>
                    {section.label}
                  </div>
                </Link>
              );
            }
            return section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.label} href={item.href}>
                  <div className="flex items-center gap-3 px-5 py-2.5 text-sm cursor-pointer"
                    style={{ color: active ? C.red : "#52525b", fontWeight: active ? 600 : 400 }}
                    onClick={() => setMobileOpen(false)}>
                    <Icon size={14} style={{ color: active ? C.red : "#a1a1aa" }} />
                    {item.label}
                  </div>
                </Link>
              );
            });
          })}

          {/* Technical section */}
          <div className="px-5 py-2 mt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-400 pt-4 flex items-center gap-2"
            style={{ fontFamily: "'DM Mono',monospace" }}>
            <Lock size={9} className="text-zinc-400" /> Área Técnica
          </div>
          {NAV_TECH.flatMap((section) =>
            section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 px-5 py-2 text-sm cursor-pointer"
                    style={{ color: active ? C.red : "#71717a", fontWeight: active ? 600 : 400 }}
                    onClick={() => setMobileOpen(false)}>
                    <Icon size={13} style={{ color: active ? C.red : "#a1a1aa" }} />
                    {item.label}
                  </div>
                </Link>
              );
            })
          )}

          <div className="p-4">
            <Link href="/citizen-portal">
              <div className="w-full text-center py-2.5 text-sm font-bold text-white rounded-full"
                style={{ background: C.red }} onClick={() => setMobileOpen(false)}>
                Submeter Pedido
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          BREADCRUMB
      ══════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-9 flex items-center gap-1.5">
          <Link href="/citizen-portal">
            <span className="text-[12px] cursor-pointer transition-colors hover:opacity-70"
              style={{ color: C.red }}>
              Início
            </span>
          </Link>
          {isCitizenPortal ? (
            <>
              <ChevronRight size={10} className="text-zinc-300 dark:text-zinc-600" />
              <span className="text-[12px] text-zinc-600 dark:text-zinc-300 font-medium">Portal do Cidadão</span>
            </>
          ) : (
            <>
              {currentSection && (
                <>
                  <ChevronRight size={10} className="text-zinc-300 dark:text-zinc-600" />
                  <span className="text-[12px] text-zinc-400 dark:text-zinc-500">{currentSection.label}</span>
                </>
              )}
              {currentItem && currentItem.label !== "Overview" && (
                <>
                  <ChevronRight size={10} className="text-zinc-300 dark:text-zinc-600" />
                  <span className="text-[12px] text-zinc-600 dark:text-zinc-300 font-medium">{currentItem.label}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          CONTENT
      ══════════════════════════════════════════════════ */}
      <main className="flex-1 bg-white dark:bg-zinc-950">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
          {children}
        </div>
      </main>

      {/* ══════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════ */}
      <footer className="border-t border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-950">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-center">
          <p className="text-[12px] text-zinc-400 dark:text-zinc-500 text-center" style={{ fontFamily: "'DM Mono',monospace" }}>
            Copyright © 2025 Projecto OP1NA1 — Opinar para ajudar |{" "}
            <span style={{ color: C.red }}>Município dos Mulenvos · Luanda, Angola</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
