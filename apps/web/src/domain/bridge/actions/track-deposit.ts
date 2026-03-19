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

	// Validate source transaction hash format
	const ethTxHashRe = /^0x[a-fA-F0-9]{64}$/;
	const solanaSigRe = /^[1-9A-HJ-NP-Za-km-z]{86,88}$/;
	if (params.sourceChain === "ethereum" && !ethTxHashRe.test(params.sourceTxHash)) {
		throw new Error("Invalid Ethereum transaction hash");
	}
	if (params.sourceChain === "solana" && !solanaSigRe.test(params.sourceTxHash)) {
		throw new Error("Invalid Solana transaction signature");
	}

	// Validate amount is a positive number
	const parsedAmount = Number.parseFloat(params.amount);
	if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
		throw new Error("Amount must be a positive number");
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
