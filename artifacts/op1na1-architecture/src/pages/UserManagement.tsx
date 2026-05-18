import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Search, Plus, Filter, UserCog, ChevronLeft, ChevronRight,
  Edit2, Ban, CheckCircle, Trash2, Download, ClipboardList,
  X, ChevronDown, Shield, Eye, EyeOff,
} from "lucide-react";
import { listAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, type UserRole } from "@/lib/api";
import { useTranslation } from "react-i18next";

const PROFILE_TO_ROLE: Record<Profile, UserRole> = {
  Admin: "admin", Gestor: "manager", Analista: "technician", Técnico: "technician", Cidadão: "citizen"
};
const ROLE_TO_PROFILE: Record<string, Profile> = {
  admin: "Admin", manager: "Gestor", technician: "Técnico", citizen: "Cidadão"
};

// ─── Domain constants ────────────────────────────────────────────
const PROFILES = ["Admin", "Gestor", "Analista", "Técnico", "Cidadão"] as const;
const STATUSES = ["Activo", "Suspenso", "Pendente"] as const;
const BAIRROS  = [
  "KM 9-B", "KM 12-B", "Mulenvos de Cima", "Baixa de Cassanje",
  "Boa-Fé", "KM 14-B", "CAOP A", "CAOP B", "CAOP C", "Capalanga",
] as const;

type Profile = typeof PROFILES[number];
type Status  = typeof STATUSES[number];
type Bairro  = typeof BAIRROS[number];

interface User {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  nif: string;
  profile: Profile;
  neighborhoods: Bairro[];
  status: Status;
  createdAt: string;
  lastActivity: string;
}

interface AuditEntry {
  id: string | number;
  ts: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  type: "create" | "edit" | "suspend" | "activate" | "delete" | "bulk";
}

