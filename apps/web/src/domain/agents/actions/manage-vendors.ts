"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts, agentWallets } from "@/db/schema";
import { getSession } from "@/lib/session";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Add a vendor to the agent wallet's allowlist in DB.
 * Must be called AFTER on-chain Guardian.addRecipient() succeeds.
 */
export async function addVendorToWallet({
	walletId,
	vendorAddress,
}: {
	walletId: string;
	vendorAddress: string;
}): Promise<{ error?: string }> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };
	if (!ADDRESS_RE.test(vendorAddress)) return { error: "Invalid address" };

	const wallet = await db.query.agentWallets.findFirst({
		where: eq(agentWallets.id, walletId),
	});
	if (!wallet) return { error: "Agent wallet not found" };

	const account = await db.query.accounts.findFirst({
		where: eq(accounts.id, wallet.accountId),
	});
	if (!account || account.treasuryId !== session.treasuryId) {
		return { error: "Not authorized" };
	}

	const normalizedAddr = vendorAddress.toLowerCase();
	if (wallet.allowedVendors.includes(normalizedAddr)) {
		return { error: "Vendor already in allowlist" };
	}

	await db
		.update(agentWallets)
		.set({
			allowedVendors: [...wallet.allowedVendors, normalizedAddr],
		})
		.where(eq(agentWallets.id, walletId));

	revalidatePath("/agents");
	return {};
}

/**
 * Remove a vendor from the agent wallet's allowlist in DB.
 * Must be called AFTER on-chain Guardian.removeRecipient() succeeds.
 */
export async function removeVendorFromWallet({
	walletId,
	vendorAddress,
}: {
	walletId: string;
	vendorAddress: string;
}): Promise<{ error?: string }> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };

	const wallet = await db.query.agentWallets.findFirst({
		where: eq(agentWallets.id, walletId),
	});
	if (!wallet) return { error: "Agent wallet not found" };

	const account = await db.query.accounts.findFirst({
		where: eq(accounts.id, wallet.accountId),
	});
	if (!account || account.treasuryId !== session.treasuryId) {
		return { error: "Not authorized" };
	}

	const normalizedAddr = vendorAddress.toLowerCase();
	await db
		.update(agentWallets)
		.set({
			allowedVendors: wallet.allowedVendors.filter((a) => a !== normalizedAddr),
		})
		.where(eq(agentWallets.id, walletId));

	revalidatePath("/agents");
	return {};
}
