"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function getAccounts() {
	const session = await getSession();
	if (!session) throw new Error("Not authenticated");

	return db.query.accounts.findMany({
		columns: { encryptedKey: false },
		where: eq(accounts.treasuryId, session.treasuryId),
		orderBy: (accounts, { asc }) => [asc(accounts.createdAt)],
	});
}
