import pg from "pg";

const TEST_DB_URL =
	process.env.TEST_DATABASE_URL || "postgresql://postgres:testpass@localhost:5432/goldhord_test";

// Known test data IDs (deterministic for test assertions)
export const TEST_ORG_ID = "00000000-0000-0000-0000-000000000099";
export const TEST_ORG_NAME = "E2E Test Organization";
export const TEST_ENTITY_ID = "00000000-0000-0000-0000-000000000098";
export const TEST_TREASURY_ID = "00000000-0000-0000-0000-000000000001";
export const TEST_TEMPO_ADDRESS = "0x9F3D0d56Aae3bA5a77A57901D356C847CC5157c0";
export const TEST_TREASURY_NAME = "E2E Test Treasury";

export const TEST_EOA_ACCOUNT_ID = "00000000-0000-0000-0000-000000000010";
export const TEST_EOA_ACCOUNT2_ID = "00000000-0000-0000-0000-000000000011";
export const TEST_EOA_WALLET = "0x1111111111111111111111111111111111111111";
export const TEST_EOA_WALLET2 = "0x4444444444444444444444444444444444444444";

export const TEST_MULTISIG_ACCOUNT_ID = "00000000-0000-0000-0000-000000000020";
export const TEST_MULTISIG_WALLET = "0x2222222222222222222222222222222222222222";
export const TEST_GUARD_ADDRESS = "0x3333333333333333333333333333333333333333";

export const TEST_SIGNER_1 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
export const TEST_SIGNER_2 = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

// Agent wallet test data
export const TEST_AGENT_ACCOUNT_ID = "00000000-0000-0000-0000-000000000030";
export const TEST_AGENT_WALLET_ID = "00000000-0000-0000-0000-000000000031";
export const TEST_AGENT_GUARDIAN = "0x5555555555555555555555555555555555555555";
export const TEST_AGENT_KEY_ADDRESS = "0x6666666666666666666666666666666666666666";
export const TEST_AGENT_REVOKED_ACCOUNT_ID = "00000000-0000-0000-0000-000000000040";
export const TEST_AGENT_REVOKED_WALLET_ID = "00000000-0000-0000-0000-000000000041";
export const TEST_AGENT_REVOKED_GUARDIAN = "0x7777777777777777777777777777777777777777";

/**
 * Seed the test database with treasury, EOA account, and multisig account.
 */
