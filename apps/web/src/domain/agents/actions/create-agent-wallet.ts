"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { db } from "@/db";
import { accounts, agentWallets } from "@/db/schema";
import { ACCOUNT_TOKENS } from "@/lib/constants";
import { encrypt } from "@/lib/crypto";
import { getSession } from "@/lib/session";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface AgentWalletParams {
	treasuryId: string;
	label: string;
	tokenSymbol: string;
	spendingCap: string;
	dailyLimit: string;
	maxPerTx: string;
	allowedVendors: string[];
}

/**
 * Server-side validation before on-chain Guardian deployment.
 */
export async function assertCanCreateAgentWallet(
	params: AgentWalletParams,
): Promise<{ error?: string }> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };
	if (session.treasuryId !== params.treasuryId) return { error: "Treasury mismatch" };

	const trimmedLabel = params.label.trim();
	if (!trimmedLabel || trimmedLabel.length > 100)
		return { error: "Label must be 1-100 characters" };

	// Name uniqueness within treasury
	const existing = await db.query.accounts.findFirst({
		where: and(eq(accounts.treasuryId, params.treasuryId), eq(accounts.name, trimmedLabel)),
	});
	if (existing) return { error: "Name already taken" };

	// Token validation
	const validTokens = new Set<string>(ACCOUNT_TOKENS.map((t) => t.name));
	if (!validTokens.has(params.tokenSymbol)) return { error: "Invalid token" };

	// Limits validation
	try {
		const cap = BigInt(params.spendingCap);
		const daily = BigInt(params.dailyLimit);
		const perTx = BigInt(params.maxPerTx);
		if (cap <= 0n) return { error: "Spending cap must be positive" };
		if (daily <= 0n) return { error: "Daily limit must be positive" };
		if (perTx <= 0n) return { error: "Per-tx cap must be positive" };
		if (perTx > daily) return { error: "Per-tx cap cannot exceed daily limit" };
		if (daily > cap) return { error: "Daily limit cannot exceed spending cap" };
	} catch {
		return { error: "Invalid limit values" };
	}

	// Vendor validation
	if (params.allowedVendors.length === 0) return { error: "At least one vendor required" };
	for (const addr of params.allowedVendors) {
		if (!ADDRESS_RE.test(addr)) return { error: `Invalid vendor address: ${addr}` };
	}

	return {};
}

/**
 * Persist agent wallet after on-chain Guardian deployment succeeds.
 * Generates agent key pair, encrypts private key, stores in DB.
 * Returns the raw private key ONCE for the user to copy.
 */
export async function finalizeAgentWalletCreate({
	treasuryId,
	label,
	tokenSymbol,
	guardianAddress,
	allowedVendors,
	spendingCap,
	dailyLimit,
	maxPerTx,
}: {
	treasuryId: string;
	label: string;
	tokenSymbol: string;
	guardianAddress: string;
	allowedVendors: string[];
	spendingCap: string;
	dailyLimit: string;
	maxPerTx: string;
}): Promise<{ error?: string; account?: { id: string }; rawPrivateKey?: string }> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };
	if (session.treasuryId !== treasuryId) return { error: "Treasury mismatch" };

	const token = ACCOUNT_TOKENS.find((t) => t.name === tokenSymbol);
	if (!token) return { error: "Invalid token" };
	if (!ADDRESS_RE.test(guardianAddress)) return { error: "Invalid guardian address" };

	// Generate agent key pair
	const privateKey = generatePrivateKey();
	const agentAccount = privateKeyToAccount(privateKey);
	const encryptedKey = encrypt(privateKey);

	try {
		// Create account with walletType="guardian"
		const [inserted] = await db
			.insert(accounts)
			.values({
				treasuryId,
				name: label.trim(),
				tokenSymbol,
				tokenAddress: token.address,
				walletAddress: guardianAddress.toLowerCase(),
				walletType: "guardian",
				isDefault: false,
			})
			.returning({ id: accounts.id });

		// Create agent wallet config
		await db.insert(agentWallets).values({
			accountId: inserted.id,
			label: label.trim(),
			guardianAddress: guardianAddress.toLowerCase(),
			agentKeyAddress: agentAccount.address.toLowerCase(),
			encryptedKey,
			spendingCap: BigInt(spendingCap),
			dailyLimit: BigInt(dailyLimit),
			maxPerTx: BigInt(maxPerTx),
			allowedVendors: allowedVendors.map((a) => a.toLowerCase()),
			status: "active",
		});

		revalidatePath("/dashboard");
		revalidatePath("/accounts");
		revalidatePath("/agents");

		return {
			account: { id: inserted.id },
			rawPrivateKey: privateKey,
		};
	} catch (err: unknown) {
		const pgCode =
			err != null && typeof err === "object" && "code" in err
				? (err as { code: unknown }).code
				: undefined;
		if (pgCode === "23505") {
			return { error: "Guardian address already registered" };
		}
		throw err;
	}
}
