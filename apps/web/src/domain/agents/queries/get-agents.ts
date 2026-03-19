"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
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
 */
export async function getAgentWallets(): Promise<AgentWalletData[]> {
	const session = await getSession();
	if (!session) return [];

	const wallets = await db.query.agentWallets.findMany();

	// Filter to only wallets belonging to current treasury
	const results: AgentWalletData[] = [];
	for (const wallet of wallets) {
		const account = await db.query.accounts.findFirst({
			where: eq(accounts.id, wallet.accountId),
		});
		if (account && account.treasuryId === session.treasuryId) {
			results.push({
				id: wallet.id,
				accountId: wallet.accountId,
				label: wallet.label,
				guardianAddress: wallet.guardianAddress,
				agentKeyAddress: wallet.agentKeyAddress,
				spendingCap: wallet.spendingCap.toString(),
				dailyLimit: wallet.dailyLimit.toString(),
				maxPerTx: wallet.maxPerTx.toString(),
				allowedVendors: wallet.allowedVendors,
				status: wallet.status,
				tokenSymbol: account.tokenSymbol,
				tokenAddress: account.tokenAddress,
				deployedAt: wallet.deployedAt.toISOString(),
			});
		}
	}

	return results;
}
