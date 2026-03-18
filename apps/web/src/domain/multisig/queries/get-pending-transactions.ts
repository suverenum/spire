"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { multisigConfirmations, multisigTransactions } from "@/db/schema";

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
 */
export async function getPendingTransactions(
	accountId: string,
): Promise<PendingTransactionData[]> {
	const txs = await db.query.multisigTransactions.findMany({
		where: and(
			eq(multisigTransactions.accountId, accountId),
			eq(multisigTransactions.executed, false),
		),
		orderBy: desc(multisigTransactions.createdAt),
	});

	// Fetch confirmations for each transaction
	const results: PendingTransactionData[] = [];
	for (const tx of txs) {
		const confs = await db.query.multisigConfirmations.findMany({
			where: eq(multisigConfirmations.multisigTransactionId, tx.id),
		});

		results.push({
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
			confirmations: confs.map((c) => ({
				signerAddress: c.signerAddress,
				confirmedAt: c.confirmedAt,
			})),
		});
	}

	return results;
}
