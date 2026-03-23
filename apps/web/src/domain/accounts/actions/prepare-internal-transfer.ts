"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { SUPPORTED_TOKENS } from "@/lib/constants";
import { getSession } from "@/lib/session";

export async function prepareInternalTransfer({
	fromAccountId,
	toAccountId,
	tokenSymbol,
}: {
	fromAccountId: string;
	toAccountId: string;
	tokenSymbol?: string;
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

	// Use explicit token if provided, otherwise fall back to fromAccount's primary token.
	// In the multi-asset model, accounts can hold any token — the user selects which to transfer.
	const resolvedSymbol = tokenSymbol ?? fromAccount.tokenSymbol;
	let resolvedAddress = fromAccount.tokenAddress;
	if (tokenSymbol) {
		const token = SUPPORTED_TOKENS[tokenSymbol];
		if (!token) {
			return { error: `Unsupported token: ${tokenSymbol}` };
		}
		resolvedAddress = token.address;
	}

	return {
		fromAccount: {
			walletAddress: fromAccount.walletAddress,
			tokenAddress: resolvedAddress,
			tokenSymbol: resolvedSymbol,
		},
		toAccount: {
			walletAddress: toAccount.walletAddress,
			tokenAddress: resolvedAddress,
			tokenSymbol: resolvedSymbol,
		},
	};
}
