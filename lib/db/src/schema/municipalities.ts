import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const municipalitiesTable = pgTable("municipalities", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  province: text("province").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Municipality = typeof municipalitiesTable.$inferSelect;
export type InsertMunicipality = typeof municipalitiesTable.$inferInsert;
