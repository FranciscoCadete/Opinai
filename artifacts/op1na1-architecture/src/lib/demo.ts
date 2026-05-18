// Demo mode — funciona sem backend (sem DATABASE_URL).
// Credenciais aceites:
//   admin@op1na1.local    / ChangeMe!2025   (role: admin)
//   gestor@op1na1.local   / ChangeMe!2025   (role: manager)
//   tecnico@op1na1.local  / ChangeMe!2025   (role: technician)

import type {
  SessionUser,
  AdminRequestRow,
  AdminRequestsResponse,
  AdminRequestsQuery,
  AdminUserRow,
  AdminUsersResponse,
  AdminUsersQuery,
  CreateUserInput,
  UpdateUserInput,
  AdminAuditLogRow,
  AdminAuditLogResponse,
  AdminAuditLogQuery,
  RealtimeStats,
} from "./api";

export const DEMO_MODE =
  (import.meta.env.VITE_DEMO_MODE as string | undefined) === "true";

// ─── Session ────────────────────────────────────────────────────────────────

const SESSION_KEY = "op1na1_demo_session";

const DEMO_CREDS: Record<string, { password: string; user: SessionUser }> = {
  "admin@op1na1.local": {
    password: "ChangeMe!2025",
    user: { id: "d-admin-001", email: "admin@op1na1.local", name: "Administrador", role: "admin", municipalityId: "d-muni-001" },
  },
  "gestor@op1na1.local": {
    password: "ChangeMe!2025",
    user: { id: "d-mgr-001", email: "gestor@op1na1.local", name: "Gestor Demo", role: "manager", municipalityId: "d-muni-001" },
  },
  "tecnico@op1na1.local": {
    password: "ChangeMe!2025",
    user: { id: "d-tech-001", email: "tecnico@op1na1.local", name: "Técnico Demo", role: "technician", municipalityId: "d-muni-001" },
  },
};

export function demoLogin(email: string, password: string): SessionUser {
  const entry = DEMO_CREDS[email.toLowerCase()];
  if (!entry || entry.password !== password) {
    throw new Error("Credenciais inválidas.");
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(entry.user));
  return entry.user;
}

