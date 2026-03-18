"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { multisigConfirmations, multisigTransactions } from "@/db/schema";

/**
 * Upsert a multisig transaction record from on-chain state.
 * Uses (accountId, onChainTxId) as the unique key.
 */
export async function upsertMultisigTransaction({
	accountId,
	onChainTxId,
	to,
	value,
	data,
	requiredConfirmations,
	currentConfirmations,
	executed,
}: {
	accountId: string;
	onChainTxId: bigint;
	to: string;
	value: string;
	data: string;
	requiredConfirmations: number;
	currentConfirmations: number;
	executed: boolean;
}): Promise<{ id: string }> {
	const existing = await db.query.multisigTransactions.findFirst({
		where: and(
			eq(multisigTransactions.accountId, accountId),
			eq(multisigTransactions.onChainTxId, onChainTxId),
		),
	});

	if (existing) {
		await db
			.update(multisigTransactions)
			.set({
				currentConfirmations,
				executed,
				executedAt:
					executed && !existing.executed ? new Date() : existing.executedAt,
			})
			.where(eq(multisigTransactions.id, existing.id));
		return { id: existing.id };
	}

	const [inserted] = await db
		.insert(multisigTransactions)
		.values({
			accountId,
			onChainTxId,
			to: to.toLowerCase(),
			value,
			data,
			requiredConfirmations,
			currentConfirmations,
			executed,
		})
		.returning({ id: multisigTransactions.id });

	return { id: inserted.id };
}

/**
 * Add a confirmation record. Idempotent — ignores duplicate (txId, signer).
 */
export async function addMultisigConfirmation({
	multisigTransactionId,
	signerAddress,
}: {
	multisigTransactionId: string;
	signerAddress: string;
}): Promise<void> {
	try {
		await db.insert(multisigConfirmations).values({
			multisigTransactionId,
			signerAddress: signerAddress.toLowerCase(),
		});
	} catch (err: unknown) {
		const pgCode =
			err != null && typeof err === "object" && "code" in err
				? (err as { code: unknown }).code
				: undefined;
		// Ignore unique constraint violation (duplicate confirmation)
		if (pgCode === "23505") return;
		throw err;
	}
}
