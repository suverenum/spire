import {
	boolean,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const treasuries = pgTable("treasuries", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	tempoAddress: text("tempo_address").notNull().unique(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable(
	"accounts",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		treasuryId: uuid("treasury_id")
			.references(() => treasuries.id)
			.notNull(),
		name: text("name").notNull(),
		tokenSymbol: text("token_symbol").notNull(),
		tokenAddress: text("token_address").notNull(),
		walletAddress: text("wallet_address").notNull(),
		isDefault: boolean("is_default").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("accounts_treasury_name_idx").on(table.treasuryId, table.name),
		uniqueIndex("accounts_wallet_address_idx").on(table.walletAddress),
	],
);
