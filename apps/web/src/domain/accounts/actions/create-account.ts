"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { ACCOUNT_TOKENS } from "@/lib/constants";
import { getSession } from "@/lib/session";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

const VALID_TOKEN_SYMBOLS = new Set<string>(ACCOUNT_TOKENS.map((t) => t.name));

/**
 * Server-side validation before any on-chain wallet provisioning.
 * Called from the client mutation before creating the wallet.
 */
export async function assertCanCreateAccount({
	treasuryId,
	tokenSymbol,
	name,
}: {
	treasuryId: string;
	tokenSymbol: string;
	name: string;
}): Promise<{ error?: string }> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };

	if (session.treasuryId !== treasuryId) {
		return { error: "Treasury mismatch" };
	}

	if (!VALID_TOKEN_SYMBOLS.has(tokenSymbol)) {
		return { error: "Invalid token for account creation" };
	}

	const trimmedName = name.trim();
	if (!trimmedName || trimmedName.length > 100) {
		return { error: "Account name must be 1-100 characters" };
	}

	// Check name uniqueness before any on-chain provisioning to avoid wasting gas
	const existing = await db.query.accounts.findFirst({
		where: and(eq(accounts.treasuryId, treasuryId), eq(accounts.name, trimmedName)),
	});
	if (existing) {
		return { error: "Name already taken" };
	}

	return {};
}

/**
 * Persist the account row after on-chain wallet provisioning succeeds.
 * Called from the client mutation after the wallet is created on-chain.
 */
export async function finalizeAccountCreate({
	treasuryId,
	name,
	tokenSymbol,
	walletAddress,
	isDefault = false,
}: {
	treasuryId: string;
	name: string;
	tokenSymbol: string;
	walletAddress: string;
	isDefault?: boolean;
}): Promise<{ error?: string; account?: { id: string } }> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };

	if (session.treasuryId !== treasuryId) {
		return { error: "Treasury mismatch" };
	}

	const token = ACCOUNT_TOKENS.find((t) => t.name === tokenSymbol);
	if (!token) return { error: "Invalid token" };

	if (!ADDRESS_RE.test(walletAddress)) {
		return { error: "Invalid wallet address" };
	}

	try {
		const [inserted] = await db
			.insert(accounts)
			.values({
				treasuryId,
				name: name.trim(),
				tokenSymbol,
				tokenAddress: token.address,
				walletAddress: walletAddress.toLowerCase(),
				isDefault,
			})
			.returning({ id: accounts.id });

		revalidatePath("/dashboard");
		revalidatePath("/accounts");

		return { account: { id: inserted.id } };
	} catch (err: unknown) {
		const pgCode =
			err != null && typeof err === "object" && "code" in err
				? (err as { code: unknown }).code
				: undefined;
		if (pgCode === "23505") {
			const pgConstraint =
				err != null && typeof err === "object" && "constraint" in err
					? (err as { constraint: unknown }).constraint
					: undefined;
			if (pgConstraint === "accounts_wallet_address_idx") {
				return { error: "Wallet address already registered" };
			}
			return { error: "Name already taken" };
		}
		throw err;
	}
}
