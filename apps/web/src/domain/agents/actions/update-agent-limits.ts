"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts, agentWallets } from "@/db/schema";
import { getSession } from "@/lib/session";

/**
 * Update agent wallet limits in DB after on-chain Guardian.updateLimits() succeeds.
 */
export async function updateAgentLimits({
	walletId,
	maxPerTx,
	dailyLimit,
}: {
	walletId: string;
	maxPerTx: string;
	dailyLimit: string;
}): Promise<{ error?: string }> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };

	const wallet = await db.query.agentWallets.findFirst({
		where: eq(agentWallets.id, walletId),
	});
	if (!wallet) return { error: "Agent wallet not found" };

	const account = await db.query.accounts.findFirst({
		where: eq(accounts.id, wallet.accountId),
	});
	if (!account || account.treasuryId !== session.treasuryId) {
		return { error: "Not authorized" };
	}

	await db
		.update(agentWallets)
		.set({
			maxPerTx: BigInt(maxPerTx),
			dailyLimit: BigInt(dailyLimit),
		})
		.where(eq(agentWallets.id, walletId));

	revalidatePath("/agents");
	return {};
}
