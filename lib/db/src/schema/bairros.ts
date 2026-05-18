import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { municipalitiesTable } from "./municipalities";
import { estratoEnum } from "./enums";

export const bairrosTable = pgTable(
  "bairros",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    municipalityId: uuid("municipality_id")
      .notNull()
      .references(() => municipalitiesTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    estrato: estratoEnum("estrato").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("bairros_municipality_idx").on(t.municipalityId)],
);

export type Bairro = typeof bairrosTable.$inferSelect;
export type InsertBairro = typeof bairrosTable.$inferInsert;
