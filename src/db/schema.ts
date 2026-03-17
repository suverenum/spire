import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const treasuries = pgTable("treasuries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  tempoAddress: text("tempo_address").notNull().unique(),
  // DB-level singleton: only one row can have singleton_guard=true.
  // Prevents concurrent treasury creation race condition.
  singletonGuard: boolean("singleton_guard").notNull().default(true).unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
