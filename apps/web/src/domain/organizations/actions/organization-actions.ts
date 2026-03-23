"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { entities, organizations, treasuries } from "@/db/schema";

/**
 * Creates an organization with a default entity, and links the treasury to both.
 * Used during treasury creation and for migrating legacy treasuries on login.
 *
 * Idempotent under concurrent login: checks if treasury already has an org
 * BEFORE inserting, so no orphan rows are created in the race-lost case.
 */
export async function createOrganizationForTreasury(
	treasuryId: string,
	name: string,
): Promise<{ organizationId: string; entityId: string }> {
	return db.transaction(async (tx) => {
		// Check first — if treasury already has an org, return it without inserting
		const [existing] = await tx
			.select({
				organizationId: treasuries.organizationId,
				entityId: treasuries.entityId,
			})
			.from(treasuries)
			.where(eq(treasuries.id, treasuryId));

		if (existing?.organizationId) {
			return {
				organizationId: existing.organizationId,
				entityId: existing.entityId ?? "",
			};
		}

		// Treasury not yet linked — create org + entity + link
		const [org] = await tx
			.insert(organizations)
			.values({ name })
			.returning({ id: organizations.id });

		const [entity] = await tx
			.insert(entities)
			.values({ organizationId: org.id, name: "Default" })
			.returning({ id: entities.id });

		const linked = await tx
			.update(treasuries)
			.set({ organizationId: org.id, entityId: entity.id })
			.where(and(eq(treasuries.id, treasuryId), isNull(treasuries.organizationId)))
			.returning({ id: treasuries.id });

		if (linked.length === 0) {
			// CAS lost: a concurrent request already linked this treasury.
			// Throw to roll back the org/entity inserts from this transaction.
			throw new Error("Treasury was linked by a concurrent request");
		}

		return { organizationId: org.id, entityId: entity.id };
	});
}

export async function updateOrganizationName(
	organizationId: string,
	name: string,
): Promise<{ error?: string }> {
	const { getSession } = await import("@/lib/session");
	const session = await getSession();
	if (!session) return { error: "Not authenticated" };

	// Only allow renaming the caller's own organization
	if (session.organizationId !== organizationId) {
		return { error: "Not authorized to rename this organization" };
	}

	const trimmed = name.trim();
	if (!trimmed || trimmed.length > 100) {
		return { error: "Organization name must be 1-100 characters" };
	}

	await db.update(organizations).set({ name: trimmed }).where(eq(organizations.id, organizationId));
	return {};
}
