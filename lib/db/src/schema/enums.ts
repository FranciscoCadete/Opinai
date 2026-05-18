import { pgEnum } from "drizzle-orm/pg-core";

export const requestTypeEnum = pgEnum("request_type", [
  "reclamacao",
  "sugestao",
  "denuncia",
  "solicitacao",
  "elogio",
  "urgente",
]);

export const channelEnum = pgEnum("channel", [
  "portal",
  "whatsapp",
  "sms",
  "ussd",
  "messenger",
  "app",
  "mediator",
]);

export const statusEnum = pgEnum("request_status", [
  "received",
  "triaged",
  "assigned",
  "in_progress",
  "resolved",
  "rejected",
]);

export const priorityEnum = pgEnum("priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const userRoleEnum = pgEnum("user_role", [
  "citizen",
  "technician",
  "manager",
  "admin",
]);

export const estratoEnum = pgEnum("estrato", ["A", "B", "C"]);
