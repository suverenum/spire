"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, agentWallets } from "@/db/schema";
import { getSession } from "@/lib/session";

export interface AgentWalletData {
	id: string;
	accountId: string;
	label: string;
	guardianAddress: string;
	agentKeyAddress: string;
	spendingCap: string;
	dailyLimit: string;
	maxPerTx: string;
	allowedVendors: string[];
	status: string;
	tokenSymbol: string;
	tokenAddress: string;
	deployedAt: string;
}

/**
 * Get all agent wallets for the current treasury.
 * Uses a single JOIN query instead of N+1 individual lookups.
 */
export async function getAgentWallets(): Promise<AgentWalletData[]> {
	const session = await getSession();
	if (!session) return [];

	const rows = await db
		.select({
			id: agentWallets.id,
			accountId: agentWallets.accountId,
			label: agentWallets.label,
			guardianAddress: agentWallets.guardianAddress,
			agentKeyAddress: agentWallets.agentKeyAddress,
			spendingCap: agentWallets.spendingCap,
			dailyLimit: agentWallets.dailyLimit,
			maxPerTx: agentWallets.maxPerTx,
			allowedVendors: agentWallets.allowedVendors,
			status: agentWallets.status,
			deployedAt: agentWallets.deployedAt,
			tokenSymbol: accounts.tokenSymbol,
			tokenAddress: accounts.tokenAddress,
		})
		.from(agentWallets)
		.innerJoin(accounts, eq(agentWallets.accountId, accounts.id))
		.where(eq(accounts.treasuryId, session.treasuryId));

	return rows.map((row) => ({
		id: row.id,
		accountId: row.accountId,
		label: row.label,
		guardianAddress: row.guardianAddress,
		agentKeyAddress: row.agentKeyAddress,
		spendingCap: row.spendingCap.toString(),
		dailyLimit: row.dailyLimit.toString(),
		maxPerTx: row.maxPerTx.toString(),
		allowedVendors: row.allowedVendors,
		status: row.status,
		tokenSymbol: row.tokenSymbol,
		tokenAddress: row.tokenAddress,
		deployedAt: row.deployedAt.toISOString(),
	}));
}
