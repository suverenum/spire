"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { bridgeDeposits } from "@/db/schema";

export async function getPendingDeposits(accountId: string) {
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
	return db.query.bridgeDeposits.findMany({
		where: eq(bridgeDeposits.accountId, accountId),
		orderBy: (deposits, { desc }) => [desc(deposits.initiatedAt)],
	});
}
