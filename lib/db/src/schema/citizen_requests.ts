import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { municipalitiesTable } from "./municipalities";
import { bairrosTable } from "./bairros";
import { usersTable } from "./users";
import {
  requestTypeEnum,
  channelEnum,
  statusEnum,
  priorityEnum,
} from "./enums";

export const citizenRequestsTable = pgTable(
  "citizen_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: text("ticket_id").notNull().unique(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalitiesTable.id, { onDelete: "restrict" }),
    bairroId: uuid("bairro_id").references(() => bairrosTable.id, {
      onDelete: "set null",
    }),

    type: requestTypeEnum("type").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),

    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    isAnonymous: boolean("is_anonymous").notNull().default(false),

    channel: channelEnum("channel").notNull().default("portal"),

    gpsLat: numeric("gps_lat", { precision: 10, scale: 7 }),
    gpsLng: numeric("gps_lng", { precision: 10, scale: 7 }),
    locationReference: text("location_reference"),

    status: statusEnum("status").notNull().default("received"),
    priority: priorityEnum("priority").notNull().default("normal"),

    assignedTo: uuid("assigned_to").references(() => usersTable.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    index("requests_municipality_idx").on(t.municipalityId),
    index("requests_bairro_idx").on(t.bairroId),
    index("requests_status_idx").on(t.status),
    index("requests_created_idx").on(t.createdAt),
  ],
);

export type CitizenRequest = typeof citizenRequestsTable.$inferSelect;
export type InsertCitizenRequest = typeof citizenRequestsTable.$inferInsert;
