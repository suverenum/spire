"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function prepareInternalTransfer({
	fromAccountId,
	toAccountId,
}: {
	fromAccountId: string;
	toAccountId: string;
}): Promise<{
	error?: string;
	fromAccount?: {
		walletAddress: string;
		tokenAddress: string;
		tokenSymbol: string;
	};
	toAccount?: {
		walletAddress: string;
		tokenAddress: string;
		tokenSymbol: string;
	};
}> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };

	if (fromAccountId === toAccountId) {
		return { error: "Cannot transfer to the same account" };
	}

	const [fromAccount, toAccount] = await Promise.all([
		db.query.accounts.findFirst({
			where: and(eq(accounts.id, fromAccountId), eq(accounts.treasuryId, session.treasuryId)),
		}),
		db.query.accounts.findFirst({
			where: and(eq(accounts.id, toAccountId), eq(accounts.treasuryId, session.treasuryId)),
		}),
	]);

	if (!fromAccount || !toAccount) {
		return { error: "One or both accounts not found" };
	}

	if (fromAccount.tokenSymbol !== toAccount.tokenSymbol) {
		return { error: "Accounts must hold the same token for internal transfer" };
	}

	return {
		fromAccount: {
			walletAddress: fromAccount.walletAddress,
			tokenAddress: fromAccount.tokenAddress,
			tokenSymbol: fromAccount.tokenSymbol,
		},
		toAccount: {
			walletAddress: toAccount.walletAddress,
			tokenAddress: toAccount.tokenAddress,
			tokenSymbol: toAccount.tokenSymbol,
		},
	};
}
