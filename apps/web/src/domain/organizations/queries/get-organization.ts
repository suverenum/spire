"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { entities, organizations, treasuries } from "@/db/schema";

export async function getOrganization(id: string) {
	const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
	return org ?? null;
}

export async function getOrganizationByTreasuryId(treasuryId: string) {
	const [treasury] = await db
		.select({ organizationId: treasuries.organizationId })
		.from(treasuries)
		.where(eq(treasuries.id, treasuryId));

	if (!treasury?.organizationId) return null;

	return getOrganization(treasury.organizationId);
}

export async function getDefaultEntity(organizationId: string) {
	const [entity] = await db
		.select()
		.from(entities)
		.where(eq(entities.organizationId, organizationId));
	return entity ?? null;
}
