import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { municipalitiesTable } from "./municipalities";
import { userRoleEnum } from "./enums";

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    role: userRoleEnum("role").notNull().default("citizen"),
    municipalityId: uuid("municipality_id").references(
      () => municipalitiesTable.id,
      { onDelete: "set null" },
    ),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("users_municipality_idx").on(t.municipalityId)],
);

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
