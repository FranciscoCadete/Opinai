import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Share2, Table2, Code2, FolderOpen, GitMerge,
  Lock, ClipboardList, BellRing, Smartphone, Users, Cpu, Siren,
  BarChart3, Menu, X, Sun, Moon, Bell, Search, ChevronRight,
  Activity, Zap, MapPin, Server, FlaskConical, UserCog,
  SlidersHorizontal, ShieldCheck, Globe2, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Nav structure ─────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    id: "platform",
    label: "Plataforma",
    items: [
      { href: "/overview",            label: "Overview",              icon: LayoutDashboard },
      { href: "/c4-architecture",     label: "C4 Architecture",       icon: Share2 },
      { href: "/erd-schema",          label: "ERD Schema",            icon: Table2 },
      { href: "/folder-structure",    label: "Folder Structure",      icon: FolderOpen },
      { href: "/municipality-config", label: "Municípios & Bairros",  icon: MapPin },
    ],
  },
  {
    id: "modules",
    label: "Interfaces & Módulos",
    items: [
      { href: "/api-contract",        label: "API Contract",           icon: Code2 },
      { href: "/auth-module",         label: "Módulo Auth",            icon: Lock },
      { href: "/reports-module",      label: "Módulo Relatórios",      icon: ClipboardList },
      { href: "/notification-engine", label: "Motor Notificações",     icon: BellRing },
      { href: "/mobile-submit",       label: "Formulário Móvel",       icon: Smartphone },
    ],
  },
  {
    id: "security",
    label: "Segurança & IA",
    items: [
      { href: "/rbac-matrix",         label: "RBAC Matrix",            icon: Users },
      { href: "/alembic-migrations",  label: "Migrações Alembic",      icon: GitMerge },
      { href: "/nlp-pipeline",        label: "Pipeline NLP",           icon: Cpu },
      { href: "/crisis-detection",    label: "Detecção de Crises",     icon: Siren },
    ],
  },
  {
    id: "citizen",
    label: "Demo ao Vivo",
    items: [
      { href: "/citizen-portal",   label: "Portal do Cidadão", icon: Globe2,   badge: "DEMO" },
      { href: "/admin-dashboard",  label: "Dashboard Admin",   icon: BarChart3, badge: "LIVE" },
    ],
  },
  {
    id: "ops",
    label: "Operações",
    items: [
      { href: "/deployment-guide",  label: "Deployment Guide",        icon: Server },
      { href: "/testing-strategy",  label: "Testing & CI/CD",         icon: FlaskConical },
      { href: "/user-management",   label: "Gestão de Utilizadores",  icon: UserCog },
      { href: "/channel-config",    label: "Canais & SLA",            icon: SlidersHorizontal },
      { href: "/audit-center",      label: "Auditoria & Integridade", icon: ShieldCheck },
    ],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

// ─── Dark mode ─────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else       { root.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  }, [dark]);

  return [dark, setDark] as const;
}

