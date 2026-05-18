import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { channelEnum } from "./enums";
import { municipalitiesTable } from "./municipalities";
import { citizenRequestsTable } from "./citizen_requests";

export const conversationsTable = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channel: channelEnum("channel").notNull(),
    externalId: text("external_id").notNull(),
    municipalityId: uuid("municipality_id").references(
      () => municipalitiesTable.id,
      { onDelete: "set null" },
    ),
    state: text("state").notNull().default("idle"),
    context: jsonb("context").$type<ConversationContext>().notNull().default(
      {} as ConversationContext,
    ),
    lastRequestId: uuid("last_request_id").references(
      () => citizenRequestsTable.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("conversations_channel_external_idx").on(
      t.channel,
      t.externalId,
    ),
  ],
);

export type ConversationContext = {
  description?: string;
  bairroId?: string;
  bairroName?: string;
  type?: string;
  contactName?: string;
  isAnonymous?: boolean;
};

export type Conversation = typeof conversationsTable.$inferSelect;
export type InsertConversation = typeof conversationsTable.$inferInsert;

export const incomingMessagesTable = pgTable(
  "incoming_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channel: channelEnum("channel").notNull(),
    externalId: text("external_id").notNull(),
    providerMessageId: text("provider_message_id").notNull(),
    direction: text("direction").notNull(), // 'inbound' | 'outbound'
    text: text("text"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("incoming_messages_provider_idx").on(
      t.channel,
      t.providerMessageId,
    ),
    index("incoming_messages_external_idx").on(t.channel, t.externalId),
    index("incoming_messages_created_idx").on(t.createdAt),
  ],
);

export type IncomingMessage = typeof incomingMessagesTable.$inferSelect;
export type InsertIncomingMessage = typeof incomingMessagesTable.$inferInsert;