// ─── Mock data ───────────────────────────────────────────────────
const SEED_USERS: User[] = [
  { id:  1, name: "Carlos Alberto Santos",  email: "c.santos@mulenvos.gv.ao",   phone: "+244 923 100 001", nif: "005123456LA",  profile: "Admin",    neighborhoods: BAIRROS.slice(0,10) as Bairro[], status: "Activo",   createdAt: "2024-01-15", lastActivity: "Hoje, 08:42" },
  { id:  2, name: "Maria da Graça Lopes",   email: "m.lopes@mulenvos.gv.ao",    phone: "+244 912 200 002", nif: "007654321LA",  profile: "Gestor",   neighborhoods: ["KM 9-B","KM 12-B","Boa-Fé"],                   status: "Activo",   createdAt: "2024-02-03", lastActivity: "Hoje, 07:15" },
  { id:  3, name: "António Sebastião Dias", email: "a.dias@mulenvos.gv.ao",     phone: "+244 931 300 003", nif: "009876543LA",  profile: "Analista", neighborhoods: ["Mulenvos de Cima","KM 14-B"],                  status: "Activo",   createdAt: "2024-02-18", lastActivity: "Ontem, 16:30" },
  { id:  4, name: "Filomena Joana Paulo",   email: "f.paulo@mulenvos.gv.ao",    phone: "+244 944 400 004", nif: "003456789LA",  profile: "Técnico",  neighborhoods: ["CAOP A","CAOP B","CAOP C"],                    status: "Activo",   createdAt: "2024-03-01", lastActivity: "Ontem, 14:05" },
  { id:  5, name: "Manuel Augusto Ferreira",email: "m.ferreira@mulenvos.gv.ao", phone: "+244 955 500 005", nif: "001234567LA",  profile: "Técnico",  neighborhoods: ["Capalanga","Baixa de Cassanje"],               status: "Activo",   createdAt: "2024-03-14", lastActivity: "07/05/2025" },
  { id:  6, name: "Sofia Cristina Neto",    email: "s.neto@mulenvos.gv.ao",     phone: "+244 966 600 006", nif: "008765432LA",  profile: "Analista", neighborhoods: ["KM 9-B","Boa-Fé","Capalanga"],                 status: "Activo",   createdAt: "2024-04-02", lastActivity: "06/05/2025" },
  { id:  7, name: "Pedro Celestino Vieira", email: "p.vieira@mulenvos.gv.ao",   phone: "+244 977 700 007", nif: "004321098LA",  profile: "Gestor",   neighborhoods: ["CAOP A","CAOP B","KM 12-B"],                   status: "Suspenso", createdAt: "2024-04-20", lastActivity: "01/03/2025" },
  { id:  8, name: "Lurdes Esperança Costa", email: "l.costa@gmail.com",         phone: "+244 988 800 008", nif: "006543210LA",  profile: "Cidadão",  neighborhoods: ["KM 9-B"],                                      status: "Activo",   createdAt: "2024-05-10", lastActivity: "05/05/2025" },
  { id:  9, name: "Domingos Nkosi Teixeira",email: "d.teixeira@gmail.com",      phone: "+244 999 900 009", nif: "002109876LA",  profile: "Cidadão",  neighborhoods: ["Mulenvos de Cima"],                            status: "Pendente", createdAt: "2024-05-22", lastActivity: "—" },
  { id: 10, name: "Rosa Amélia Mendonça",   email: "r.mendonca@mulenvos.gv.ao", phone: "+244 911 010 010", nif: "005678901LA",  profile: "Técnico",  neighborhoods: ["KM 14-B","Baixa de Cassanje"],                 status: "Activo",   createdAt: "2024-06-05", lastActivity: "Hoje, 09:00" },
  { id: 11, name: "Helder Simão Bernardo",  email: "h.bernardo@mulenvos.gv.ao", phone: "+244 922 110 011", nif: "003210987LA",  profile: "Analista", neighborhoods: ["CAOP C","Capalanga"],                          status: "Activo",   createdAt: "2024-06-18", lastActivity: "Hoje, 06:50" },
  { id: 12, name: "Conceição Marta Alves",  email: "c.alves@mulenvos.gv.ao",    phone: "+244 933 220 012", nif: "007890123LA",  profile: "Gestor",   neighborhoods: ["Boa-Fé","KM 9-B","KM 12-B","Mulenvos de Cima"],status: "Activo",   createdAt: "2024-07-01", lastActivity: "Ontem, 11:20" },
  { id: 13, name: "José António Queirós",   email: "j.queiros@gmail.com",       phone: "+244 944 330 013", nif: "001098765LA",  profile: "Cidadão",  neighborhoods: ["Baixa de Cassanje"],                           status: "Suspenso", createdAt: "2024-07-15", lastActivity: "10/04/2025" },
  { id: 14, name: "Beatriz Nhanga Sousa",   email: "b.sousa@mulenvos.gv.ao",    phone: "+244 955 440 014", nif: "009012345LA",  profile: "Técnico",  neighborhoods: ["CAOP A","CAOP B"],                             status: "Activo",   createdAt: "2024-08-03", lastActivity: "Ontem, 15:45" },
  { id: 15, name: "Rui Marcos Jacinto",     email: "r.jacinto@mulenvos.gv.ao",  phone: "+244 966 550 015", nif: "004567890LA",  profile: "Analista", neighborhoods: ["KM 9-B","KM 14-B","Boa-Fé"],                  status: "Pendente", createdAt: "2024-08-20", lastActivity: "—" },
  { id: 16, name: "Teresa Figueiredo Lima", email: "t.lima@mulenvos.gv.ao",     phone: "+244 977 660 016", nif: "006789012LA",  profile: "Técnico",  neighborhoods: ["Capalanga","CAOP C"],                          status: "Activo",   createdAt: "2024-09-10", lastActivity: "Hoje, 08:10" },
  { id: 17, name: "Francisco Kalunga Bata", email: "f.bata@gmail.com",          phone: "+244 988 770 017", nif: "002345678LA",  profile: "Cidadão",  neighborhoods: ["CAOP A"],                                      status: "Activo",   createdAt: "2024-09-25", lastActivity: "04/05/2025" },
  { id: 18, name: "Inês Margarida Sampaio", email: "i.sampaio@mulenvos.gv.ao",  phone: "+244 999 880 018", nif: "008901234LA",  profile: "Gestor",   neighborhoods: ["KM 12-B","Baixa de Cassanje","KM 14-B"],       status: "Activo",   createdAt: "2024-10-07", lastActivity: "Ontem, 13:00" },
  { id: 19, name: "Albino Nunes Machado",   email: "a.machado@gmail.com",       phone: "+244 911 990 019", nif: "005901234LA",  profile: "Cidadão",  neighborhoods: ["KM 9-B"],                                      status: "Suspenso", createdAt: "2024-10-19", lastActivity: "05/02/2025" },
  { id: 20, name: "Vanessa Cristóvão Melo", email: "v.melo@mulenvos.gv.ao",     phone: "+244 922 001 020", nif: "003678901LA",  profile: "Admin",    neighborhoods: BAIRROS.slice(0,5) as Bairro[],                  status: "Activo",   createdAt: "2024-11-01", lastActivity: "Hoje, 07:30" },
];

