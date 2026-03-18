"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { treasuries } from "@/db/schema";
import { TEMPO_RPC_URL } from "@/lib/constants";
import { createSession, getSession } from "@/lib/session";
import { createTreasurySchema } from "@/lib/validations";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function createTreasuryAction(
	formData: FormData,
): Promise<{ error?: string; success?: boolean; treasuryId?: string }> {
	const raw = { name: formData.get("name") };
	const parsed = createTreasurySchema.safeParse(raw);

	if (!parsed.success) {
		return { error: "Please enter a valid treasury name." };
	}

	const rawAddress = formData.get("tempoAddress") as string;
	if (!rawAddress || !ADDRESS_RE.test(rawAddress)) {
		return { error: "Invalid Tempo address from passkey." };
	}
	const tempoAddress = rawAddress.toLowerCase();

	let row: { id: string; name: string; tempoAddress: string };
	try {
		const [inserted] = await db
			.insert(treasuries)
			.values({
				name: parsed.data.name,
				tempoAddress,
			})
			.returning({
				id: treasuries.id,
				name: treasuries.name,
				tempoAddress: treasuries.tempoAddress,
			});
		row = inserted;
	} catch (err: unknown) {
		const pgCode =
			err != null && typeof err === "object" && "code" in err
				? (err as { code: unknown }).code
				: undefined;
		if (pgCode === "23505") {
			return {
				error: "A treasury already exists for this passkey.",
			};
		}
		throw err;
	}

	// Auto-fund wallet via Tempo testnet faucet (fire-and-forget, non-blocking)
	fetch(TEMPO_RPC_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			method: "tempo_fundAddress",
			params: [row.tempoAddress],
			id: 1,
		}),
	}).catch(() => {
		// Faucet failure is non-fatal on testnet
	});

	await createSession({
		treasuryId: row.id,
		tempoAddress: row.tempoAddress as `0x${string}`,
		treasuryName: row.name,
	});

	return { success: true, treasuryId: row.id };
}

export async function updateTreasuryNameAction(formData: FormData): Promise<{ error?: string }> {
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };

	const raw = { name: formData.get("name") };
	const parsed = createTreasurySchema.safeParse(raw);
	if (!parsed.success) {
		return { error: "Please enter a valid name." };
	}
	const name = parsed.data.name;

	await db.update(treasuries).set({ name }).where(eq(treasuries.id, session.treasuryId));

	await createSession({
		treasuryId: session.treasuryId,
		tempoAddress: session.tempoAddress,
		treasuryName: name,
	});

	revalidatePath("/dashboard");
	revalidatePath("/settings");

	return {};
}
