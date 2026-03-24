import pg from "pg";

const TEST_DB_URL =
	process.env.TEST_DATABASE_URL || "postgresql://postgres:testpass@localhost:5432/goldhord_test";

/**
 * Verify an account exists in the test database by name.
 */
export async function verifyAccountExists(
	name: string,
	treasuryId: string,
): Promise<{ exists: boolean; id?: string; walletType?: string; walletAddress?: string }> {
	const client = new pg.Client(TEST_DB_URL);
	await client.connect();
	try {
		const result = await client.query(
			"SELECT id, wallet_type, wallet_address FROM accounts WHERE name = $1 AND treasury_id = $2",
			[name, treasuryId],
		);
		if (result.rows.length === 0) return { exists: false };
		return {
			exists: true,
			id: result.rows[0].id,
			walletType: result.rows[0].wallet_type,
			walletAddress: result.rows[0].wallet_address,
		};
	} finally {
		await client.end();
	}
}

/**
 * Verify an agent wallet exists in the test database by label.
 */
export async function verifyAgentExists(
	label: string,
	treasuryId: string,
): Promise<{ exists: boolean; id?: string; status?: string }> {
	const client = new pg.Client(TEST_DB_URL);
	await client.connect();
	try {
		const result = await client.query(
			`SELECT aw.id, aw.status FROM agent_wallets aw
			 JOIN accounts a ON aw.account_id = a.id
			 WHERE aw.label = $1 AND a.treasury_id = $2`,
			[label, treasuryId],
		);
		if (result.rows.length === 0) return { exists: false };
		return { exists: true, id: result.rows[0].id, status: result.rows[0].status };
	} finally {
		await client.end();
	}
}

/**
 * Clean up a test account by name.
 */
export async function cleanupTestAccount(name: string, treasuryId: string): Promise<void> {
	const client = new pg.Client(TEST_DB_URL);
	await client.connect();
	try {
		// Delete agent wallets first (FK cascade should handle, but be explicit)
		await client.query(
			`DELETE FROM agent_wallets WHERE account_id IN (
				SELECT id FROM accounts WHERE name = $1 AND treasury_id = $2
			)`,
			[name, treasuryId],
		);
		await client.query("DELETE FROM accounts WHERE name = $1 AND treasury_id = $2", [
			name,
			treasuryId,
		]);
	} finally {
		await client.end();
	}
}

/**
 * Clean up a test agent wallet by label.
 */
export async function cleanupTestAgent(label: string, treasuryId: string): Promise<void> {
	const client = new pg.Client(TEST_DB_URL);
	await client.connect();
	try {
		await client.query(
			`DELETE FROM agent_wallets WHERE label = $1 AND account_id IN (
				SELECT id FROM accounts WHERE treasury_id = $2
			)`,
			[label, treasuryId],
		);
		// Also delete the parent account (agent wallets create an accounts row)
		await client.query(
			`DELETE FROM accounts WHERE wallet_type = 'guardian' AND name = $1 AND treasury_id = $2`,
			[label, treasuryId],
		);
	} finally {
		await client.end();
	}
}
