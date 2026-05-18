import { z } from "zod";

export const RequestType = z.enum([
  "reclamacao",
  "sugestao",
  "denuncia",
  "solicitacao",
  "elogio",
  "urgente",
]);
export type RequestType = z.infer<typeof RequestType>;

export const Channel = z.enum([
  "portal",
  "whatsapp",
  "sms",
  "ussd",
  "messenger",
  "app",
  "mediator",
]);
export type Channel = z.infer<typeof Channel>;

export const RequestStatus = z.enum([
  "received",
  "triaged",
  "assigned",
  "in_progress",
  "resolved",
  "rejected",
]);
export type RequestStatus = z.infer<typeof RequestStatus>;

export const Priority = z.enum(["low", "normal", "high", "urgent"]);
export type Priority = z.infer<typeof Priority>;

export const Estrato = z.enum(["A", "B", "C"]);
export type Estrato = z.infer<typeof Estrato>;

export const SubmitCitizenRequestInput = z.object({
  type: RequestType,
  category: z.string().min(1).max(120),
  description: z.string().min(20).max(800),
  contactName: z.string().max(200).optional().nullable(),
  contactPhone: z.string().max(40).optional().nullable(),
  isAnonymous: z.boolean().default(false),
  channel: Channel.default("portal"),
  bairroId: z.string().uuid().optional().nullable(),
  bairroName: z.string().max(120).optional().nullable(),
  gpsLat: z.number().min(-90).max(90).optional().nullable(),
  gpsLng: z.number().min(-180).max(180).optional().nullable(),
  locationReference: z.string().max(400).optional().nullable(),
  acceptedTerms: z.literal(true),
  municipalitySlug: z.string().min(1).default("mulenvos"),
});
export type SubmitCitizenRequestInput = z.infer<
  typeof SubmitCitizenRequestInput
>;

export const PublicCitizenRequest = z.object({
  ticketId: z.string(),
  type: RequestType,
  status: RequestStatus,
  priority: Priority,
  category: z.string(),
  description: z.string(),
  channel: Channel,
  bairroName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable(),
});
export type PublicCitizenRequest = z.infer<typeof PublicCitizenRequest>;

export const SubmitCitizenRequestResponse = z.object({
  ticketId: z.string(),
  status: RequestStatus,
  priority: Priority,
  createdAt: z.string(),
});
export type SubmitCitizenRequestResponse = z.infer<
  typeof SubmitCitizenRequestResponse
>;

export const RealtimeStatsResponse = z.object({
  resolvedThisMonth: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  averageResponseHours: z.number().nonnegative(),
  activeMediators: z.number().int().nonnegative(),
  bairrosCovered: z.number().int().nonnegative(),
  channelsAvailable: z.number().int().nonnegative(),
  byCategory: z.array(
    z.object({ label: z.string(), pct: z.number().min(0).max(100) }),
  ),
  byBairro: z.array(
    z.object({
      name: z.string(),
      estrato: Estrato,
      count: z.number().int().nonnegative(),
    }),
  ),
});
export type RealtimeStatsResponse = z.infer<typeof RealtimeStatsResponse>;

export const ApiError = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiError>;

export const UserRole = z.enum(["citizen", "technician", "manager", "admin"]);
export type UserRole = z.infer<typeof UserRole>;

export const LoginInput = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const SessionUserResponse = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: UserRole,
  municipalityId: z.string().uuid().nullable(),
});
export type SessionUserResponse = z.infer<typeof SessionUserResponse>;

export const AdminRequestsQuery = z.object({
  status: RequestStatus.optional(),
  priority: Priority.optional(),
  type: RequestType.optional(),
  bairroId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminRequestsQuery = z.infer<typeof AdminRequestsQuery>;

export const AdminRequestRow = z.object({
  id: z.string().uuid(),
  ticketId: z.string(),
  type: RequestType,
  category: z.string(),
  description: z.string(),
  status: RequestStatus,
  priority: Priority,
  channel: Channel,
  bairroName: z.string().nullable(),
  contactName: z.string().nullable(),
  contactPhone: z.string().nullable(),
  isAnonymous: z.boolean(),
  assignedToName: z.string().nullable(),
  assignedToId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable(),
});
export type AdminRequestRow = z.infer<typeof AdminRequestRow>;

export const AdminRequestsResponse = z.object({
  items: z.array(AdminRequestRow),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type AdminRequestsResponse = z.infer<typeof AdminRequestsResponse>;

export const UpdateRequestInput = z
  .object({
    status: RequestStatus.optional(),
    priority: Priority.optional(),
    assignedToId: z.string().uuid().nullable().optional(),
    note: z.string().max(1000).optional(),
  })
  .refine(
    (v) =>
      v.status !== undefined ||
      v.priority !== undefined ||
      v.assignedToId !== undefined,
    { message: "At least one field must be provided" },
  );
export type UpdateRequestInput = z.infer<typeof UpdateRequestInput>;

// ── Phase 5: User Management ─────────────────────────────────────

export const AdminUsersQuery = z.object({
  role: UserRole.optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminUsersQuery = z.infer<typeof AdminUsersQuery>;

export const AdminUserRow = z.object({
  id: z.string().uuid(),
  email: z.string(),
  name: z.string(),
  role: UserRole,
  municipalityId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminUserRow = z.infer<typeof AdminUserRow>;

export const AdminUsersResponse = z.object({
  items: z.array(AdminUserRow),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type AdminUsersResponse = z.infer<typeof AdminUsersResponse>;

export const CreateUserInput = z.object({
  email: z.string().email().max(254),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
  role: UserRole,
  municipalityId: z.string().uuid().nullable().optional(),
});
export type CreateUserInput = z.infer<typeof CreateUserInput>;

export const UpdateUserInput = z
  .object({
    name: z.string().min(1).max(200).optional(),
    role: UserRole.optional(),
    municipalityId: z.string().uuid().nullable().optional(),
    password: z.string().min(8).max(200).optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.role !== undefined ||
      v.municipalityId !== undefined ||
      v.password !== undefined,
    { message: "At least one field must be provided" },
  );
export type UpdateUserInput = z.infer<typeof UpdateUserInput>;

// ── Phase 5: Audit Log ───────────────────────────────────────────

export const AdminAuditLogQuery = z.object({
  action: z.string().max(100).optional(),
  entityType: z.string().max(100).optional(),
  actorUserId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminAuditLogQuery = z.infer<typeof AdminAuditLogQuery>;

export const AdminAuditLogRow = z.object({
  id: z.string().uuid(),
  actorUserId: z.string().uuid().nullable(),
  actorName: z.string().nullable(),
  actorEmail: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  payload: z.unknown().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminAuditLogRow = z.infer<typeof AdminAuditLogRow>;

export const AdminAuditLogResponse = z.object({
  items: z.array(AdminAuditLogRow),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type AdminAuditLogResponse = z.infer<typeof AdminAuditLogResponse>;
