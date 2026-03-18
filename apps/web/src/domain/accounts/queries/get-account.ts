"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { getSession } from "@/lib/session";

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getAccount(accountId: string) {
	const session = await getSession();
	if (!session) throw new Error("Not authenticated");

	if (!UUID_RE.test(accountId)) throw new Error("Account not found");

	const account = await db.query.accounts.findFirst({
		where: and(
			eq(accounts.id, accountId),
			eq(accounts.treasuryId, session.treasuryId),
		),
	});

	if (!account) throw new Error("Account not found");

	return account;
}
