import {
  DEMO_MODE,
  demoGetRealtimeStats,
  demoListAdminRequests,
  demoUpdateAdminRequest,
  demoListAdminUsers,
  demoCreateAdminUser,
  demoUpdateAdminUser,
  demoDeleteAdminUser,
  demoListAdminAuditLog,
} from "./demo";

export type SubmitPayload = {
  type: string;
  category: string;
  description: string;
  contactName?: string | null;
  contactPhone?: string | null;
  isAnonymous: boolean;
  channel?: string;
  bairroName?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  locationReference?: string | null;
  acceptedTerms: true;
  municipalitySlug?: string;
};

export type SubmitResponse = {
  ticketId: string;
  status: string;
  priority: string;
  createdAt: string;
};

export type TrackResponse = {
  ticketId: string;
  type: string;
  status: string;
  priority: string;
  category: string;
  description: string;
  channel: string;
  bairroName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type RealtimeStats = {
  resolvedThisMonth: number;
  inProgress: number;
  averageResponseHours: number;
  activeMediators: number;
  bairrosCovered: number;
  channelsAvailable: number;
  byCategory: { label: string; pct: number }[];
  byBairro: { name: string; estrato: "A" | "B" | "C"; count: number }[];
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    const msgRaw =
      (data &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string" &&
        (data as { error: string }).error) ||
      `Request failed (${res.status})`;
    const msg = typeof msgRaw === "string" ? msgRaw : `Request failed (${res.status})`;
    throw new ApiError(
      res.status,
      msg,
      (data as { details?: unknown })?.details,
    );
  }
  return data as T;
}

export async function submitRequest(
  payload: SubmitPayload,
): Promise<SubmitResponse> {
  const res = await fetch("/api/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow<SubmitResponse>(res);
}

export async function trackRequest(ticketId: string): Promise<TrackResponse> {
  const res = await fetch(`/api/requests/${encodeURIComponent(ticketId)}`);
  return jsonOrThrow<TrackResponse>(res);
}

export async function getRealtimeStats(): Promise<RealtimeStats> {
  if (DEMO_MODE) return demoGetRealtimeStats();
  const res = await fetch("/api/stats/realtime");
  return jsonOrThrow<RealtimeStats>(res);
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export type UserRole = "citizen" | "technician" | "manager" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  municipalityId: string | null;
};

export async function login(
  email: string,
  password: string,
): Promise<SessionUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  return jsonOrThrow<SessionUser>(res);
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export async function getMe(): Promise<SessionUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) return null;
  return jsonOrThrow<SessionUser>(res);
}

// ─── Admin ─────────────────────────────────────────────────────────────────

export type AdminRequestRow = {
  id: string;
  ticketId: string;
  type: string;
  category: string;
  description: string;
  status:
    | "received"
    | "triaged"
    | "assigned"
    | "in_progress"
    | "resolved"
    | "rejected";
  priority: "low" | "normal" | "high" | "urgent";
  channel: string;
  bairroName: string | null;
  contactName: string | null;
  contactPhone: string | null;
  isAnonymous: boolean;
  assignedToName: string | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type AdminRequestsResponse = {
  items: AdminRequestRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminRequestsQuery = {
  status?: AdminRequestRow["status"];
  priority?: AdminRequestRow["priority"];
  type?: string;
  bairroId?: string;
  assignedTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function listAdminRequests(
  q: AdminRequestsQuery = {},
): Promise<AdminRequestsResponse> {
  if (DEMO_MODE) return demoListAdminRequests(q);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && v !== "") {
      params.set(k, String(v));
    }
  }
  const qs = params.toString();
  const res = await fetch(
    `/api/admin/requests${qs ? `?${qs}` : ""}`,
    { credentials: "include" },
  );
  return jsonOrThrow<AdminRequestsResponse>(res);
}

export type UpdateRequestPayload = {
  status?: AdminRequestRow["status"];
  priority?: AdminRequestRow["priority"];
  assignedToId?: string | null;
  note?: string;
};

export async function updateAdminRequest(
  id: string,
  payload: UpdateRequestPayload,
): Promise<{
  id: string;
  ticketId: string;
  status: AdminRequestRow["status"];
  priority: AdminRequestRow["priority"];
  assignedToId: string | null;
  updatedAt: string;
  resolvedAt: string | null;
}> {
  if (DEMO_MODE) return demoUpdateAdminRequest(id, payload);
  const res = await fetch(
    `/api/admin/requests/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    },
  );
  return jsonOrThrow(res);
}

// ─── User Management ───────────────────────────────────────────────────────

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  municipalityId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUsersResponse = {
  items: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminUsersQuery = {
  role?: UserRole | "";
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function listAdminUsers(
  q: AdminUsersQuery = {},
): Promise<AdminUsersResponse> {
  if (DEMO_MODE) return demoListAdminUsers(q);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && v !== "") {
      params.set(k, String(v));
    }
  }
  const qs = params.toString();
  const res = await fetch(
    `/api/admin/users${qs ? `?${qs}` : ""}`,
    { credentials: "include" },
  );
  return jsonOrThrow<AdminUsersResponse>(res);
}

export type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  municipalityId?: string | null;
};

export async function createAdminUser(
  payload: CreateUserInput,
): Promise<AdminUserRow> {
  if (DEMO_MODE) return demoCreateAdminUser(payload);
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return jsonOrThrow<AdminUserRow>(res);
}

export type UpdateUserInput = {
  name?: string;
  role?: UserRole;
  municipalityId?: string | null;
  password?: string;
};

export async function updateAdminUser(
  id: string,
  payload: UpdateUserInput,
): Promise<AdminUserRow> {
  if (DEMO_MODE) return demoUpdateAdminUser(id, payload);
  const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return jsonOrThrow<AdminUserRow>(res);
}

export async function deleteAdminUser(
  id: string,
): Promise<{ deleted: boolean; id: string }> {
  if (DEMO_MODE) return demoDeleteAdminUser(id);
  const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  return jsonOrThrow(res);
}

// ─── Audit Log ─────────────────────────────────────────────────────────────

export type AdminAuditLogRow = {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  payload: unknown | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AdminAuditLogResponse = {
  items: AdminAuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminAuditLogQuery = {
  action?: string;
  entityType?: string;
  actorUserId?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export async function listAdminAuditLog(
  q: AdminAuditLogQuery = {},
): Promise<AdminAuditLogResponse> {
  if (DEMO_MODE) return demoListAdminAuditLog(q);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && v !== "") {
      params.set(k, String(v));
    }
  }
  const qs = params.toString();
  const res = await fetch(
    `/api/admin/audit-log${qs ? `?${qs}` : ""}`,
    { credentials: "include" },
  );
  return jsonOrThrow<AdminAuditLogResponse>(res);
}
