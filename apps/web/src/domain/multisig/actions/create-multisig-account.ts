"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts, multisigConfigs } from "@/db/schema";
import { ACCOUNT_TOKENS } from "@/lib/constants";
import { getSession } from "@/lib/session";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const VALID_TOKEN_SYMBOLS = new Set<string>(ACCOUNT_TOKENS.map((t) => t.name));

export interface MultisigAccountParams {
	treasuryId: string;
	name: string;
	tokenSymbol: string;
	owners: string[];
	tiers: Array<{ maxValue: string; requiredConfirmations: number }>;
	defaultConfirmations: number;
	allowlistEnabled: boolean;
	initialAllowlist: string[];
}

/**
 * Server-side validation before any on-chain wallet provisioning.
 * Validates name, token, owners, and tier configuration.
 */
export async function assertCanCreateMultisigAccount(
	params: MultisigAccountParams,
): Promise<{ error?: string }> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };
	if (session.treasuryId !== params.treasuryId) return { error: "Treasury mismatch" };

	if (!VALID_TOKEN_SYMBOLS.has(params.tokenSymbol))
		return { error: "Invalid token for account creation" };

	const trimmedName = params.name.trim();
	if (!trimmedName || trimmedName.length > 100)
		return { error: "Account name must be 1-100 characters" };

	// Name uniqueness
	const existing = await db.query.accounts.findFirst({
		where: and(eq(accounts.treasuryId, params.treasuryId), eq(accounts.name, trimmedName)),
	});
	if (existing) return { error: "Name already taken" };

	// Owners validation
	if (params.owners.length === 0) return { error: "At least one owner required" };
	if (params.owners.length > 50) return { error: "Maximum 50 owners" };
	for (const owner of params.owners) {
		if (!ADDRESS_RE.test(owner)) return { error: `Invalid owner address: ${owner}` };
	}
	const uniqueOwners = new Set(params.owners.map((o) => o.toLowerCase()));
	if (uniqueOwners.size !== params.owners.length) return { error: "Duplicate owner addresses" };

	// Tier validation
	if (params.tiers.length > 10) return { error: "Maximum 10 tiers" };
	if (params.defaultConfirmations < 1) return { error: "Default confirmations must be at least 1" };
	if (params.defaultConfirmations > params.owners.length)
		return {
			error: `Default confirmations (${params.defaultConfirmations}) cannot exceed owner count (${params.owners.length})`,
		};
	for (let i = 0; i < params.tiers.length; i++) {
		if (params.tiers[i].requiredConfirmations < 1)
			return { error: "Required confirmations must be at least 1" };
		if (params.tiers[i].requiredConfirmations > params.owners.length)
			return {
				error: `Tier confirmations (${params.tiers[i].requiredConfirmations}) cannot exceed owner count (${params.owners.length})`,
			};
		if (!/^\d+$/.test(params.tiers[i].maxValue))
			return { error: `Invalid tier value: ${params.tiers[i].maxValue}` };
		if (i > 0) {
			try {
				if (BigInt(params.tiers[i].maxValue) <= BigInt(params.tiers[i - 1].maxValue))
					return { error: "Tiers must be sorted ascending by maxValue" };
			} catch {
				return { error: `Invalid tier value: ${params.tiers[i].maxValue}` };
			}
		}
	}

	// Allowlist validation
	for (const addr of params.initialAllowlist) {
		if (!ADDRESS_RE.test(addr)) return { error: `Invalid allowlist address: ${addr}` };
	}

	return {};
}

/**
 * Persist the multisig account after on-chain deployment succeeds.
 * Creates account row (walletType="multisig") + multisigConfig in one go.
 */
export async function finalizeMultisigAccountCreate({
	treasuryId,
	name,
	tokenSymbol,
	walletAddress,
	guardAddress,
	owners,
	tiers,
	defaultConfirmations,
	allowlistEnabled,
}: {
	treasuryId: string;
	name: string;
	tokenSymbol: string;
	walletAddress: string;
	guardAddress: string;
	owners: string[];
	tiers: Array<{ maxValue: string; requiredConfirmations: number }>;
	defaultConfirmations: number;
	allowlistEnabled: boolean;
}): Promise<{ error?: string; account?: { id: string } }> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };
	if (session.treasuryId !== treasuryId) return { error: "Treasury mismatch" };

	const token = ACCOUNT_TOKENS.find((t) => t.name === tokenSymbol);
	if (!token) return { error: "Invalid token" };

	if (!ADDRESS_RE.test(walletAddress)) return { error: "Invalid wallet address" };
	if (!ADDRESS_RE.test(guardAddress)) return { error: "Invalid guard address" };

	try {
		// Create account with walletType="multisig"
		const [inserted] = await db
			.insert(accounts)
			.values({
				treasuryId,
				name: name.trim(),
				tokenSymbol,
				tokenAddress: token.address,
				walletAddress: walletAddress.toLowerCase(),
				walletType: "multisig",
				isDefault: false,
			})
			.returning({ id: accounts.id });

		// Create multisig config
		await db.insert(multisigConfigs).values({
			accountId: inserted.id,
			guardAddress: guardAddress.toLowerCase(),
			owners: owners.map((o) => o.toLowerCase()),
			tiersJson: tiers,
			defaultConfirmations,
			allowlistEnabled,
		});

		revalidatePath("/dashboard");
		revalidatePath("/accounts");

		return { account: { id: inserted.id } };
	} catch (err: unknown) {
		const pgCode =
			err != null && typeof err === "object" && "code" in err
				? (err as { code: unknown }).code
				: undefined;
		if (pgCode === "23505") {
			return { error: "Wallet address already registered" };
		}
		throw err;
	}
}
