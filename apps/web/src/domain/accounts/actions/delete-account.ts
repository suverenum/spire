"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { getSession } from "@/lib/session";
import { fetchBalances } from "@/lib/tempo/client";

interface DetectedTokenBalance {
	tokenAddress: string;
	tokenSymbol: string;
	amount: bigint;
}

type DeleteAccountPreparation =
	| { status: "blocked"; assignedBalance: bigint; tokenSymbol: string }
	| {
			status: "warn";
			unassignedBalances: DetectedTokenBalance[];
			partialBalanceCheck?: boolean;
	  }
	| { status: "ready" };

/**
 * Fetch on-chain balances for all detectable tokens on a wallet.
 * Uses the Tempo RPC client to query real balances.
 */
async function fetchDetectableTokenBalances(
	walletAddress: string,
): Promise<{ balances: DetectedTokenBalance[]; partial: boolean }> {
	const result = await fetchBalances(walletAddress as `0x${string}`);
	return {
		balances: result.balances.map((b) => ({
			tokenAddress: b.tokenAddress,
			tokenSymbol: b.token,
			amount: b.balance,
		})),
		partial: result.partial,
	};
}

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function prepareDeleteAccount(
	accountId: string,
): Promise<DeleteAccountPreparation> {
	if (!UUID_RE.test(accountId)) throw new Error("Invalid account ID");
	const session = await getSession();
	if (!session) throw new Error("Not authenticated");

	const account = await db.query.accounts.findFirst({
		where: and(
			eq(accounts.id, accountId),
			eq(accounts.treasuryId, session.treasuryId),
		),
	});

	if (!account) throw new Error("Account not found");
	if (account.isDefault) throw new Error("Cannot delete default account");

	const { balances, partial } = await fetchDetectableTokenBalances(
		account.walletAddress,
	);
	const assignedTokenEntry = balances.find(
		(balance) => balance.tokenAddress === account.tokenAddress,
	);

	// Fail safe: if we couldn't fetch the assigned token's balance, block deletion
	if (!assignedTokenEntry) {
		return {
			status: "blocked",
			assignedBalance: BigInt(0),
			tokenSymbol: account.tokenSymbol,
		};
	}

	const assignedBalance = assignedTokenEntry.amount;
	const unassignedBalances = balances.filter(
		(balance) =>
			balance.tokenAddress !== account.tokenAddress &&
			balance.amount > BigInt(0),
	);

	if (assignedBalance > BigInt(0)) {
		return {
			status: "blocked",
			assignedBalance,
			tokenSymbol: account.tokenSymbol,
		};
	}

	if (unassignedBalances.length > 0 || partial) {
		return {
			status: "warn",
			unassignedBalances,
			partialBalanceCheck: partial,
		};
	}

	return { status: "ready" };
}

export async function confirmDeleteAccount({
	accountId,
	acknowledgeUnassignedAssets = false,
}: {
	accountId: string;
	acknowledgeUnassignedAssets?: boolean;
}): Promise<{ error?: string }> {
	if (!UUID_RE.test(accountId)) return { error: "Invalid account ID" };
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };

	// Verify ownership
	const account = await db.query.accounts.findFirst({
		where: and(
			eq(accounts.id, accountId),
			eq(accounts.treasuryId, session.treasuryId),
		),
	});

	if (!account) return { error: "Account not found" };
	if (account.isDefault) return { error: "Cannot delete default account" };

	// Check balances directly instead of calling prepareDeleteAccount (avoids redundant DB queries)
	let balanceResult: { balances: DetectedTokenBalance[]; partial: boolean };
	try {
		balanceResult = await fetchDetectableTokenBalances(account.walletAddress);
	} catch {
		return { error: "Unable to verify account balance. Try again later." };
	}

	const { balances, partial } = balanceResult;
	const assignedTokenEntry = balances.find(
		(b) => b.tokenAddress === account.tokenAddress,
	);

	// Fail safe: if we couldn't verify the assigned token's balance, block deletion
	if (!assignedTokenEntry) {
		return {
			error: "Unable to verify account balance. Try again later.",
		};
	}

	const assignedBalance = assignedTokenEntry.amount;
	const unassignedBalances = balances.filter(
		(b) => b.tokenAddress !== account.tokenAddress && b.amount > BigInt(0),
	);

	if (assignedBalance > BigInt(0)) {
		return {
			error:
				"Account wallet still holds assigned-token funds. Transfer them before deleting.",
		};
	}

	if (
		(unassignedBalances.length > 0 || partial) &&
		!acknowledgeUnassignedAssets
	) {
		return {
			error: "Deletion requires acknowledging unassigned assets.",
		};
	}

	await db
		.delete(accounts)
		.where(
			and(
				eq(accounts.id, accountId),
				eq(accounts.treasuryId, session.treasuryId),
			),
		);

	revalidatePath("/dashboard");
	revalidatePath("/accounts");

	return {};
}
