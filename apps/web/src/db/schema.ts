import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const treasuries = pgTable("treasuries", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	tempoAddress: text("tempo_address").notNull().unique(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
