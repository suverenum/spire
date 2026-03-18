"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function getAccount(accountId: string) {
	const session = await getSession();
	if (!session) throw new Error("Not authenticated");

	const account = await db.query.accounts.findFirst({
		where: and(eq(accounts.id, accountId), eq(accounts.treasuryId, session.treasuryId)),
	});

	if (!account) throw new Error("Account not found");

	return account;
}
