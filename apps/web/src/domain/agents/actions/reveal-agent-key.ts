"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accounts, agentWallets } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { getSession } from "@/lib/session";

/**
 * Reveal an agent's private key by decrypting it from the DB.
 * Requires an active session (passkey re-auth at UI level).
 * One-time export: key can only be revealed once (atomic CAS on keyExportedAt).
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

	// Enforce one-time export: if key was already exported, deny
	if (wallet.keyExportedAt) {
		return { error: "Key already exported. For security, agent keys can only be revealed once." };
	}

	try {
		const privateKey = decrypt(wallet.encryptedKey);

		// Atomic CAS: only mark as exported if keyExportedAt is still NULL.
		// This prevents race conditions where two concurrent requests both pass
		// the check above and both reveal the key.
		const result = await db
			.update(agentWallets)
			.set({ keyExportedAt: new Date() })
			.where(and(eq(agentWallets.id, walletId), isNull(agentWallets.keyExportedAt)))
			.returning({ id: agentWallets.id });

		// If no rows updated, another request already exported the key
		if (result.length === 0) {
			return { error: "Key already exported. For security, agent keys can only be revealed once." };
		}

		return { privateKey };
	} catch {
		return { error: "Failed to decrypt key" };
	}
}