export function demoLogout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function demoGetMe(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

// ─── Mock requests ──────────────────────────────────────────────────────────

const BAIRROS = ["KM 9-B", "KM 12-B", "Mulenvos de Cima", "Baixa de Cassanje", "KM 14-B", "Boa-Fé", "CAOP A", "CAOP B", "Capalanga"];
const CHANNELS = ["portal", "whatsapp", "sms", "messenger", "ussd"];
const CATEGORIES = ["infraestrutura", "saúde", "educação", "saneamento", "segurança", "outro"];
const STATUSES: AdminRequestRow["status"][] = ["received", "triaged", "assigned", "in_progress", "resolved", "rejected"];
const PRIORITIES: AdminRequestRow["priority"][] = ["low", "normal", "high", "urgent"];

function iso(daysAgo: number, hoursAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

let _requests: AdminRequestRow[] = [
  {
    id: "r-001", ticketId: "MUL-20260501-A1B2", type: "reclamacao", category: "saneamento",
    description: "Falta de água há 3 dias no bairro KM 9-B, afecta mais de 200 famílias.",
    status: "in_progress", priority: "urgent", channel: "whatsapp",
    bairroName: "KM 9-B", contactName: "João Silva", contactPhone: "+244923456789",
    isAnonymous: false, assignedToName: "Técnico Demo", assignedToId: "d-tech-001",
    createdAt: iso(5), updatedAt: iso(1), resolvedAt: null,
  },
  {
    id: "r-002", ticketId: "MUL-20260503-C3D4", type: "sugestao", category: "educação",
    description: "Proposta de instalação de biblioteca pública no Mulenvos de Cima.",
    status: "triaged", priority: "normal", channel: "portal",
    bairroName: "Mulenvos de Cima", contactName: "Maria Fernandes", contactPhone: null,
    isAnonymous: false, assignedToName: null, assignedToId: null,
    createdAt: iso(4), updatedAt: iso(4), resolvedAt: null,
  },
  {
    id: "r-003", ticketId: "MUL-20260504-E5F6", type: "reclamacao", category: "infraestrutura",
    description: "Buraco na estrada principal da Baixa de Cassanje, risco de acidentes.",
    status: "assigned", priority: "high", channel: "sms",
    bairroName: "Baixa de Cassanje", contactName: null, contactPhone: "+244911222333",
    isAnonymous: true, assignedToName: "Técnico Demo", assignedToId: "d-tech-001",
    createdAt: iso(3), updatedAt: iso(2), resolvedAt: null,
  },
  {
    id: "r-004", ticketId: "MUL-20260505-G7H8", type: "reclamacao", category: "saúde",
    description: "Centro de saúde do KM 12-B sem medicamentos básicos há duas semanas.",
    status: "received", priority: "urgent", channel: "whatsapp",
    bairroName: "KM 12-B", contactName: "Ana Costa", contactPhone: "+244934567890",
    isAnonymous: false, assignedToName: null, assignedToId: null,
    createdAt: iso(1), updatedAt: iso(1), resolvedAt: null,
  },
  {
    id: "r-005", ticketId: "MUL-20260506-I9J0", type: "reclamacao", category: "saneamento",
    description: "Lixo acumulado há 10 dias no CAOP A, mau cheiro e risco sanitário.",
    status: "resolved", priority: "high", channel: "ussd",
    bairroName: "CAOP A", contactName: null, contactPhone: null,
    isAnonymous: true, assignedToName: "Técnico Demo", assignedToId: "d-tech-001",
    createdAt: iso(12), updatedAt: iso(0, 3), resolvedAt: iso(0, 3),
  },
  {
    id: "r-006", ticketId: "MUL-20260507-K1L2", type: "sugestao", category: "segurança",
    description: "Pedido de colocação de iluminação pública na rua principal da Boa-Fé.",
    status: "triaged", priority: "normal", channel: "messenger",
    bairroName: "Boa-Fé", contactName: "Pedro Neto", contactPhone: "+244912345678",
    isAnonymous: false, assignedToName: null, assignedToId: null,
    createdAt: iso(6), updatedAt: iso(6), resolvedAt: null,
  },
  {
    id: "r-007", ticketId: "MUL-20260508-M3N4", type: "reclamacao", category: "infraestrutura",
    description: "Linha eléctrica partida no KM 14-B, perigo imediato para os moradores.",
    status: "in_progress", priority: "urgent", channel: "whatsapp",
    bairroName: "KM 14-B", contactName: "Luísa Gomes", contactPhone: "+244923111222",
    isAnonymous: false, assignedToName: "Técnico Demo", assignedToId: "d-tech-001",
    createdAt: iso(0, 6), updatedAt: iso(0, 2), resolvedAt: null,
  },
  {
    id: "r-008", ticketId: "MUL-20260509-O5P6", type: "reclamacao", category: "saneamento",
    description: "Canalização rebentada na Capalanga, água a correr para a rua há 2 dias.",
    status: "assigned", priority: "high", channel: "portal",
    bairroName: "Capalanga", contactName: "Carlos Mbala", contactPhone: null,
    isAnonymous: false, assignedToName: "Técnico Demo", assignedToId: "d-tech-001",
    createdAt: iso(2), updatedAt: iso(1), resolvedAt: null,
  },
  {
    id: "r-009", ticketId: "MUL-20260510-Q7R8", type: "outro", category: "outro",
    description: "Dúvida sobre documentação necessária para licença de construção.",
    status: "resolved", priority: "low", channel: "portal",
    bairroName: "KM 9-B", contactName: "Sara Lopes", contactPhone: "+244934000111",
    isAnonymous: false, assignedToName: "Gestor Demo", assignedToId: "d-mgr-001",
    createdAt: iso(20), updatedAt: iso(18), resolvedAt: iso(18),
  },
  {
    id: "r-010", ticketId: "MUL-20260511-S9T0", type: "reclamacao", category: "educação",
    description: "Escola primária do CAOP B sem professor de matemática há um mês.",
    status: "received", priority: "high", channel: "sms",
    bairroName: "CAOP B", contactName: null, contactPhone: "+244912888777",
    isAnonymous: true, assignedToName: null, assignedToId: null,
    createdAt: iso(0, 1), updatedAt: iso(0, 1), resolvedAt: null,
  },
  {
    id: "r-011", ticketId: "MUL-20260512-U1V2", type: "sugestao", category: "infraestrutura",
    description: "Proposta de requalificação do mercado informal do KM 12-B.",
    status: "triaged", priority: "normal", channel: "messenger",
    bairroName: "KM 12-B", contactName: "Tomás Vieira", contactPhone: null,
    isAnonymous: false, assignedToName: null, assignedToId: null,
    createdAt: iso(8), updatedAt: iso(7), resolvedAt: null,
  },
  {
    id: "r-012", ticketId: "MUL-20260513-W3X4", type: "reclamacao", category: "segurança",
    description: "Conflito de vizinhança recorrente no CAOP C, pedido de mediação.",
    status: "rejected", priority: "normal", channel: "ussd",
    bairroName: "CAOP C", contactName: null, contactPhone: null,
    isAnonymous: true, assignedToName: null, assignedToId: null,
    createdAt: iso(15), updatedAt: iso(14), resolvedAt: null,
  },
];

// Mutável em memória para PATCH
let _mutatedRequests = [..._requests];

function filterRequests(q: AdminRequestsQuery): AdminRequestRow[] {
  return _mutatedRequests.filter(r => {
    if (q.status && r.status !== q.status) return false;
    if (q.priority && r.priority !== q.priority) return false;
    if (q.type && r.type !== q.type) return false;
    if (q.assignedTo && r.assignedToId !== q.assignedTo) return false;
    if (q.search) {
      const s = q.search.toLowerCase();
      if (!r.description.toLowerCase().includes(s) && !r.ticketId.toLowerCase().includes(s) && !(r.contactName ?? "").toLowerCase().includes(s)) return false;
    }
    return true;
  });
}

export function demoListAdminRequests(q: AdminRequestsQuery = {}): AdminRequestsResponse {
  const filtered = filterRequests(q);
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 20;
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize };
}

export function demoUpdateAdminRequest(id: string, payload: { status?: AdminRequestRow["status"]; priority?: AdminRequestRow["priority"]; assignedToId?: string | null }) {
  const idx = _mutatedRequests.findIndex(r => r.id === id);
  if (idx === -1) throw new Error("Pedido não encontrado.");
  const r = { ..._mutatedRequests[idx] };
  if (payload.status) r.status = payload.status;
  if (payload.priority) r.priority = payload.priority;
  if ("assignedToId" in payload) {
    r.assignedToId = payload.assignedToId ?? null;
    r.assignedToName = payload.assignedToId === "d-tech-001" ? "Técnico Demo" : payload.assignedToId === "d-mgr-001" ? "Gestor Demo" : null;
  }
  r.updatedAt = new Date().toISOString();
  if (r.status === "resolved" && !r.resolvedAt) r.resolvedAt = r.updatedAt;
  _mutatedRequests[idx] = r;
  return { id: r.id, ticketId: r.ticketId, status: r.status, priority: r.priority, assignedToId: r.assignedToId, updatedAt: r.updatedAt, resolvedAt: r.resolvedAt };
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export function demoGetRealtimeStats(): RealtimeStats {
  const resolved = _mutatedRequests.filter(r => r.status === "resolved").length;
  const inProg = _mutatedRequests.filter(r => ["assigned", "in_progress"].includes(r.status)).length;
  return {
    resolvedThisMonth: resolved,
    inProgress: inProg,
    averageResponseHours: 18.4,
    activeMediators: 3,
    bairrosCovered: 9,
    channelsAvailable: 5,
    byCategory: [
      { label: "Saneamento",      pct: 33 },
      { label: "Infraestrutura",  pct: 25 },
      { label: "Saúde",           pct: 16 },
      { label: "Segurança",       pct: 12 },
      { label: "Educação",        pct: 9  },
      { label: "Outro",           pct: 5  },
    ],
    byBairro: [
      { name: "KM 9-B",            estrato: "A", count: 3 },
      { name: "KM 12-B",           estrato: "A", count: 3 },
      { name: "Mulenvos de Cima",  estrato: "B", count: 1 },
      { name: "Baixa de Cassanje", estrato: "B", count: 1 },
      { name: "KM 14-B",           estrato: "B", count: 1 },
      { name: "Boa-Fé",            estrato: "B", count: 1 },
      { name: "CAOP A",            estrato: "C", count: 1 },
      { name: "CAOP B",            estrato: "C", count: 1 },
      { name: "Capalanga",         estrato: "C", count: 1 },
    ],
  };
}

// ─── Users ──────────────────────────────────────────────────────────────────

let _users: AdminUserRow[] = [
  { id: "d-admin-001", email: "admin@op1na1.local",   name: "Administrador",  role: "admin",       municipalityId: "d-muni-001", createdAt: iso(90), updatedAt: iso(90) },
  { id: "d-mgr-001",   email: "gestor@op1na1.local",  name: "Gestor Demo",    role: "manager",     municipalityId: "d-muni-001", createdAt: iso(60), updatedAt: iso(60) },
  { id: "d-tech-001",  email: "tecnico@op1na1.local", name: "Técnico Demo",   role: "technician",  municipalityId: "d-muni-001", createdAt: iso(30), updatedAt: iso(30) },
];

export function demoListAdminUsers(q: AdminUsersQuery = {}): AdminUsersResponse {
  let items = [..._users];
  if (q.role) items = items.filter(u => u.role === q.role);
  if (q.search) {
    const s = q.search.toLowerCase();
    items = items.filter(u => u.email.toLowerCase().includes(s) || u.name.toLowerCase().includes(s));
  }
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 20;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}

export function demoCreateAdminUser(payload: CreateUserInput): AdminUserRow {
  const exists = _users.find(u => u.email === payload.email);
  if (exists) throw new Error("Email já registado.");
  const newUser: AdminUserRow = {
    id: `d-user-${Date.now()}`,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    municipalityId: payload.municipalityId ?? "d-muni-001",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  _users.push(newUser);
  return newUser;
}

export function demoUpdateAdminUser(id: string, payload: UpdateUserInput): AdminUserRow {
  const idx = _users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error("Utilizador não encontrado.");
  const u = { ..._users[idx], ...payload, updatedAt: new Date().toISOString() };
  _users[idx] = u;
  return u;
}

export function demoDeleteAdminUser(id: string): { deleted: boolean; id: string } {
  const idx = _users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error("Utilizador não encontrado.");
  _users.splice(idx, 1);
  return { deleted: true, id };
}

// ─── Audit log ──────────────────────────────────────────────────────────────

const _auditLog: AdminAuditLogRow[] = [
  { id: "al-001", actorUserId: "d-admin-001", actorName: "Administrador", actorEmail: "admin@op1na1.local", action: "user.created",    entityType: "user",    entityId: "d-tech-001", payload: { role: "technician" }, ipAddress: "192.168.1.10", userAgent: "Mozilla/5.0", createdAt: iso(30) },
  { id: "al-002", actorUserId: "d-tech-001",  actorName: "Técnico Demo",  actorEmail: "tecnico@op1na1.local", action: "request.updated", entityType: "request", entityId: "r-001", payload: { status: "in_progress" }, ipAddress: "192.168.1.12", userAgent: "Mozilla/5.0", createdAt: iso(1) },
  { id: "al-003", actorUserId: "d-tech-001",  actorName: "Técnico Demo",  actorEmail: "tecnico@op1na1.local", action: "request.updated", entityType: "request", entityId: "r-005", payload: { status: "resolved" }, ipAddress: "192.168.1.12", userAgent: "Mozilla/5.0", createdAt: iso(0, 3) },
  { id: "al-004", actorUserId: "d-admin-001", actorName: "Administrador", actorEmail: "admin@op1na1.local", action: "audit.exported",  entityType: "audit",   entityId: "export", payload: { format: "csv", rows: 50 }, ipAddress: "192.168.1.10", userAgent: "Mozilla/5.0", createdAt: iso(5) },
  { id: "al-005", actorUserId: "d-mgr-001",   actorName: "Gestor Demo",   actorEmail: "gestor@op1na1.local", action: "request.updated", entityType: "request", entityId: "r-009", payload: { status: "resolved" }, ipAddress: "192.168.1.11", userAgent: "Mozilla/5.0", createdAt: iso(18) },
];

export function demoListAdminAuditLog(q: AdminAuditLogQuery = {}): AdminAuditLogResponse {
  let items = [..._auditLog];
  if (q.action) items = items.filter(e => e.action.includes(q.action!));
  if (q.entityType) items = items.filter(e => e.entityType === q.entityType);
  if (q.actorUserId) items = items.filter(e => e.actorUserId === q.actorUserId);
  if (q.search) {
    const s = q.search.toLowerCase();
    items = items.filter(e => e.action.includes(s) || (e.actorEmail ?? "").includes(s));
  }
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 20;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}
