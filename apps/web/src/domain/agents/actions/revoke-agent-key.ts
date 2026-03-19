"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts, agentWallets } from "@/db/schema";
import { getSession } from "@/lib/session";

/**
 * Revoke an agent wallet by setting status to 'revoked'.
 * On-chain kill switch (withdraw all funds) should be done separately via the UI.
 */
export async function revokeAgentKey(walletId: string): Promise<{ error?: string }> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };

	const wallet = await db.query.agentWallets.findFirst({
		where: eq(agentWallets.id, walletId),
	});
	if (!wallet) return { error: "Agent wallet not found" };

	// Verify ownership
	const account = await db.query.accounts.findFirst({
		where: eq(accounts.id, wallet.accountId),
	});
	if (!account || account.treasuryId !== session.treasuryId) {
		return { error: "Not authorized" };
	}

	if (wallet.status === "revoked") return { error: "Already revoked" };

	await db.update(agentWallets).set({ status: "revoked" }).where(eq(agentWallets.id, walletId));

	revalidatePath("/agents");
	revalidatePath("/accounts");

	return {};
}
