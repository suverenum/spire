"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { accounts, bridgeDeposits } from "@/db/schema";
import { getSession } from "@/lib/session";

async function verifyAccountAccess(accountId: string) {
	const session = await getSession();
	if (!session) throw new Error("Not authenticated");

	const account = await db.query.accounts.findFirst({
		where: and(eq(accounts.id, accountId), eq(accounts.treasuryId, session.treasuryId)),
	});
	if (!account) throw new Error("Account not found");
	return account;
}

export async function getPendingDeposits(accountId: string) {
	await verifyAccountAccess(accountId);

	return db.query.bridgeDeposits.findMany({
		where: and(
			eq(bridgeDeposits.accountId, accountId),
			ne(bridgeDeposits.status, "completed"),
			ne(bridgeDeposits.status, "failed"),
		),
		orderBy: (deposits, { desc }) => [desc(deposits.initiatedAt)],
	});
}

export async function getBridgeDepositsForAccount(accountId: string) {
	await verifyAccountAccess(accountId);

	return db.query.bridgeDeposits.findMany({
		where: eq(bridgeDeposits.accountId, accountId),
		orderBy: (deposits, { desc }) => [desc(deposits.initiatedAt)],
	});
}
