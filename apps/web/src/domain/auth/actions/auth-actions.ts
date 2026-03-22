"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { treasuries } from "@/db/schema";
import { createOrganizationForTreasury } from "@/domain/organizations/actions/organization-actions";
import { getOrganization } from "@/domain/organizations/queries/get-organization";
import { createSession, destroySession, getSession } from "@/lib/session";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function loginAction(
	connectedAddress: string,
): Promise<{ error?: string; tempoAddress?: string; treasuryName?: string }> {
	if (!ADDRESS_RE.test(connectedAddress)) {
		return { error: "Invalid wallet address" };
	}

	const result = await db
		.select()
		.from(treasuries)
		.where(eq(treasuries.tempoAddress, connectedAddress.toLowerCase()));
	const treasury = result[0];

	if (!treasury) {
		return { error: "No treasury found for this passkey" };
	}

	// Resolve or create organization (migration path for legacy treasuries)
	let orgId = treasury.organizationId;
	let orgName = treasury.name;

	if (!orgId) {
		const { organizationId } = await createOrganizationForTreasury(treasury.id, treasury.name);
		orgId = organizationId;
	} else {
		const org = await getOrganization(orgId);
		if (org) orgName = org.name;
	}

	await createSession({
		treasuryId: treasury.id,
		tempoAddress: treasury.tempoAddress as `0x${string}`,
		treasuryName: treasury.name,
		organizationId: orgId,
		organizationName: orgName,
	});

	return { tempoAddress: treasury.tempoAddress, treasuryName: treasury.name };
}

export async function touchSessionAction(): Promise<void> {
	const session = await getSession();
	if (!session) return;
	await createSession({
		treasuryId: session.treasuryId,
		tempoAddress: session.tempoAddress,
		treasuryName: session.treasuryName,
		organizationId: session.organizationId,
		organizationName: session.organizationName,
	});
}

export async function logoutAction(): Promise<void> {
	await destroySession();
	redirect("/");
}
