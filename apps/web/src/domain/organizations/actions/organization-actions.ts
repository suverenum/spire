"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { entities, organizations, treasuries } from "@/db/schema";

/**
 * Creates an organization with a default entity, and links the treasury to both.
 * Used during treasury creation and for migrating legacy treasuries on login.
 */
export async function createOrganizationForTreasury(
	treasuryId: string,
	name: string,
): Promise<{ organizationId: string; entityId: string }> {
	const [org] = await db.insert(organizations).values({ name }).returning({ id: organizations.id });

	const [entity] = await db
		.insert(entities)
		.values({ organizationId: org.id, name: "Default" })
		.returning({ id: entities.id });

	await db
		.update(treasuries)
		.set({ organizationId: org.id, entityId: entity.id })
		.where(eq(treasuries.id, treasuryId));

	return { organizationId: org.id, entityId: entity.id };
}

export async function updateOrganizationName(organizationId: string, name: string): Promise<void> {
	await db.update(organizations).set({ name }).where(eq(organizations.id, organizationId));
}
