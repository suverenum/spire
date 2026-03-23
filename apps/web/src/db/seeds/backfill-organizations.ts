/**
 * Backfill script: Creates organizations and entities for existing treasuries
 * that don't have an organizationId set.
 *
 * Idempotent: safe to run multiple times (only processes treasuries with NULL organizationId).
 * Transactional: each treasury migration is independent, so partial failures don't block others.
 *
 * Usage: bun run src/db/seeds/backfill-organizations.ts
 */

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accounts, entities, organizations, treasuries } from "@/db/schema";

async function main() {
	console.log("Starting organization backfill...");

	const unmigrated = await db
		.select({ id: treasuries.id, name: treasuries.name })
		.from(treasuries)
		.where(isNull(treasuries.organizationId));

	console.log(`Found ${unmigrated.length} treasuries without organization.`);

	if (unmigrated.length === 0) {
		console.log("Nothing to migrate. Done.");
		return;
	}

	let migrated = 0;
	let failed = 0;

	for (const treasury of unmigrated) {
		try {
			const orgName = treasury.name || "Unnamed Organization";

			// Wrap per-treasury writes in a transaction so partial failures
			// don't leave orphaned org/entity rows
			await db.transaction(async (tx) => {
				const [org] = await tx
					.insert(organizations)
					.values({ name: orgName })
					.returning({ id: organizations.id });

				const [entity] = await tx
					.insert(entities)
					.values({ organizationId: org.id, name: "Default" })
					.returning({ id: entities.id });

				// CAS guard: only link if treasury still unlinked (concurrent login may have linked it)
				const updated = await tx
					.update(treasuries)
					.set({ organizationId: org.id, entityId: entity.id })
					.where(and(eq(treasuries.id, treasury.id), isNull(treasuries.organizationId)))
					.returning({ id: treasuries.id });

				if (updated.length === 0) {
					// Treasury was linked by a concurrent process — roll back this transaction
					throw new Error(`Treasury ${treasury.id} was already linked concurrently, skipping`);
				}

				// Set accountCategory for guardian accounts belonging to this treasury only
				await tx
					.update(accounts)
					.set({ accountCategory: "agent" })
					.where(and(eq(accounts.walletType, "guardian"), eq(accounts.treasuryId, treasury.id)));

				console.log(`  Migrated treasury ${treasury.id}: "${orgName}" → org ${org.id}`);
			});

			migrated++;
		} catch (err) {
			failed++;
			console.error(`  Failed to migrate treasury ${treasury.id}:`, err);
		}
	}

	console.log(`\nBackfill complete: ${migrated} migrated, ${failed} failed.`);
}

main().catch((err) => {
	console.error("Backfill failed:", err);
	process.exit(1);
});
