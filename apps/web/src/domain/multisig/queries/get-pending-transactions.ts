"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { accounts, multisigConfirmations, multisigTransactions } from "@/db/schema";
import { getSession } from "@/lib/session";

export interface PendingTransactionData {
	id: string;
	accountId: string;
	onChainTxId: string;
	to: string;
	value: string;
	data: string;
	requiredConfirmations: number;
	currentConfirmations: number;
	executed: boolean;
	executedAt: Date | null;
	createdAt: Date;
	confirmations: Array<{
		signerAddress: string;
		confirmedAt: Date;
	}>;
}

/**
 * Get pending (non-executed) multisig transactions for an account.
 * Fetches confirmations in a single batched query (no N+1).
 */
export async function getPendingTransactions(accountId: string): Promise<PendingTransactionData[]> {
	const session = await getSession();
	if (!session) return [];

	// Verify account belongs to the session's treasury
	const account = await db.query.accounts.findFirst({
		where: and(eq(accounts.id, accountId), eq(accounts.treasuryId, session.treasuryId)),
	});
	if (!account) return [];

	const txs = await db.query.multisigTransactions.findMany({
		where: and(
			eq(multisigTransactions.accountId, accountId),
			eq(multisigTransactions.executed, false),
		),
		orderBy: desc(multisigTransactions.createdAt),
	});

	if (txs.length === 0) return [];

	// Batch-fetch all confirmations for all pending transactions in one query
	const txIds = txs.map((tx) => tx.id);
	const allConfs = await db.query.multisigConfirmations.findMany({
		where: inArray(multisigConfirmations.multisigTransactionId, txIds),
	});

	// Group confirmations by transaction ID
	const confsByTxId = new Map<string, Array<{ signerAddress: string; confirmedAt: Date }>>();
	for (const c of allConfs) {
		const list = confsByTxId.get(c.multisigTransactionId) ?? [];
		list.push({ signerAddress: c.signerAddress, confirmedAt: c.confirmedAt });
		confsByTxId.set(c.multisigTransactionId, list);
	}

	return txs.map((tx) => ({
		id: tx.id,
		accountId: tx.accountId,
		onChainTxId: tx.onChainTxId.toString(),
		to: tx.to,
		value: tx.value,
		data: tx.data,
		requiredConfirmations: tx.requiredConfirmations,
		currentConfirmations: tx.currentConfirmations,
		executed: tx.executed,
		executedAt: tx.executedAt,
		createdAt: tx.createdAt,
		confirmations: confsByTxId.get(tx.id) ?? [],
	}));
}