const SEED_AUDIT: AuditEntry[] = [
  { id:1,  ts:"09/05/2025 08:42", actor:"Carlos Alberto Santos", action:"Editou utilizador",    target:"Rosa Amélia Mendonça",   detail:"Status: Pendente → Activo",                   type:"edit"     },
  { id:2,  ts:"09/05/2025 07:15", actor:"Carlos Alberto Santos", action:"Criou utilizador",     target:"Vanessa Cristóvão Melo", detail:"Perfil: Admin, 5 bairros atribuídos",          type:"create"   },
  { id:3,  ts:"08/05/2025 16:30", actor:"Carlos Alberto Santos", action:"Alterou perfil",       target:"António Sebastião Dias", detail:"Técnico → Analista",                          type:"edit"     },
  { id:4,  ts:"08/05/2025 14:05", actor:"Maria da Graça Lopes",  action:"Suspendeu utilizador", target:"Pedro Celestino Vieira", detail:"Motivo: Inactividade > 60 dias",              type:"suspend"  },
  { id:5,  ts:"07/05/2025 11:20", actor:"Carlos Alberto Santos", action:"Acção em lote (3)",    target:"3 utilizadores",         detail:"Perfil alterado para Técnico",                type:"bulk"     },
  { id:6,  ts:"06/05/2025 09:00", actor:"Carlos Alberto Santos", action:"Activou utilizador",   target:"Lurdes Esperança Costa", detail:"Status: Suspenso → Activo",                   type:"activate" },
  { id:7,  ts:"05/05/2025 16:45", actor:"Maria da Graça Lopes",  action:"Editou utilizador",    target:"Beatriz Nhanga Sousa",   detail:"Bairros: +CAOP B",                            type:"edit"     },
  { id:8,  ts:"04/05/2025 14:00", actor:"Carlos Alberto Santos", action:"Suspendeu utilizador", target:"José António Queirós",   detail:"Motivo: Violação de termos de uso",           type:"suspend"  },
  { id:9,  ts:"03/05/2025 10:30", actor:"Carlos Alberto Santos", action:"Criou utilizador",     target:"Albino Nunes Machado",   detail:"Perfil: Cidadão, KM 9-B",                     type:"create"   },
  { id:10, ts:"02/05/2025 09:15", actor:"Maria da Graça Lopes",  action:"Editou utilizador",    target:"Helder Simão Bernardo",  detail:"Telefone actualizado",                        type:"edit"     },
  { id:11, ts:"01/05/2025 15:00", actor:"Carlos Alberto Santos", action:"Criou utilizador",     target:"Inês Margarida Sampaio", detail:"Perfil: Gestor, 3 bairros atribuídos",         type:"create"   },
  { id:12, ts:"30/04/2025 11:45", actor:"Carlos Alberto Santos", action:"Acção em lote (5)",    target:"5 utilizadores",         detail:"Status alterado para Activo",                 type:"bulk"     },
  { id:13, ts:"28/04/2025 08:20", actor:"Maria da Graça Lopes",  action:"Editou utilizador",    target:"Manuel Augusto Ferreira",detail:"Bairros: Capalanga adicionado",               type:"edit"     },
  { id:14, ts:"25/04/2025 16:00", actor:"Carlos Alberto Santos", action:"Criou utilizador",     target:"Rui Marcos Jacinto",     detail:"Perfil: Analista, 3 bairros, Status: Pendente",type:"create"  },
  { id:15, ts:"20/04/2025 13:30", actor:"Carlos Alberto Santos", action:"Removeu utilizador",   target:"Ex-Técnico (id:21)",     detail:"Eliminação permanente solicitada por Admin",   type:"delete"   },
];

