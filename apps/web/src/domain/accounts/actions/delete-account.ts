"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { SUPPORTED_TOKENS } from "@/lib/constants";
import { getSession } from "@/lib/session";

interface DetectedTokenBalance {
	tokenAddress: string;
	tokenSymbol: string;
	amount: bigint;
}

type DeleteAccountPreparation =
	| { status: "blocked"; assignedBalance: bigint; tokenSymbol: string }
	| { status: "warn"; unassignedBalances: DetectedTokenBalance[] }
	| { status: "ready" };

/**
 * Fetch on-chain balances for all detectable tokens on a wallet.
 * In the real implementation this would call the chain; here it's a placeholder.
 */
async function fetchDetectableTokenBalances(
	_walletAddress: string,
): Promise<DetectedTokenBalance[]> {
	// TODO: Implement actual on-chain balance fetching for all SUPPORTED_TOKENS
	// For now, returns empty (no balances detected)
	return Object.values(SUPPORTED_TOKENS).map((token) => ({
		tokenAddress: token.address,
		tokenSymbol: token.name,
		amount: BigInt(0),
	}));
}

export async function prepareDeleteAccount(
	accountId: string,
): Promise<DeleteAccountPreparation> {
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

	const balances = await fetchDetectableTokenBalances(account.walletAddress);
	const assignedBalance =
		balances.find((balance) => balance.tokenAddress === account.tokenAddress)
			?.amount ?? BigInt(0);
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

	if (unassignedBalances.length > 0) {
		return {
			status: "warn",
			unassignedBalances,
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

	const preflight = await prepareDeleteAccount(accountId);

	if (preflight.status === "blocked") {
		return {
			error:
				"Account wallet still holds assigned-token funds. Transfer them before deleting.",
		};
	}

	if (preflight.status === "warn" && !acknowledgeUnassignedAssets) {
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
