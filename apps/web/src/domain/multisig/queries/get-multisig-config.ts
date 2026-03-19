"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, multisigConfigs } from "@/db/schema";
import { getSession } from "@/lib/session";

export interface MultisigConfigData {
	id: string;
	accountId: string;
	guardAddress: string;
	owners: string[];
	tiersJson: Array<{ maxValue: string; requiredConfirmations: number }>;
	defaultConfirmations: number;
	allowlistEnabled: boolean;
	agentAddress: string | null;
}

/**
 * Get multisig config for an account.
 * Returns null for EOA accounts.
 */
export async function getMultisigConfig(accountId: string): Promise<MultisigConfigData | null> {
	const session = await getSession();
	if (!session) return null;

	// Verify account belongs to the session's treasury
	const account = await db.query.accounts.findFirst({
		where: and(eq(accounts.id, accountId), eq(accounts.treasuryId, session.treasuryId)),
	});
	if (!account) return null;

	const config = await db.query.multisigConfigs.findFirst({
		where: eq(multisigConfigs.accountId, accountId),
	});

	if (!config) return null;

	return {
		id: config.id,
		accountId: config.accountId,
		guardAddress: config.guardAddress,
		owners: config.owners as string[],
		tiersJson: config.tiersJson as Array<{
			maxValue: string;
			requiredConfirmations: number;
		}>,
		defaultConfirmations: config.defaultConfirmations,
		allowlistEnabled: config.allowlistEnabled,
		agentAddress: config.agentAddress,
	};
}
