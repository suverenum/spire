import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	index,
	integer,
	jsonb,
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
		walletType: text("wallet_type").notNull().default("eoa"), // "eoa" | "multisig" | "guardian"
		isDefault: boolean("is_default").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("accounts_treasury_name_idx").on(table.treasuryId, table.name),
		uniqueIndex("accounts_wallet_address_idx").on(table.walletAddress),
		uniqueIndex("accounts_default_token_idx")
			.on(table.treasuryId, table.tokenSymbol)
			.where(sql`${table.isDefault} = true`),
	],
);

// ─── Agent Wallet Tables ────────────────────────────────────────────

export const agentWallets = pgTable("agent_wallets", {
	id: uuid("id").defaultRandom().primaryKey(),
	accountId: uuid("account_id")
		.references(() => accounts.id, { onDelete: "cascade" })
		.notNull()
		.unique(),
	label: text("label").notNull(),
	guardianAddress: text("guardian_address").notNull(),
	agentKeyAddress: text("agent_key_address").notNull(),
	encryptedKey: text("encrypted_key").notNull(),
	spendingCap: bigint("spending_cap", { mode: "bigint" }).notNull(),
	dailyLimit: bigint("daily_limit", { mode: "bigint" }).notNull(),
	maxPerTx: bigint("max_per_tx", { mode: "bigint" }).notNull(),
	allowedVendors: jsonb("allowed_vendors").notNull().$type<string[]>(),
	status: text("status").notNull().default("active"), // "active" | "revoked"
	keyExportedAt: timestamp("key_exported_at"), // null = never exported, set on first export
	deployedAt: timestamp("deployed_at").defaultNow().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Multisig Tables ────────────────────────────────────────────────

export const multisigConfigs = pgTable("multisig_configs", {
	id: uuid("id").defaultRandom().primaryKey(),
	accountId: uuid("account_id")
		.references(() => accounts.id, { onDelete: "cascade" })
		.notNull()
		.unique(),
	guardAddress: text("guard_address").notNull(),
	owners: jsonb("owners").notNull().$type<string[]>(),
	tiersJson: jsonb("tiers_json")
		.notNull()
		.$type<Array<{ maxValue: string; requiredConfirmations: number }>>(),
	defaultConfirmations: integer("default_confirmations").notNull(),
	allowlistEnabled: boolean("allowlist_enabled").notNull().default(false),
	agentPrivateKey: text("agent_private_key"),
	agentAddress: text("agent_address"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const multisigTransactions = pgTable(
	"multisig_transactions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		accountId: uuid("account_id")
			.references(() => accounts.id, { onDelete: "cascade" })
			.notNull(),
		onChainTxId: bigint("on_chain_tx_id", { mode: "bigint" }).notNull(),
		to: text("to").notNull(),
		value: text("value").notNull(), // uint256 as string
		data: text("data").notNull(), // hex string
		requiredConfirmations: integer("required_confirmations").notNull(),
		currentConfirmations: integer("current_confirmations").notNull().default(0),
		executed: boolean("executed").notNull().default(false),
		executedAt: timestamp("executed_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("multisig_tx_account_chain_id").on(table.accountId, table.onChainTxId),
		index("multisig_tx_pending").on(table.accountId, table.executed),
	],
);

export const multisigConfirmations = pgTable(
	"multisig_confirmations",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		multisigTransactionId: uuid("multisig_transaction_id")
			.references(() => multisigTransactions.id, { onDelete: "cascade" })
			.notNull(),
		signerAddress: text("signer_address").notNull(),
		confirmedAt: timestamp("confirmed_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("multisig_confirm_unique").on(table.multisigTransactionId, table.signerAddress),
	],
);
