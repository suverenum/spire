"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, agentWallets } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { getSession } from "@/lib/session";

/**
 * Reveal an agent's private key by decrypting it from the DB.
 * Requires an active session (passkey re-auth at UI level).
 */
export async function revealAgentKey(
	walletId: string,
): Promise<{ error?: string; privateKey?: string }> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };

	const wallet = await db.query.agentWallets.findFirst({
		where: eq(agentWallets.id, walletId),
	});
	if (!wallet) return { error: "Agent wallet not found" };

	// Verify the wallet belongs to the current treasury
	const account = await db.query.accounts.findFirst({
		where: eq(accounts.id, wallet.accountId),
	});
	if (!account || account.treasuryId !== session.treasuryId) {
		return { error: "Not authorized" };
	}

	try {
		const privateKey = decrypt(wallet.encryptedKey);
		return { privateKey };
	} catch {
		return { error: "Failed to decrypt key" };
	}
}
