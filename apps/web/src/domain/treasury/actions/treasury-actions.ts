"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { entities, organizations, treasuries } from "@/db/schema";
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
	const name = parsed.data.name;

	let row: { id: string; name: string; tempoAddress: string };
	let orgId: string;
	let orgName: string;
	try {
		// Create organization → entity → treasury in a single transaction
		// so a treasury unique-constraint failure doesn't leave orphaned org/entity rows
		const result = await db.transaction(async (tx) => {
			const [org] = await tx
				.insert(organizations)
				.values({ name })
				.returning({ id: organizations.id, name: organizations.name });

			const [entity] = await tx
				.insert(entities)
				.values({ organizationId: org.id, name: "Default" })
				.returning({ id: entities.id });

			const [inserted] = await tx
				.insert(treasuries)
				.values({
					name,
					tempoAddress,
					organizationId: org.id,
					entityId: entity.id,
				})
				.returning({
					id: treasuries.id,
					name: treasuries.name,
					tempoAddress: treasuries.tempoAddress,
				});

			return { treasury: inserted, orgId: org.id, orgName: org.name };
		});
		row = result.treasury;
		orgId = result.orgId;
		orgName = result.orgName;
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

	await createSession({
		treasuryId: row.id,
		tempoAddress: row.tempoAddress as `0x${string}`,
		treasuryName: row.name,
		organizationId: orgId,
		organizationName: orgName,
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
		organizationId: session.organizationId,
		organizationName: session.organizationName,
	});

	revalidatePath("/dashboard");
	revalidatePath("/settings");

	return {};
}
