"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts, bridgeDeposits } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function createBridgeDeposit(params: {
	accountId: string;
	sourceChain: "ethereum" | "solana";
	amount: string;
	sourceTxHash: string;
}): Promise<{ id: string }> {
	const session = await getSession();
	if (!session) throw new Error("Not authenticated");

	// Verify account belongs to session treasury
	const account = await db.query.accounts.findFirst({
		where: and(eq(accounts.id, params.accountId), eq(accounts.treasuryId, session.treasuryId)),
	});
	if (!account) throw new Error("Account not found");
	if (account.tokenSymbol !== "USDC") {
		throw new Error("Cross-chain deposits are available for USDC accounts only");
	}

	const [deposit] = await db
		.insert(bridgeDeposits)
		.values({
			accountId: params.accountId,
			sourceChain: params.sourceChain,
			amount: params.amount,
			sourceTxHash: params.sourceTxHash,
			status: "pending",
		})
		.returning({ id: bridgeDeposits.id });

	revalidatePath("/dashboard");
	revalidatePath("/transactions");

	return deposit;
}
