"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { multisigConfigs } from "@/db/schema";

export interface MultisigConfigData {
	id: string;
	accountId: string;
	guardAddress: string;
	owners: string[];
	tiersJson: Array<{ maxValue: string; requiredConfirmations: number }>;
	defaultConfirmations: number;
	allowlistEnabled: boolean;
}

/**
 * Get multisig config for an account.
 * Returns null for EOA accounts.
 */
export async function getMultisigConfig(
	accountId: string,
): Promise<MultisigConfigData | null> {
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
	};
}
