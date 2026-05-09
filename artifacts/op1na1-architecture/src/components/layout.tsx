import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, BookOpen, Layers, Database, FileJson, Shield, FolderTree, GitBranch, KeyRound, FileText, Bell, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: BookOpen },
  { href: "/c4-architecture", label: "C4 Architecture", icon: Layers },
  { href: "/erd-schema", label: "ERD Schema", icon: Database },
  { href: "/api-contract", label: "API Contract", icon: FileJson },
  { href: "/rbac-matrix", label: "RBAC Matrix", icon: Shield },
  { href: "/folder-structure", label: "Folder Structure", icon: FolderTree },
  { href: "/alembic-migrations", label: "Migrações Alembic", icon: GitBranch },
  { href: "/auth-module",        label: "Módulo Auth",        icon: KeyRound },
  { href: "/reports-module",        label: "Módulo Relatórios",  icon: FileText },
  { href: "/notification-engine",   label: "Motor Notificações", icon: Bell },
  { href: "/nlp-pipeline",          label: "Pipeline NLP",        icon: Brain },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/overview" && location === "/") return true;
    return location === href;
  };

  return (
    <div className="flex min-h-[100dvh] w-full bg-background flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground sticky top-0 z-50">
        <div>
          <h1 className="font-bold text-lg tracking-tight">OP1NA1</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -mr-2">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-40 h-[100dvh] w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-200 ease-in-out border-r border-sidebar-border",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 bg-primary rounded-sm"></div>
            <div className="w-4 h-4 bg-black rounded-sm"></div>
            <h1 className="font-bold text-xl tracking-tight text-white">OP1NA1</h1>
          </div>
          <p className="text-xs text-sidebar-foreground/70 font-medium leading-snug">
            Plataforma de Participação Cidadã<br/>
            Mulenvos, Luanda
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div 
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  active 
                    ? "bg-sidebar-accent text-white" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                )}>
                  <item.icon size={16} className={cn(active ? "text-primary" : "opacity-70")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="hidden md:flex h-16 items-center px-8 border-b border-border bg-card">
          <h2 className="text-sm font-medium text-muted-foreground">
            {NAV_ITEMS.find(item => isActive(item.href))?.label || "Documentation"}
          </h2>
        </div>
        <div className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