export async function seedTestData(): Promise<void> {
	const client = new pg.Client(TEST_DB_URL);
	await client.connect();

	try {
		// Ensure schema matches (columns may not exist if migrations haven't run)
		await client.query(
			"ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS key_exported_at TIMESTAMP",
		);
		await client.query(
			"CREATE TABLE IF NOT EXISTS organizations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, domain TEXT, settings JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMP DEFAULT now() NOT NULL)",
		);
		await client.query(
			"CREATE TABLE IF NOT EXISTS entities (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), name TEXT NOT NULL, jurisdiction TEXT, entity_type TEXT, created_at TIMESTAMP DEFAULT now() NOT NULL)",
		);
		await client.query(
			"ALTER TABLE treasuries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)",
		);
		await client.query(
			"ALTER TABLE treasuries ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id)",
		);
		await client.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_category TEXT");
		await client.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS encrypted_key TEXT");

		// Clean slate
		await client.query("DELETE FROM agent_wallets");
		await client.query("DELETE FROM multisig_confirmations");
		await client.query("DELETE FROM multisig_transactions");
		await client.query("DELETE FROM multisig_configs");
		await client.query("DELETE FROM accounts");
		await client.query("DELETE FROM treasuries");
		await client.query("DELETE FROM entities");
		await client.query("DELETE FROM organizations");

		// Insert organization + entity
		await client.query(`INSERT INTO organizations (id, name) VALUES ($1, $2)`, [
			TEST_ORG_ID,
			TEST_ORG_NAME,
		]);
		await client.query(`INSERT INTO entities (id, organization_id, name) VALUES ($1, $2, $3)`, [
			TEST_ENTITY_ID,
			TEST_ORG_ID,
			"Default",
		]);

		// Insert treasury (linked to org + entity)
		await client.query(
			`INSERT INTO treasuries (id, name, tempo_address, organization_id, entity_id) VALUES ($1, $2, $3, $4, $5)`,
			[TEST_TREASURY_ID, TEST_TREASURY_NAME, TEST_TEMPO_ADDRESS, TEST_ORG_ID, TEST_ENTITY_ID],
		);

		// Insert EOA account
		await client.query(
			`INSERT INTO accounts (id, treasury_id, name, token_symbol, token_address, wallet_address, wallet_type, is_default)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[
				TEST_EOA_ACCOUNT_ID,
				TEST_TREASURY_ID,
				"Operations AlphaUSD",
				"AlphaUSD",
				"0x20c0000000000000000000000000000000000001",
				TEST_EOA_WALLET,
				"eoa",
				true,
			],
		);

		// Insert second default EOA account (BetaUSD)
		await client.query(
			`INSERT INTO accounts (id, treasury_id, name, token_symbol, token_address, wallet_address, wallet_type, is_default)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[
				TEST_EOA_ACCOUNT2_ID,
				TEST_TREASURY_ID,
				"Main BetaUSD",
				"BetaUSD",
				"0x20c0000000000000000000000000000000000002",
				TEST_EOA_WALLET2,
				"eoa",
				true,
			],
		);

		// Insert multisig account
		await client.query(
			`INSERT INTO accounts (id, treasury_id, name, token_symbol, token_address, wallet_address, wallet_type, is_default)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[
				TEST_MULTISIG_ACCOUNT_ID,
				TEST_TREASURY_ID,
				"Treasury Multisig",
				"AlphaUSD",
				"0x20c0000000000000000000000000000000000001",
				TEST_MULTISIG_WALLET,
				"multisig",
				false,
			],
		);

		// Insert multisig config
		await client.query(
			`INSERT INTO multisig_configs (account_id, guard_address, owners, tiers_json, default_confirmations, allowlist_enabled)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			[
				TEST_MULTISIG_ACCOUNT_ID,
				TEST_GUARD_ADDRESS,
				JSON.stringify([TEST_TEMPO_ADDRESS, TEST_SIGNER_1, TEST_SIGNER_2]),
				JSON.stringify([{ maxValue: "10000000000", requiredConfirmations: 1 }]),
				3,
				true,
			],
		);

		// Insert a pending multisig transaction
		await client.query(
			`INSERT INTO multisig_transactions (account_id, on_chain_tx_id, "to", value, data, required_confirmations, current_confirmations, executed)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[
				TEST_MULTISIG_ACCOUNT_ID,
				0,
				"0x20c0000000000000000000000000000000000001", // USDC token
				"0",
				"0xa9059cbb000000000000000000000000000000000000000000000000000000000000dead00000000000000000000000000000000000000000000000000000002540be400", // transfer(0xdead, 10000e6)
				3,
				1,
				false,
			],
		);

		// Insert a confirmation for the pending transaction
		const txResult = await client.query(
			`SELECT id FROM multisig_transactions WHERE account_id = $1 AND on_chain_tx_id = 0`,
			[TEST_MULTISIG_ACCOUNT_ID],
		);
		if (txResult.rows[0]) {
			await client.query(
				`INSERT INTO multisig_confirmations (multisig_transaction_id, signer_address)
				 VALUES ($1, $2)`,
				[txResult.rows[0].id, TEST_TEMPO_ADDRESS],
			);
		}
		// Insert active agent wallet account
		await client.query(
			`INSERT INTO accounts (id, treasury_id, name, token_symbol, token_address, wallet_address, wallet_type, is_default)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[
				TEST_AGENT_ACCOUNT_ID,
				TEST_TREASURY_ID,
				"Marketing Bot",
				"AlphaUSD",
				"0x20c0000000000000000000000000000000000001",
				TEST_AGENT_GUARDIAN,
				"guardian",
				false,
			],
		);

		await client.query(
			`INSERT INTO agent_wallets (id, account_id, label, guardian_address, agent_key_address, encrypted_key, spending_cap, daily_limit, max_per_tx, allowed_vendors, status)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
			[
				TEST_AGENT_WALLET_ID,
				TEST_AGENT_ACCOUNT_ID,
				"Marketing Bot",
				TEST_AGENT_GUARDIAN,
				TEST_AGENT_KEY_ADDRESS,
				"dGVzdC1lbmNyeXB0ZWQta2V5", // base64 placeholder
				50000000, // 50 USDC
				10000000, // 10 USDC daily
				2000000, // 2 USDC per-tx
				JSON.stringify([
					"0x0000000000000000000000000000000000000001",
					"0x0000000000000000000000000000000000000003",
				]),
				"active",
			],
		);

		// Insert revoked agent wallet account
		await client.query(
			`INSERT INTO accounts (id, treasury_id, name, token_symbol, token_address, wallet_address, wallet_type, is_default)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[
				TEST_AGENT_REVOKED_ACCOUNT_ID,
				TEST_TREASURY_ID,
				"Deprecated Bot",
				"AlphaUSD",
				"0x20c0000000000000000000000000000000000001",
				TEST_AGENT_REVOKED_GUARDIAN,
				"guardian",
				false,
			],
		);

		await client.query(
			`INSERT INTO agent_wallets (id, account_id, label, guardian_address, agent_key_address, encrypted_key, spending_cap, daily_limit, max_per_tx, allowed_vendors, status)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
			[
				TEST_AGENT_REVOKED_WALLET_ID,
				TEST_AGENT_REVOKED_ACCOUNT_ID,
				"Deprecated Bot",
				TEST_AGENT_REVOKED_GUARDIAN,
				"0x8888888888888888888888888888888888888888",
				"dGVzdC1lbmNyeXB0ZWQta2V5LTI=",
				20000000,
				5000000,
				1000000,
				JSON.stringify(["0x0000000000000000000000000000000000000002"]),
				"revoked",
			],
		);
	} finally {
		await client.end();
	}
}

/**
 * Clean up test data.
 */
export async function cleanTestData(): Promise<void> {
	const client = new pg.Client(TEST_DB_URL);
	await client.connect();
	try {
		await client.query("DELETE FROM agent_wallets");
		await client.query("DELETE FROM multisig_confirmations");
		await client.query("DELETE FROM multisig_transactions");
		await client.query("DELETE FROM multisig_configs");
		await client.query("DELETE FROM accounts");
		await client.query("DELETE FROM treasuries");
		await client.query("DELETE FROM entities");
		await client.query("DELETE FROM organizations");
	} finally {
		await client.end();
	}
}