// ─── Search ─────────────────────────────────────────────────────
function SearchBar({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [, navigate] = useLocation();

  const results = q.trim().length > 0
    ? ALL_ITEMS.filter(i => i.label.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Pesquisar na documentação..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border font-mono">ESC</kbd>
        </div>
        {results.length > 0 && (
          <div className="py-2 max-h-64 overflow-y-auto">
            {results.map(r => {
              const Icon = r.icon;
              return (
                <button
                  key={r.href}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary text-left transition-colors"
                  onClick={() => { navigate(r.href); onClose(); }}
                >
                  <Icon size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground">{r.label}</span>
                </button>
              );
            })}
          </div>
        )}
        {q.trim().length > 0 && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhum resultado para "{q}"
          </div>
        )}
        {q.trim().length === 0 && (
          <div className="px-4 py-3 text-[11px] text-muted-foreground font-mono tracking-wide">
            {ALL_ITEMS.length} páginas disponíveis
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Layout ────────────────────────────────────────────────────
export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useDarkMode();
  const [searching, setSearching] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const isActive = (href: string) => {
    if (href === "/overview" && location === "/") return true;
    return location === href;
  };

  const currentItem = ALL_ITEMS.find(item => isActive(item.href));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearching(true); }
      if (e.key === "Escape") setSearching(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function toggleSection(id: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={cn("flex min-h-[100dvh] w-full flex-col md:flex-row", dark ? "dark" : "")}>

      {searching && <SearchBar onClose={() => setSearching(false)} />}

      {/* ── Mobile topbar ──────────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-sidebar text-sidebar-foreground sticky top-0 z-50 border-b border-sidebar-border/40 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00c49a, #009b7a)", boxShadow: "0 0 12px rgba(0,196,154,0.35)" }}>
            <Zap size={13} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-white" style={{ fontFamily: "'Fraunces',serif" }}>OP1NA1</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-sidebar-accent/60 transition-colors text-sidebar-foreground/70"
          aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-40 h-[100dvh] w-[252px] flex flex-col",
        "text-sidebar-foreground border-r border-sidebar-border/30",
        "transition-transform duration-300 ease-out sidebar-gradient",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>

        {/* Subtle noise overlay */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

        {/* Logo */}
        <div className="relative h-[60px] flex items-center px-4 border-b border-sidebar-border/20 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #00c49a 0%, #009b7a 100%)", boxShadow: "0 0 20px rgba(0,196,154,0.3), inset 0 1px 0 rgba(255,255,255,0.2)" }}
            >
              <Zap size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="font-light text-[18px] tracking-tight text-white leading-none"
                  style={{ fontFamily: "'Fraunces',serif" }}
                >
                  OP1NA1
                </span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest leading-none border flex-shrink-0" style={{ background: "rgba(0,196,154,0.15)", color: "#00c49a", borderColor: "rgba(0,196,154,0.2)" }}>
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-sidebar-foreground/40 mt-0.5 truncate" style={{ fontFamily: "'DM Mono',monospace", letterSpacing: "0.04em" }}>Mulenvos · Luanda</p>
            </div>
          </div>
        </div>

        {/* Search pill */}
        <div className="px-3 pt-3 pb-1 flex-shrink-0">
          <button
            onClick={() => setSearching(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-sidebar-border/30 bg-sidebar-accent/20 text-sidebar-foreground/40 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/60 transition-all duration-150 text-left"
          >
            <Search size={12} className="flex-shrink-0" />
            <span className="text-[12px] flex-1">Pesquisar...</span>
            <kbd className="text-[9px] px-1.5 py-0.5 rounded border border-sidebar-border/30 bg-sidebar-border/20 font-mono" style={{ fontFamily: "'DM Mono',monospace" }}>⌘K</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-scroll flex-1 overflow-y-auto py-2 px-2" aria-label="Navegação principal">
          {NAV_SECTIONS.map((section) => {
            const collapsed = collapsedSections.has(section.id);
            return (
              <div key={section.id} className="mb-0.5">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between px-3 py-1.5 mt-2 mb-0.5 text-left group"
                >
                  <p className="text-[9.5px] font-bold tracking-[0.1em] uppercase text-sidebar-foreground/30 group-hover:text-sidebar-foreground/50 transition-colors" style={{ fontFamily: "'DM Mono',monospace" }}>
                    {section.label}
                  </p>
                  <ChevronDown size={10} className={cn("text-sidebar-foreground/25 transition-transform duration-200", collapsed && "-rotate-90")} />
                </button>

                {!collapsed && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link key={item.href} href={item.href}>
                          <div
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium cursor-pointer transition-all duration-150",
                              active
                                ? "text-white"
                                : "text-sidebar-foreground/55 hover:text-sidebar-foreground/90 hover:bg-sidebar-accent/30"
                            )}
                            style={active ? {
                              background: "linear-gradient(90deg, rgba(0,196,154,0.18) 0%, rgba(0,196,154,0.06) 100%)",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)"
                            } : undefined}
                            aria-current={active ? "page" : undefined}
                          >
                            {/* Active indicator bar */}
                            {active && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: "#00c49a", boxShadow: "0 0 8px rgba(0,196,154,0.6)" }} />
                            )}

                            <item.icon
                              size={14}
                              strokeWidth={active ? 2.2 : 1.8}
                              className="flex-shrink-0 transition-colors"
                              style={{ color: active ? "#00c49a" : undefined }}
                            />
                            <span className="truncate flex-1">{item.label}</span>

                            {"badge" in item && item.badge && (
                              <span className={cn(
                                "ml-auto flex-shrink-0 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full tracking-wider flex items-center gap-1",
                                item.badge === "LIVE"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                              )}>
                                <span className={cn("w-1 h-1 rounded-full", item.badge === "LIVE" ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-sidebar-border/20 p-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent/30 transition-colors cursor-default group">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #3b82f6, #4f46e5)" }}>
              <span className="text-[11px] font-bold text-white">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-sidebar-foreground/80 truncate">Administrador</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" style={{ boxShadow: "0 0 4px rgba(52,211,153,0.6)" }} />
                <p className="text-[10px] text-sidebar-foreground/35" style={{ fontFamily: "'DM Mono',monospace" }}>Online</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background dark:bg-zinc-950">

        {/* Top header — glass bar */}
        <div className="hidden md:flex h-[52px] items-center px-6 border-b border-border/60 dark:border-zinc-800/60 bg-card/80 dark:bg-zinc-900/80 backdrop-blur-md flex-shrink-0 gap-4 sticky top-0 z-30">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-muted-foreground flex-1 min-w-0">
            <Activity size={12} style={{ color: "#00c49a" }} className="flex-shrink-0" />
            <span className="text-[12px]" style={{ fontFamily: "'DM Mono',monospace" }}>OP1NA1</span>
            <ChevronRight size={10} className="flex-shrink-0 opacity-40" />
            <span className="text-[12px] font-semibold text-foreground dark:text-zinc-100 truncate">
              {currentItem?.label ?? "Documentation"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearching(true)}
              className="hidden lg:flex items-center gap-2 h-7 px-3 rounded-lg text-[11px] text-muted-foreground bg-secondary/60 border border-border/60 hover:bg-secondary transition-colors mr-1"
              style={{ fontFamily: "'DM Mono',monospace" }}
            >
              <Search size={11} />
              Pesquisar
              <kbd className="text-[9px] border border-border/60 px-1 rounded bg-background" style={{ fontFamily: "'DM Mono',monospace" }}>⌘K</kbd>
            </button>
            <button
              onClick={() => setSearching(true)}
              className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-800 transition-colors"
              aria-label="Pesquisar"
            >
              <Search size={14} />
            </button>
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-800 transition-colors relative"
              aria-label="Notificações"
            >
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "#00c49a", boxShadow: "0 0 4px rgba(0,196,154,0.6)" }} />
            </button>
            <button
              onClick={() => setDark(!dark)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-800 transition-colors"
              aria-label={dark ? "Modo claro" : "Modo escuro"}
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 min-h-0">
          <div className="p-5 md:p-7 max-w-[1080px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
