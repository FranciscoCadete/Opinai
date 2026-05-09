import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Share2, Table2, Code2, FolderOpen, GitMerge,
  Lock, ClipboardList, BellRing, Smartphone, Users, Cpu, Siren,
  BarChart3, Menu, X, Sun, Moon, Bell, Search, ChevronRight,
  Activity, Zap, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Nav structure ─────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    id: "platform",
    label: "Plataforma",
    items: [
      { href: "/overview",       label: "Overview",          icon: LayoutDashboard },
      { href: "/c4-architecture",label: "C4 Architecture",   icon: Share2 },
      { href: "/erd-schema",     label: "ERD Schema",        icon: Table2 },
      { href: "/folder-structure",    label: "Folder Structure",    icon: FolderOpen },
      { href: "/municipality-config", label: "Municípios & Bairros", icon: MapPin },
    ],
  },
  {
    id: "modules",
    label: "Interfaces & Módulos",
    items: [
      { href: "/api-contract",       label: "API Contract",        icon: Code2 },
      { href: "/auth-module",        label: "Módulo Auth",         icon: Lock },
      { href: "/reports-module",     label: "Módulo Relatórios",   icon: ClipboardList },
      { href: "/notification-engine",label: "Motor Notificações",  icon: BellRing },
      { href: "/mobile-submit",      label: "Formulário Móvel",    icon: Smartphone },
    ],
  },
  {
    id: "security",
    label: "Segurança & IA",
    items: [
      { href: "/rbac-matrix",       label: "RBAC Matrix",        icon: Users },
      { href: "/alembic-migrations",label: "Migrações Alembic",  icon: GitMerge },
      { href: "/nlp-pipeline",      label: "Pipeline NLP",       icon: Cpu },
      { href: "/crisis-detection",  label: "Detecção de Crises", icon: Siren },
    ],
  },
  {
    id: "ops",
    label: "Operações",
    items: [
      { href: "/admin-dashboard", label: "Dashboard Admin", icon: BarChart3, badge: "LIVE" },
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

// ─── Layout ────────────────────────────────────────────────────
export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useDarkMode();

  const isActive = (href: string) => {
    if (href === "/overview" && location === "/") return true;
    return location === href;
  };

  const currentItem = ALL_ITEMS.find(item => isActive(item.href));

  return (
    <div className={cn("flex min-h-[100dvh] w-full flex-col md:flex-row", dark ? "dark" : "")}>

      {/* ── Mobile topbar ─────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-sidebar text-sidebar-foreground sticky top-0 z-50 border-b border-sidebar-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-base tracking-tight text-white">OP1NA1</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-sidebar-accent/60 transition-colors"
          aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-40 h-[100dvh] w-[248px] flex flex-col",
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border/60",
        "transition-transform duration-300 ease-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>

        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border/40 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
              <Zap size={17} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[17px] tracking-tight text-white leading-none">OP1NA1</span>
                <span className="text-[9px] font-bold bg-primary/25 text-primary-foreground/80 px-1.5 py-0.5 rounded-full uppercase tracking-widest leading-none border border-primary/20">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-sidebar-foreground/50 mt-0.5 truncate">Mulenvos · Luanda</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="Navegação principal">
          {NAV_SECTIONS.map((section) => (
            <div key={section.id} className="mb-1">
              <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-sidebar-foreground/35 px-3 py-2 mt-1">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-150 relative",
                          active
                            ? "bg-sidebar-accent text-white"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/90"
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                        )}
                        <item.icon
                          size={15}
                          strokeWidth={active ? 2.2 : 1.8}
                          className={cn(
                            "flex-shrink-0 transition-colors",
                            active ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                        {"badge" in item && item.badge && (
                          <span className="ml-auto flex-shrink-0 text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-sidebar-border/40 p-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-white">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-sidebar-foreground/80 truncate">Administrador</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                <p className="text-[10px] text-sidebar-foreground/40">Online</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background dark:bg-zinc-950">

        {/* Top header */}
        <div className="hidden md:flex h-14 items-center px-6 border-b border-border dark:border-zinc-800 bg-card dark:bg-zinc-900 flex-shrink-0 gap-4">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-muted-foreground flex-1 min-w-0">
            <Activity size={13} className="text-primary flex-shrink-0" />
            <span className="text-xs">OP1NA1</span>
            <ChevronRight size={11} className="flex-shrink-0" />
            <span className="text-xs font-medium text-foreground dark:text-zinc-100 truncate">
              {currentItem?.label ?? "Documentation"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-800 transition-colors"
              aria-label="Pesquisar"
            >
              <Search size={15} />
            </button>
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-800 transition-colors relative"
              aria-label="Notificações"
            >
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
            </button>
            <button
              onClick={() => setDark(!dark)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-zinc-800 transition-colors"
              aria-label={dark ? "Modo claro" : "Modo escuro"}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 min-h-0">
          <div className="p-5 md:p-7 max-w-[1100px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
