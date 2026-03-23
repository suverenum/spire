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

	// When explicit tokenSymbol is provided, resolve from SUPPORTED_TOKENS (multi-asset transfer).
	// When omitted, fall back to fromAccount's primary token but enforce same-token guard
	// to prevent silently transferring the wrong asset to a different-token account.
	let resolvedSymbol: string;
	let resolvedAddress: string;
	if (tokenSymbol) {
		const token = SUPPORTED_TOKENS[tokenSymbol];
		if (!token) {
			return { error: `Unsupported token: ${tokenSymbol}` };
		}
		resolvedSymbol = tokenSymbol;
		resolvedAddress = token.address;
	} else {
		if (fromAccount.tokenSymbol !== toAccount.tokenSymbol) {
			return { error: "Accounts hold different tokens — specify tokenSymbol to transfer" };
		}
		resolvedSymbol = fromAccount.tokenSymbol;
		resolvedAddress = fromAccount.tokenAddress;
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
