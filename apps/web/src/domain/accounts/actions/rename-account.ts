"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function renameAccountAction(
	formData: FormData,
): Promise<{ error?: string }> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };

	const accountId = formData.get("accountId") as string;
	const name = (formData.get("name") as string)?.trim();

	if (!accountId) return { error: "Account ID required" };
	if (!name || name.length > 100) {
		return { error: "Account name must be 1-100 characters" };
	}

	const account = await db.query.accounts.findFirst({
		where: and(
			eq(accounts.id, accountId),
			eq(accounts.treasuryId, session.treasuryId),
		),
	});

	if (!account) return { error: "Account not found" };

	try {
		await db
			.update(accounts)
			.set({ name })
			.where(
				and(
					eq(accounts.id, accountId),
					eq(accounts.treasuryId, session.treasuryId),
				),
			);
	} catch (err: unknown) {
		const pgCode =
			err != null && typeof err === "object" && "code" in err
				? (err as { code: unknown }).code
				: undefined;
		if (pgCode === "23505") {
			return { error: "Name already taken" };
		}
		throw err;
	}

	revalidatePath("/dashboard");
	revalidatePath("/accounts");

	return {};
}
