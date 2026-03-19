"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, multisigConfirmations, multisigTransactions } from "@/db/schema";
import { getSession } from "@/lib/session";

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
	const session = await getSession();
	if (!session) throw new Error("Not authenticated");

	// Verify account belongs to the session's treasury
	const account = await db.query.accounts.findFirst({
		where: and(eq(accounts.id, accountId), eq(accounts.treasuryId, session.treasuryId)),
	});
	if (!account) throw new Error("Account not found");

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
				executedAt: executed && !existing.executed ? new Date() : existing.executedAt,
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
	const session = await getSession();
	if (!session) throw new Error("Not authenticated");

	// Verify the transaction belongs to an account in the session's treasury
	const tx = await db.query.multisigTransactions.findFirst({
		where: eq(multisigTransactions.id, multisigTransactionId),
	});
	if (!tx) throw new Error("Transaction not found");

	const account = await db.query.accounts.findFirst({
		where: and(eq(accounts.id, tx.accountId), eq(accounts.treasuryId, session.treasuryId)),
	});
	if (!account) throw new Error("Account not found");

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