// ─── Style maps ──────────────────────────────────────────────────
const PROFILE_STYLE: Record<Profile, string> = {
  Admin:    "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400",
  Gestor:   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Analista: "bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400",
  Técnico:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Cidadão:  "bg-zinc-100  text-zinc-600  dark:bg-zinc-800     dark:text-zinc-400",
};
const STATUS_STYLE: Record<Status, string> = {
  Activo:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Suspenso: "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400",
  Pendente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};
const AUDIT_ICON: Record<AuditEntry["type"], string> = {
  create:   "bg-green-500",
  edit:     "bg-blue-500",
  suspend:  "bg-red-500",
  activate: "bg-green-500",
  delete:   "bg-zinc-500",
  bulk:     "bg-purple-500",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

// ─── Empty form state ────────────────────────────────────────────
const emptyForm = (): Omit<User, "id" | "createdAt" | "lastActivity"> => ({
  name: "", email: "", phone: "+244 9", nif: "",
  profile: "Técnico", neighborhoods: [], status: "Pendente",
});

let nextId = SEED_USERS.length + 1;
let nextAuditId = SEED_AUDIT.length + 1;

// ════════════════════════════════════════════════════════════════
export default function UserManagement() {
  const { t } = useTranslation();
  const [users,    setUsers]    = useState<User[]>([]);
  const [audit,    setAudit]    = useState<AuditEntry[]>(SEED_AUDIT);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  // Filters
  const [search,       setSearch]       = useState("");
  const [filterProfile,setFilterProfile]= useState<Profile | "">("");
  const [filterStatus, setFilterStatus] = useState<Status | "">("");
  const [filterBairro, setFilterBairro] = useState<Bairro | "">("");

  // Pagination
  const [page,     setPage]     = useState(1);
  const PAGE_SIZE = 8;

  // Form modal
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string | number | null>(null);
  const [form,      setForm]      = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [showPass,  setShowPass]  = useState(false);

  // Audit drawer
  const [showAudit,     setShowAudit]     = useState(false);
  const [auditSearch,   setAuditSearch]   = useState("");

  // Bulk profile dropdown
  const [showBulkMenu,  setShowBulkMenu]  = useState(false);

  // Confirm delete
  const [deleteTarget, setDeleteTarget]  = useState<string | number | null>(null);

  useEffect(() => {
    listAdminUsers().then(res => {
      if (!res.items) return;
      const mapped = res.items.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: "—",
        nif: "—",
        profile: ROLE_TO_PROFILE[r.role] || "Cidadão",
        neighborhoods: [] as Bairro[],
        status: "Activo" as Status,
        createdAt: new Date(r.createdAt).toLocaleDateString("pt-AO"),
        lastActivity: "—"
      }));
      setUsers([...mapped, ...SEED_USERS]);
    }).catch(console.error);
  }, []);

  // ── Derived ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return users.filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.nif.toLowerCase().includes(q);
      const matchProfile = !filterProfile || u.profile === filterProfile;
      const matchStatus  = !filterStatus  || u.status  === filterStatus;
      const matchBairro  = !filterBairro  || u.neighborhoods.includes(filterBairro as Bairro);
      return matchSearch && matchProfile && matchStatus && matchBairro;
    });
  }, [users, search, filterProfile, filterStatus, filterBairro]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allOnPageSelected = paginated.length > 0 && paginated.every(u => selected.has(u.id));

  const stats = useMemo(() => ({
    total:    users.length,
    activos:  users.filter(u => u.status === "Activo").length,
    suspensos:users.filter(u => u.status === "Suspenso").length,
    pendentes:users.filter(u => u.status === "Pendente").length,
  }), [users]);

  const filteredAudit = useMemo(() => {
    const q = auditSearch.toLowerCase();
    return !q ? audit : audit.filter(e =>
      e.target.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      e.actor.toLowerCase().includes(q)
    );
  }, [audit, auditSearch]);

  // ── Helpers ───────────────────────────────────────────────────────
  function addAudit(action: string, target: string, detail: string, type: AuditEntry["type"]) {
    const entry: AuditEntry = {
      id: nextAuditId++,
      ts: new Date().toLocaleString("pt-AO", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }).replace(",",""),
      actor: "Carlos Alberto Santos",
      action, target, detail, type,
    };
    setAudit(prev => [entry, ...prev]);
  }

  function openCreate() {
    setEditId(null);
    setForm(emptyForm());
    setFormError("");
    setShowForm(true);
  }

  function openEdit(u: User) {
    setEditId(u.id);
    setForm({ name: u.name, email: u.email, phone: u.phone, nif: u.nif, profile: u.profile, neighborhoods: [...u.neighborhoods], status: u.status });
    setFormError("");
    setShowForm(true);
  }

  function validateForm() {
    if (!form.name.trim())      return "Nome completo é obrigatório.";
    if (!form.email.includes("@")) return "Email inválido.";
    if (!form.nif.trim())       return "NIF é obrigatório.";
    if (form.neighborhoods.length === 0) return "Seleccione pelo menos um bairro.";
    return "";
  }

  async function saveForm() {
    const err = validateForm();
    if (err) { setFormError(err); return; }

    const role = PROFILE_TO_ROLE[form.profile] || "citizen";

    try {
      if (editId === null) {
        const created = await createAdminUser({
          email: form.email,
          name: form.name,
          password: "Password123!", // mock password for now
          role,
        });
        const newUser: User = {
          ...form,
          id: created.id,
          createdAt: new Date(created.createdAt).toLocaleDateString("pt-AO"),
          lastActivity: "—",
        };
        setUsers(prev => [newUser, ...prev]);
        addAudit("Criou utilizador", form.name, `Perfil: ${form.profile}`, "create");
      } else {
        await updateAdminUser(String(editId), {
          name: form.name,
          role,
        });
        setUsers(prev2 => prev2.map(u => u.id === editId ? { ...u, ...form } : u));
        addAudit("Editou utilizador", form.name, "Dados actualizados", "edit");
      }
      setShowForm(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  }

  function toggleStatus(u: User) {
    const next: Status = u.status === "Activo" ? "Suspenso" : "Activo";
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: next } : x));
    const type: AuditEntry["type"] = next === "Suspenso" ? "suspend" : "activate";
    addAudit(next === "Suspenso" ? "Suspendeu utilizador" : "Activou utilizador", u.name, `Status: ${u.status} → ${next}`, type);
  }

  function confirmDelete(id: string | number) { setDeleteTarget(id); }
  async function executeDelete() {
    if (deleteTarget === null) return;
    try {
      if (typeof deleteTarget === "string") {
        await deleteAdminUser(deleteTarget);
      }
      const u = users.find(x => x.id === deleteTarget);
      if (u) addAudit("Removeu utilizador", u.name, "Eliminação permanente", "delete");
      setUsers(prev => prev.filter(x => x.id !== deleteTarget));
      setSelected(prev => { const s = new Set(prev); s.delete(deleteTarget as any); return s; });
      setDeleteTarget(null);
    } catch (e) {
      alert("Error deleting user: " + e);
    }
  }

  function toggleSelect(id: string | number) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id as any) ? s.delete(id as any) : s.add(id as any);
      return s;
    });
  }

  function toggleAll() {
    if (allOnPageSelected) {
      setSelected(prev => { const s = new Set(prev); paginated.forEach(u => s.delete(u.id)); return s; });
    } else {
      setSelected(prev => { const s = new Set(prev); paginated.forEach(u => s.add(u.id)); return s; });
    }
  }

  function bulkSuspend() {
    const names: string[] = [];
    setUsers(prev => prev.map(u => {
      if (selected.has(u.id) && u.status === "Activo") { names.push(u.name); return { ...u, status: "Suspenso" as Status }; }
      return u;
    }));
    if (names.length) addAudit(`Acção em lote (${names.length})`, `${names.length} utilizadores`, "Status alterado para Suspenso", "bulk");
    setSelected(new Set());
  }

  function bulkActivate() {
    const names: string[] = [];
    setUsers(prev => prev.map(u => {
      if (selected.has(u.id) && u.status !== "Activo") { names.push(u.name); return { ...u, status: "Activo" as Status }; }
      return u;
    }));
    if (names.length) addAudit(`Acção em lote (${names.length})`, `${names.length} utilizadores`, "Status alterado para Activo", "bulk");
    setSelected(new Set());
  }

  function bulkChangeProfile(profile: Profile) {
    const names: string[] = [];
    setUsers(prev => prev.map(u => {
      if (selected.has(u.id)) { names.push(u.name); return { ...u, profile }; }
      return u;
    }));
    if (names.length) addAudit(`Acção em lote (${names.length})`, `${names.length} utilizadores`, `Perfil alterado para ${profile}`, "bulk");
    setSelected(new Set());
    setShowBulkMenu(false);
  }

  function exportCSV() {
    const header = "ID,Nome,Email,Perfil,Bairros,Status,Registo,Última Actividade";
    const rows = filtered.map(u =>
      [u.id, u.name, u.email, u.profile, u.neighborhoods.join("|"), u.status, u.createdAt, u.lastActivity].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `op1na1_utilizadores_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  function toggleNeighborhood(b: Bairro) {
    setForm(f => ({
      ...f,
      neighborhoods: f.neighborhoods.includes(b)
        ? f.neighborhoods.filter(n => n !== b)
        : [...f.neighborhoods, b],
    }));
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <main id="main-content" className="flex flex-col gap-4 min-h-0">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCog aria-hidden="true" size={15} className="text-primary" />
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Gestão de Utilizadores
            </h1>
            <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">ADMIN</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Município dos Mulenvos · 882.014 hab. (INE Censo 2024) · {users.length} utilizadores registados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAudit(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
            <ClipboardList aria-hidden="true" size={15} /> Log de Auditoria
            <span className="ml-1 bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {audit.length}
            </span>
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
            <Download aria-hidden="true" size={15} /> Exportar CSV
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus aria-hidden="true" size={15} /> Novo Utilizador
          </button>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",     value: stats.total,    color: "text-foreground" },
          { label: "Activos",   value: stats.activos,  color: "text-green-600 dark:text-green-400" },
          { label: "Suspensos", value: stats.suspensos,color: "text-red-600 dark:text-red-400" },
          { label: "Pendentes", value: stats.pendentes,color: "text-amber-600 dark:text-amber-400" },
        ].map(s => (
          <div key={s.label} className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={cn("text-2xl font-extrabold", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl px-4 py-3">
        <Filter aria-hidden="true" size={15} className="text-muted-foreground shrink-0" />
        <div className="relative flex-1 min-w-44">
          <Search aria-hidden="true" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Pesquisar nome, email ou NIF…"
            aria-label="Pesquisar utilizadores por nome, email ou NIF"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {([
          { label: "Perfil",  value: filterProfile, set: setFilterProfile, opts: PROFILES },
          { label: "Status",  value: filterStatus,  set: setFilterStatus,  opts: STATUSES },
          { label: "Bairro",  value: filterBairro,  set: setFilterBairro,  opts: BAIRROS  },
        ] as const).map(f => (
          <select key={f.label} value={f.value}
            aria-label={`Filtrar por ${f.label}`}
            onChange={e => { (f.set as (v: string) => void)(e.target.value); setPage(1); }}
            className="py-1.5 px-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
            <option value="">Todos {f.label}s</option>
            {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        {(search || filterProfile || filterStatus || filterBairro) && (
          <button onClick={() => { setSearch(""); setFilterProfile(""); setFilterStatus(""); setFilterBairro(""); setPage(1); }}
            className="text-xs text-primary hover:underline">
            Limpar filtros
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} resultado(s)</span>
      </div>

      {/* ── Bulk action bar ──────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5">
          <span className="text-xs font-semibold text-primary">{selected.size} seleccionado(s)</span>
          <div className="h-4 w-px bg-border mx-1" />
          <button onClick={bulkSuspend}
            className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline">
            <Ban aria-hidden="true" size={15} /> Suspender
          </button>
          <button onClick={bulkActivate}
            className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 hover:underline">
            <CheckCircle aria-hidden="true" size={15} /> Activar
          </button>
          <div className="relative">
            <button onClick={() => setShowBulkMenu(v => !v)}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
              <Shield aria-hidden="true" size={15} /> Mudar Perfil <ChevronDown aria-hidden="true" size={15} />
            </button>
            {showBulkMenu && (
              <div className="absolute top-6 left-0 z-50 bg-card dark:bg-zinc-800 border border-border rounded-xl shadow-xl py-1 min-w-32">
                {PROFILES.map(p => (
                  <button key={p} onClick={() => bulkChangeProfile(p)}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-secondary font-medium">
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
            Cancelar
          </button>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────── */}
      <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table aria-label="Lista de utilizadores" className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50 dark:bg-zinc-800/60">
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll}
                    aria-label="Seleccionar todos os utilizadores nesta página"
                    className="rounded border-border cursor-pointer accent-primary" />
                </th>
                <th className="px-3 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Utilizador</th>
                <th className="px-3 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">{t("users.columns.role")}</th>
                <th className="px-3 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Bairros</th>
                <th className="px-3 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">{t("users.columns.createdAt")}</th>
                <th className="px-3 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">{t("users.columns.actions")}</th>
                <th className="px-3 py-3 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wider">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-zinc-800">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    Nenhum utilizador encontrado com os filtros actuais.
                  </td>
                </tr>
              )}
              {paginated.map(u => (
                <tr key={u.id} className={cn(
                  "hover:bg-secondary/30 dark:hover:bg-zinc-800/40 transition-colors",
                  selected.has(u.id) && "bg-primary/5 dark:bg-primary/10"
                )}>
                  <td className="px-3 py-3 w-10">
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)}
                      aria-label={`Seleccionar utilizador ${u.name}`}
                      className="rounded border-border cursor-pointer accent-primary" />
                  </td>

                  {/* Name + email */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0",
                        u.profile === "Admin"    ? "bg-red-500" :
                        u.profile === "Gestor"   ? "bg-purple-500" :
                        u.profile === "Analista" ? "bg-blue-500" :
                        u.profile === "Técnico"  ? "bg-green-600" : "bg-zinc-500"
                      )}>
                        {initials(u.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground leading-tight">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Profile */}
                  <td className="px-3 py-3">
                    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", PROFILE_STYLE[u.profile])}>
                      {u.profile}
                    </span>
                  </td>

                  {/* Neighborhoods */}
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1 max-w-44">
                      {u.neighborhoods.slice(0, 2).map(b => (
                        <span key={b} className="text-[10px] bg-secondary dark:bg-zinc-700 text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                          {b}
                        </span>
                      ))}
                      {u.neighborhoods.length > 2 && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                          +{u.neighborhoods.length - 2}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", STATUS_STYLE[u.status])}>
                      {u.status}
                    </span>
                  </td>

                  {/* Created */}
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{u.createdAt}</td>

                  {/* Last activity */}
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{u.lastActivity}</td>

                  {/* Actions */}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button aria-label={t("common.edit")} onClick={() => openEdit(u)} title="Editar"
                        className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors">
                        <Edit2 aria-hidden="true" size={15} />
                      </button>
                      <button aria-label={u.status === "Activo" ? "Suspender" : "Activar"} onClick={() => toggleStatus(u)}
                        title={u.status === "Activo" ? "Suspender" : "Activar"}
                        className={cn("p-1.5 rounded-lg transition-colors",
                          u.status === "Activo"
                            ? "hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                            : "hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400"
                        )}>
                        {u.status === "Activo" ? <Ban aria-hidden="true" size={15} /> : <CheckCircle aria-hidden="true" size={15} />}
                      </button>
                      <button aria-label={t("common.delete")} onClick={() => confirmDelete(u.id)} title="Eliminar"
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors">
                        <Trash2 aria-hidden="true" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border dark:border-zinc-800 bg-secondary/30">
          <p className="text-xs text-muted-foreground">
            A mostrar {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} utilizadores
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              aria-label="Página anterior"
              className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft aria-hidden="true" size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={cn("w-7 h-7 rounded-lg text-xs font-semibold transition-colors",
                  p === page ? "bg-primary text-white" : "border border-border hover:bg-secondary text-muted-foreground"
                )}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              aria-label="Próxima página"
              className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight aria-hidden="true" size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          FORM MODAL
      ══════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="relative bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
          >

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-zinc-700 sticky top-0 bg-card dark:bg-zinc-900 z-10">
              <div>
                <h2 id="modal-title" className="text-lg font-bold text-foreground">
                  {editId === null ? "Criar Utilizador" : "Editar Utilizador"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editId === null ? "Preencha todos os campos obrigatórios." : "Actualize os campos necessários."}
                </p>
              </div>
              <button onClick={() => setShowForm(false)}
                aria-label="Fechar diálogo"
                className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <X aria-hidden="true" size={15} />
              </button>
            </div>

            {/* Form body */}
            <div className="px-6 py-5 space-y-4">
              {formError && (
                <div role="alert" aria-live="assertive" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Nome Completo *
                </label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  placeholder="ex: Carlos Alberto Santos"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email *</label>
                  <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                    type="email" placeholder="email@mulenvos.gv.ao"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Telefone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                    placeholder="+244 9XX XXX XXX"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              {/* NIF + Profile */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">NIF *</label>
                  <input value={form.nif} onChange={e => setForm(f => ({...f, nif: e.target.value}))}
                    placeholder="000000000LA"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Perfil RBAC *</label>
                  <select value={form.profile} onChange={e => setForm(f => ({...f, profile: e.target.value as Profile}))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Status (edit only) */}
              {editId !== null && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as Status}))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {/* Neighborhoods multi-select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Bairros a Gerir * <span className="normal-case font-normal">({form.neighborhoods.length}/{BAIRROS.length} seleccionado(s))</span>
                  </label>
                  <button type="button" onClick={() =>
                    setForm(f => ({ ...f, neighborhoods: f.neighborhoods.length === BAIRROS.length ? [] : [...BAIRROS] }))
                  } className="text-xs text-primary hover:underline">
                    {form.neighborhoods.length === BAIRROS.length ? "Desmarcar todos" : "Todos os bairros"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 bg-secondary/40 dark:bg-zinc-800/40 rounded-xl p-3 border border-border dark:border-zinc-700">
                  {BAIRROS.map(b => (
                    <label key={b} className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
                      form.neighborhoods.includes(b)
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-secondary text-foreground"
                    )}>
                      <input type="checkbox" checked={form.neighborhoods.includes(b)} onChange={() => toggleNeighborhood(b)}
                        className="accent-primary cursor-pointer" />
                      {b}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border dark:border-zinc-700 sticky bottom-0 bg-card dark:bg-zinc-900">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={saveForm}
                className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
                {editId === null ? "Criar Utilizador" : "Guardar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          DELETE CONFIRM MODAL
      ══════════════════════════════════════════════════════════ */}
      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-card dark:bg-zinc-900 border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-foreground mb-2">Confirmar Eliminação</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Esta acção é <strong>permanente e irreversível</strong>. O utilizador e todos os seus dados serão removidos do sistema.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={executeDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          AUDIT LOG DRAWER
      ══════════════════════════════════════════════════════════ */}
      {showAudit && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setShowAudit(false)} />
          <div className="w-full max-w-md bg-card dark:bg-zinc-900 border-l border-border dark:border-zinc-700 shadow-2xl flex flex-col h-full">

            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <ClipboardList aria-hidden="true" size={15} className="text-primary" />
                <h3 className="font-bold text-foreground">Log de Auditoria</h3>
                <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-medium">{audit.length} entradas</span>
              </div>
              <button onClick={() => setShowAudit(false)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X aria-hidden="true" size={15} />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-border dark:border-zinc-700">
              <div className="relative">
                <Search aria-hidden="true" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)}
                  placeholder="Pesquisar acção, utilizador…"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>

            {/* Entries */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-0">
              {filteredAudit.map((e, i) => (
                <div key={e.id} className="flex gap-3 py-3 border-b border-border/50 dark:border-zinc-800/50 last:border-0">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <span className={cn("w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0", AUDIT_ICON[e.type])} />
                    {i < filteredAudit.length - 1 && (
                      <span className="w-px flex-1 bg-border dark:bg-zinc-700 mt-1 min-h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground leading-tight">{e.action}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{e.ts}</span>
                    </div>
                    <p className="text-xs text-primary font-medium mt-0.5">{e.target}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{e.detail}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">por {e.actor}</p>
                  </div>
                </div>
              ))}
              {filteredAudit.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Nenhum registo encontrado.</p>
              )}
            </div>

            {/* Drawer footer */}
            <div className="px-5 py-3 border-t border-border dark:border-zinc-700">
              <p className="text-xs text-muted-foreground text-center">
                Retenção: 12 meses · Exportação via CSV disponível
              </p>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
