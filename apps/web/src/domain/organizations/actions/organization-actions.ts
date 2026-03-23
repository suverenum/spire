"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { entities, organizations, treasuries } from "@/db/schema";

/**
 * Creates an organization with a default entity, and links the treasury to both.
 * Used during treasury creation and for migrating legacy treasuries on login.
 *
 * Idempotent under concurrent login: the treasury update uses
 * WHERE organization_id IS NULL so only the first concurrent request
 * wins; the second sees 0 affected rows and returns the existing org.
 */
export async function createOrganizationForTreasury(
	treasuryId: string,
	name: string,
): Promise<{ organizationId: string; entityId: string }> {
	return db.transaction(async (tx) => {
		const [org] = await tx
			.insert(organizations)
			.values({ name })
			.returning({ id: organizations.id });

		const [entity] = await tx
			.insert(entities)
			.values({ organizationId: org.id, name: "Default" })
			.returning({ id: entities.id });

		// Only link if treasury still has no organization (race guard)
		const updated = await tx
			.update(treasuries)
			.set({ organizationId: org.id, entityId: entity.id })
			.where(and(eq(treasuries.id, treasuryId), isNull(treasuries.organizationId)))
			.returning({ id: treasuries.id });

		if (updated.length === 0) {
			// Another concurrent request already linked an org — read it
			const [existing] = await tx
				.select({ organizationId: treasuries.organizationId })
				.from(treasuries)
				.where(eq(treasuries.id, treasuryId));

			if (existing?.organizationId) {
				return { organizationId: existing.organizationId, entityId: entity.id };
			}
		}

		return { organizationId: org.id, entityId: entity.id };
	});
}

export async function updateOrganizationName(organizationId: string, name: string): Promise<void> {
	await db.update(organizations).set({ name }).where(eq(organizations.id, organizationId));
}
